// ============================ STRIPE WEBHOOK → enrollment store ============================
//
// Receives Stripe `checkout.session.completed` events and persists each paid enrollment
// { email, name, batchId } to the durable store (api/_lib/store.js). That store is what the
// daily market-news scheduler (api/cron/market-news.js) reads to email real enrolled
// students, via api/_lib/roster.js.
//
// SECURITY: we verify Stripe's signature ourselves with HMAC-SHA256 (Node crypto) so we don't
// need the Stripe SDK as a dependency. The raw request body is required for verification, so
// body parsing is disabled below.
//
// SETUP:
//   1. Stripe Dashboard → Developers → Webhooks → add endpoint:
//        https://YOURDOMAIN/api/stripe-webhook   (event: checkout.session.completed)
//      Copy the signing secret (whsec_…) into the STRIPE_WEBHOOK_SECRET env var.
//   2. Make sure the cohort id reaches us on the session. Easiest: set metadata `batchId`
//      on each Payment Link (Stripe → Payment Links → … → Metadata). We also fall back to
//      client_reference_id and to an `?enrolled=<batchId>` param on the success URL.
//   3. Configure the store env vars (see api/_lib/store.js).

import crypto from "node:crypto";
import { addEnrollment, removeEnrollment } from "./_lib/store.js";
import { kvConfigured } from "./_lib/kv.js";
import { putUser, getUser } from "./_lib/auth.js";
import { sendSetPasswordEmail } from "./_lib/sendSetPassword.js";
import { loadCatalog } from "./_lib/cohortStore.js";
import { addContact, removeContact } from "./_lib/resendAudience.js";

// A refund = a cancellation: pull the student out of the cohort's enrollment store AND its Resend
// audience (group). Best-effort; never makes Stripe retry. The cohort id comes from the user record
// written at enrollment (getUser), with the charge metadata as a fallback.
async function handleCancellation(charge, res) {
  const email = (charge && charge.billing_details && charge.billing_details.email) || (charge && charge.receipt_email) || "";
  if (!email) { res.status(200).json({ received: true, removed: false, reason: "no email on charge" }); return; }
  let batchId = (charge && charge.metadata && charge.metadata.batchId) || "";
  if (!batchId && kvConfigured()) {
    try { const u = await getUser(email); batchId = (u && u.batchId) || ""; } catch { /* ignore */ }
  }
  if (!batchId) { res.status(200).json({ received: true, removed: false, reason: "no batchId for email" }); return; }
  let removed = false;
  try { const r = await removeEnrollment({ email, batchId }); removed = !!(r && r.ok); } catch { /* ignore */ }
  try {
    const cat = await loadCatalog();
    const cohort = (cat.batches || []).find((b) => b.id === batchId);
    if (cohort && cohort.groupAudienceId) await removeContact(cohort.groupAudienceId, email);
  } catch { /* group removal is best-effort */ }
  res.status(200).json({ received: true, removed, batchId });
}

// Vercel: give us the raw body (needed to verify the Stripe signature).
export const config = { api: { bodyParser: false } };

const SIG_TOLERANCE_SEC = 5 * 60; // reject events whose timestamp is older than 5 minutes

