// ============================ FAILED PAYMENTS (KV-backed, founder-notified) ============================
//
// The app uses keyless Stripe Payment Links, so a DECLINED/failed payment never produces a
// `checkout.session.completed` event — the student simply never enrolls and, until now, the failure was
// invisible in the app (only visible in the Stripe dashboard). The Stripe webhook now forwards failure
// events here: we record each one and email the founder so a bounced family can be followed up.
//
// Notification/visibility ONLY — this never moves money, issues a refund, or changes enrollment state.
//
// Stored in a KV list (`payments:failed`), newest last. An idempotency marker keyed by the underlying
// attempt's `ref` (Stripe PaymentIntent id, charge id fallback) guarantees the founder is notified ONCE
// even though Stripe fires both `payment_intent.payment_failed` and `charge.failed` for one decline.
// Mirrors api/_lib/refundStore.js (same key-gated, best-effort shape).

import { kvConfigured, kvCommand } from "./kv.js";
import { normalizeEmail } from "./auth.js";
import { sendEmail } from "./sendEmail.js";
import { loadOps, loadSettings } from "./settingsStore.js";

const TEAM_EMAIL = "team@build-young.com"; // default founder-notification destination (not a personal inbox)
const KEY = "payments:failed";
const seenKey = (ref) => `payfail:notified:${ref}`;
const parse = (r) => { try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; } };

const fmtUSD = (cents) => {
  const n = Number(cents);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `$${(n / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

// Record a failed enrollment payment and email the founder so they can follow up with the family.
// IDEMPOTENT per `ref` (the Stripe PaymentIntent/charge id; falls back to email+timestamp when neither
// is present): the first call wins; later calls for the same attempt no-op. Returns
// { ok, alreadyRecorded, emailed }. Key-gated/best-effort — no KV or no Resend ⇒ clean no-op.
export async function addPaymentFailure({ email, name, batchId, amountCents, reason, code, ref, at }) {
  const e = normalizeEmail(email || "");
  const when = Number(at) || Date.now();
  // Idempotency needs a stable key; prefer Stripe's id, else fall back to email+time so retries dedupe.
  const key = String(ref || "").trim() || (e ? `${e}:${when}` : "");
  if (!key) return { ok: false, reason: "no ref or email to key on" };

  // Idempotency: only the first failure for this `ref` proceeds.
  if (kvConfigured()) {
    try {
      const first = await kvCommand(["SET", seenKey(key), "1", "NX", "EX", String(60 * 60 * 24 * 90)]);
      if (first === null) return { ok: true, alreadyRecorded: true, emailed: false };
    } catch { /* if the marker write fails, fall through — better a possible dup than a missed alert */ }
  }

  const rec = {
    email: e, name: name || "", batchId: batchId || "",
    amountCents: Math.max(0, Math.round(Number(amountCents) || 0)),
    reason: String(reason || "").slice(0, 300),
    code: String(code || "").slice(0, 80),
    ref: key,
    ts: when,
  };

  let stored = false;
  if (kvConfigured()) {
    try { await kvCommand(["RPUSH", KEY, JSON.stringify(rec)]); await kvCommand(["LTRIM", KEY, "-5000", "-1"]); stored = true; } catch { /* fall through to email */ }
  }

  let emailed = false;
  try {
    const [ops, settings] = await Promise.all([loadOps(), loadSettings()]);
    const to = (ops && ops.notifyEmail) || (settings && settings.contactEmail) || TEAM_EMAIL;
    const who = rec.name || rec.email || "(unknown)";
    const sent = await sendEmail({
      to,
      subject: `Payment failed — ${who}${rec.amountCents ? ` (${fmtUSD(rec.amountCents)})` : ""}`,
      body: `A Stripe enrollment payment failed, so this student did NOT enroll. Nothing was charged and there's nothing to refund — but you may want to reach out and re-send the payment link.

  •  Student / payer: ${rec.name || "(no name)"}${rec.email ? ` <${rec.email}>` : " (no email captured)"}
  •  Cohort: ${rec.batchId || "(not identified — check Stripe)"}
  •  Amount attempted: ${fmtUSD(rec.amountCents)}
  •  Decline reason: ${rec.reason || "(none reported)"}${rec.code ? ` [${rec.code}]` : ""}

Where to look: Stripe Dashboard → Payments → filter by Failed → find this attempt for the full details.
This is a heads-up only — the app makes no charge, refund, or enrollment change on a failed payment.`,
      replyTo: rec.email || undefined,
    });
    emailed = !!(sent && sent.ok);
  } catch { /* the KV record still lets the founder see it on the dashboard */ }

  if (!stored && !emailed) return { ok: false, reason: "could not store or email the payment-failure alert" };
  return { ok: true, alreadyRecorded: false, emailed };
}

// All recorded payment failures, newest first — for the founder console.
export async function listPaymentFailures() {
  if (!kvConfigured()) return [];
  try { const raw = (await kvCommand(["LRANGE", KEY, "0", "-1"])) || []; return raw.map(parse).filter(Boolean).reverse(); } catch { return []; }
}
