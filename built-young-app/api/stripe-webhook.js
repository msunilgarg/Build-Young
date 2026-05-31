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
import { addEnrollment } from "./_lib/store.js";

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
// → an `?enrolled=<id>` param on the success/return URL.
function batchIdFromSession(session) {
  if (session?.metadata?.batchId) return session.metadata.batchId;
  if (session?.client_reference_id) return session.client_reference_id;
  const url = session?.success_url || session?.url || "";
  const m = /[?&]enrolled=([^&]+)/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
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

  // Only enrollment completions matter; acknowledge everything else so Stripe stops retrying.
  if (event.type !== "checkout.session.completed") {
    res.status(200).json({ received: true, ignored: event.type });
    return;
  }

  const session = event.data && event.data.object ? event.data.object : {};
  const batchId = batchIdFromSession(session);
  const email = (session.customer_details && session.customer_details.email) || session.customer_email || "";
  const name = (session.customer_details && session.customer_details.name) || (session.metadata && session.metadata.name) || "";

  if (!email || !batchId) {
    // Acknowledge (don't make Stripe retry) but report we couldn't map it.
    res.status(200).json({ received: true, stored: false, reason: "missing email or batchId on session" });
    return;
  }

  const result = await addEnrollment({ email, name, batchId });
  res.status(200).json({ received: true, stored: result.ok, batchId });
}
