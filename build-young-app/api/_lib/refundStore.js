// ============================ REFUND REQUESTS (KV-backed, founder-actioned) ============================
//
// The app uses keyless Stripe Payment Links, so it CANNOT issue refunds via the Stripe API. When a
// student cancels, we instead record a pending refund here and email the founder to issue it in the
// Stripe dashboard. Once the founder refunds in Stripe, the `charge.refunded` webhook frees the seat.
//
// Stored in a KV list (`refunds:pending`), newest last. An idempotency marker keyed by the
// withdrawal's email + timestamp guarantees a student's repeated state-saves (or a reload) never
// notify the founder twice for the same cancellation.

import { kvConfigured, kvCommand } from "./kv.js";
import { normalizeEmail } from "./auth.js";
import { sendEmail } from "./sendEmail.js";
import { loadOps, loadSettings } from "./settingsStore.js";

const TEAM_EMAIL = "team@build-young.com"; // default founder-notification destination (not a personal inbox)
const KEY = "refunds:pending";
const seenKey = (email, at) => `refund:notified:${email}:${at}`;
const parse = (r) => { try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; } };

const fmtUSD = (cents) => {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "$0";
  return `$${(n / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

// Record a student's cancellation as a pending refund and email the founder to action it in Stripe.
// IDEMPOTENT per { email, at }: the first call wins; later calls (re-saves, reloads) no-op. Returns
// { ok, alreadyRequested, emailed }.
export async function addRefundRequest({ email, name, batchId, refundCents, tier, reason, week, at }) {
  const e = normalizeEmail(email || "");
  if (!e || !e.includes("@")) return { ok: false, reason: "missing email" };
  if (!batchId) return { ok: false, reason: "missing batchId" };
  const when = Number(at) || Date.now();

  // Idempotency: only the first request for this (email, at) proceeds.
  if (kvConfigured()) {
    try {
      const first = await kvCommand(["SET", seenKey(e, when), "1", "NX", "EX", String(60 * 60 * 24 * 90)]);
      if (first === null) return { ok: true, alreadyRequested: true, emailed: false };
    } catch { /* if the marker write fails, fall through — better a possible dup than a missed refund */ }
  }

  const rec = {
    email: e, name: name || "", batchId,
    refundCents: Math.max(0, Math.round(Number(refundCents) || 0)),
    tier: tier === "full" ? "full" : "prorated",
    reason: String(reason || "").slice(0, 500),
    week: Number(week) || null,
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
    const sent = await sendEmail({
      to,
      subject: `Refund to issue — ${rec.name || rec.email} (${fmtUSD(rec.refundCents)})`,
      body: `A student cancelled their enrollment. Issue this refund in the Stripe dashboard — the app can't do it automatically (keyless Payment Links).

  •  Student: ${rec.name || "(no name)"} <${rec.email}>
  •  Cohort: ${rec.batchId}
  •  Refund: ${fmtUSD(rec.refundCents)} (${rec.tier})
  •  When they cancelled at: week ${rec.week ?? "—"}
  •  Reason: ${rec.reason || "(none given)"}

How to refund: Stripe Dashboard → Payments → find this customer's payment → Refund (enter ${fmtUSD(rec.refundCents)} for a prorated amount). Once refunded, Stripe's webhook frees their seat automatically.`,
      replyTo: rec.email,
    });
    emailed = !!(sent && sent.ok);
  } catch { /* the KV record still lets the founder see it on the dashboard */ }

  if (!stored && !emailed) return { ok: false, reason: "could not store or email the refund request" };
  return { ok: true, alreadyRequested: false, emailed };
}

// All pending refunds, newest first — for the founder console.
export async function listRefundRequests() {
  if (!kvConfigured()) return [];
  try { const raw = (await kvCommand(["LRANGE", KEY, "0", "-1"])) || []; return raw.map(parse).filter(Boolean).reverse(); } catch { return []; }
}