async function readRawBody(req) {
  if (req.rawBody != null) {
    return Buffer.isBuffer(req.rawBody) ? req.rawBody.toString("utf8") : String(req.rawBody);
  }
  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Verify Stripe's `Stripe-Signature` header ("t=<ts>,v1=<hmac>") against the raw body.
// Returns true only if a v1 signature matches HMAC-SHA256(secret, `${t}.${rawBody}`) and the
// timestamp is within tolerance. Uses timing-safe comparison.
export function verifyStripeSignature(rawBody, header, secret, nowSec = Math.floor(Date.now() / 1000)) {
  if (!rawBody || !header || !secret) return false;
  const parts = Object.fromEntries(
    String(header).split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    })
  );
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(nowSec - t) > SIG_TOLERANCE_SEC) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Pull the cohort id off a completed Checkout Session: metadata.batchId → client_reference_id
// → an `?enrolled=<id>` param on the redirect/return URL. Payment Links put the redirect in
// `after_completion.redirect.url` (NOT success_url), so check that too.
function batchIdFromSession(session) {
  if (session?.metadata?.batchId) return session.metadata.batchId;
  // client_reference_id may be "batchId" or "batchId.<base64url student name>" — the cohort is the
  // part before the first ".".
  if (session?.client_reference_id) return String(session.client_reference_id).split(".")[0];
  const url = session?.success_url
    || session?.after_completion?.redirect?.url
    || session?.url || "";
  const m = /[?&]enrolled=([^&]+)/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

// The STUDENT name packed into client_reference_id ("batchId.<base64url name>"), or "" if absent.
// Used so the set-password email greets the student, not the card-holder (often a parent).
function studentNameFromRef(session) {
  const cref = session?.client_reference_id || "";
  const dot = cref.indexOf(".");
  if (dot < 0) return "";
  try {
    return Buffer.from(cref.slice(dot + 1).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8").trim();
  } catch { return ""; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Webhook not configured (missing STRIPE_WEBHOOK_SECRET)" });
    return;
  }

  let raw;
  try {
    raw = await readRawBody(req);
  } catch {
    res.status(400).json({ error: "Could not read request body" });
    return;
  }

  const sig = (req.headers && (req.headers["stripe-signature"] || req.headers["Stripe-Signature"])) || "";
  if (!verifyStripeSignature(raw, sig, secret)) {
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  // A refund cancels the enrollment → remove the student from the cohort group + store.
  if (event.type === "charge.refunded") {
    return handleCancellation((event.data && event.data.object) || {}, res);
  }

  // Beyond that, only enrollment completions matter; acknowledge everything else so Stripe stops retrying.
  if (event.type !== "checkout.session.completed") {
    res.status(200).json({ received: true, ignored: event.type });
    return;
  }

  const session = event.data && event.data.object ? event.data.object : {};
  const batchId = batchIdFromSession(session);
  const email = (session.customer_details && session.customer_details.email) || session.customer_email || "";
  // Prefer the STUDENT name we packed into client_reference_id; fall back to the card-holder name.
  const name = studentNameFromRef(session) || (session.customer_details && session.customer_details.name) || (session.metadata && session.metadata.name) || "";

  if (!email || !batchId) {
    // Acknowledge (don't make Stripe retry) but report we couldn't map it.
    res.status(200).json({ received: true, stored: false, reason: "missing email or batchId on session" });
    return;
  }

  const result = await addEnrollment({ email, name, batchId });

  // Add the student to their cohort's Resend audience (the group/broadcast list). Best-effort:
  // looks up the cohort's groupAudienceId from the catalog; no-ops if Resend isn't configured or
  // the cohort has no audience yet. Never blocks the webhook.
  try {
    const cat = await loadCatalog();
    const cohort = (cat.batches || []).find((b) => b.id === batchId);
    if (cohort && cohort.groupAudienceId) {
      const first = String(name || "").trim().split(" ")[0] || "";
      const last = String(name || "").trim().split(" ").slice(1).join(" ");
      await addContact(cohort.groupAudienceId, { email, firstName: first, lastName: last });
    }
  } catch { /* group add is best-effort — enrollment already stored */ }

  // Provision the student's account and email them a set-password link (server-side, after a
  // verified payment — this is where account creation belongs). No-op when KV isn't configured,
  // so the webhook still acknowledges cleanly in a store-less/test setup.
  //
  // INVITE UNTIL SET UP: send the set-password link whenever the student hasn't set a password yet.
  // The account isn't truly "created" until they set a password — so if they lost or never got the
  // first email, a re-attempt with the SAME email re-sends it. Once a password EXISTS we stop
  // re-inviting (returning students who lose the link use the password-reset flow). putUser merges,
  // so re-recording name/batchId never clobbers the password.
  let invited = false;
  let inviteNote; // surfaced in the response so a founder can see WHY an invite did/didn't send
  if (!kvConfigured()) {
    inviteNote = "store not configured (KV) — cannot provision or invite";
  } else {
    try {
      const existing = await getUser(email);
      await putUser(email, { name, batchId });
      if (existing && existing.passwordHash) {
        inviteNote = "already set up (password exists) — no re-invite (use password reset)";
      } else {
        const sent = await sendSetPasswordEmail({ email, name });
        invited = Boolean(sent && sent.ok);
        if (!invited) {
          const d = sent && (typeof sent.detail === "string" ? sent.detail : JSON.stringify(sent.detail));
          inviteNote = `email send failed${sent && sent.status ? ` (status ${sent.status})` : ""}: ${d || "unknown"}`;
        }
      }
    } catch (e) {
      inviteNote = `invite error: ${(e && e.message) || String(e)}`;
    }
  }

  res.status(200).json({ received: true, stored: result.ok, batchId, invited, inviteNote });
}
