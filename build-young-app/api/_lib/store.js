// ============================ ENROLLMENT STORE (durable) ============================
//
// A tiny, dependency-free durable store for cohort enrollments, backed by the shared KV client
// (api/_lib/kv.js — Upstash Redis / Vercel KV over REST). This is what makes the market-news
// scheduler able to email REAL enrolled students: the Stripe webhook (api/stripe-webhook.js)
// writes here, and api/_lib/roster.js reads here.
//
// Data model: one Redis hash per cohort, `enroll:<batchId>`, field = student email,
// value = JSON { email, name, batchId, ts }. Keying by email makes writes idempotent —
// Stripe retries just overwrite the same field.

import { kvConfigured, kvCommand } from "./kv.js";

// Back-compat alias — callers (and tests) still import storeConfigured from here.
export const storeConfigured = kvConfigured;

const keyFor = (batchId) => `enroll:${batchId}`;
const command = kvCommand;

// Persist (or update) one enrollment. Idempotent: re-running with the same email overwrites.
// Returns { ok } — ok:false when the store isn't configured or the write failed.
//
// Partner (third-party) enrollments (SPECS/005) pass `paymentSource:"partner"` plus the partner id,
// an optional external ref, and a SNAPSHOT of the seat's price + the partner's cut % (so settlement
// is stable if either changes later). They start PENDING (`onboarded:false`) — saving the record does
// nothing student-facing; an explicit "Start onboarding" action (T28) flips `onboarded` + provisions
// access. A normal (Stripe) enrollment passes none of these, so its record is unchanged (back-compat).
// Cap a stored application write-up so a huge body can't bloat the cohort hash. SPECS/016.
const WRITEUP_MAX = 6000;
export async function addEnrollment({ email, name, batchId, paymentSource, partner, externalRef, priceCents, cutPct, onboarded, writeup }) {
  if (!storeConfigured()) return { ok: false, reason: "store not configured" };
  if (!email || !batchId) return { ok: false, reason: "missing email or batchId" };
  const rec = { email, name: name || "", batchId, ts: Date.now() };
  if (paymentSource === "partner") {
    rec.paymentSource = "partner";
    rec.partner = String(partner || "");
    rec.externalRef = String(externalRef || "");
    rec.priceCents = Math.max(0, Math.round(Number(priceCents) || 0));
    rec.cutPct = Math.min(1, Math.max(0, Number(cutPct) || 0));
    rec.onboarded = onboarded === true; // PENDING until "Start onboarding" (T28)
  } else if (paymentSource === "free") {
    // Free / scholarship seat (SPECS/016): the applicant's write-up + founder approval are the gate.
    // PENDING until the founder approves; price is always 0 (no money moves).
    rec.paymentSource = "free";
    rec.priceCents = 0;
    rec.writeup = String(writeup || "").slice(0, WRITEUP_MAX);
    rec.onboarded = onboarded === true;
  }
  const res = await command(["HSET", keyFor(batchId), email, JSON.stringify(rec)]);
  return { ok: res !== null };
}

// Remove one enrollment (e.g. on cancellation/refund). Idempotent: deleting a missing field is
// a no-op. Returns { ok } — ok:false when the store isn't configured.
export async function removeEnrollment({ email, batchId }) {
  if (!storeConfigured()) return { ok: false, reason: "store not configured" };
  if (!email || !batchId) return { ok: false, reason: "missing email or batchId" };
  const res = await command(["HDEL", keyFor(batchId), email]);
  return { ok: res !== null };
}

// List enrollments for a cohort → [{ email, name, batchId }]. [] when unconfigured/empty.
// Number of students enrolled in a cohort (cheap HLEN). 0 when unconfigured/empty. Used to
// auto-detect a full cohort (enrolled >= seats) on the public catalog read.
export async function countEnrollments(batchId) {
  if (!storeConfigured() || !batchId) return 0;
  const res = await command(["HLEN", keyFor(batchId)]);
  const n = typeof res === "number" ? res : Number(res);
  return Number.isFinite(n) ? n : 0;
}

export async function listEnrollments(batchId) {
  if (!storeConfigured()) return [];
  const res = await command(["HGETALL", keyFor(batchId)]);
  if (!res) return [];
  // HGETALL comes back either as a flat [field, value, field, value, …] array or as an
  // object { field: value }; handle both shapes.
  const values = Array.isArray(res)
    ? res.filter((_, i) => i % 2 === 1)
    : Object.values(res);
  const out = [];
  for (const v of values) {
    try {
      const rec = typeof v === "string" ? JSON.parse(v) : v;
      if (rec && rec.email) {
        const row = { email: rec.email, name: rec.name || "", batchId: rec.batchId || batchId };
        // Pass partner (third-party) fields through when present — a normal enrollment has none, so
        // its shape is unchanged (back-compat with existing callers/tests).
        if (rec.paymentSource === "partner") {
          row.paymentSource = "partner";
          row.partner = rec.partner || "";
          row.externalRef = rec.externalRef || "";
          row.priceCents = rec.priceCents || 0;
          row.cutPct = rec.cutPct || 0;
          row.onboarded = rec.onboarded === true;
        } else if (rec.paymentSource === "free") {
          row.paymentSource = "free";
          row.priceCents = 0;
          row.writeup = rec.writeup || "";
          row.ts = rec.ts || 0;
          row.onboarded = rec.onboarded === true;
        }
        out.push(row);
      }
    } catch {
      /* skip malformed entry */
    }
  }
  return out;
}

// All PARTNER (third-party) enrollments across the given cohorts — pending + onboarded — for the
// founder console (SPECS/005). Aggregates listEnrollments; [] when unconfigured/empty.
export async function listPartnerEnrollments(batchIds) {
  const ids = Array.isArray(batchIds) ? batchIds : [];
  const out = [];
  for (const id of ids) {
    const rows = await listEnrollments(id);
    for (const r of rows) if (r.paymentSource === "partner") out.push(r);
  }
  return out;
}

// All FREE / scholarship applications across the given cohorts — pending + onboarded — for the founder
// console (SPECS/016), newest first (so fresh applications surface at the top). [] when unconfigured/empty.
export async function listFreeEnrollments(batchIds) {
  const ids = Array.isArray(batchIds) ? batchIds : [];
  const out = [];
  for (const id of ids) {
    const rows = await listEnrollments(id);
    for (const r of rows) if (r.paymentSource === "free") out.push(r);
  }
  return out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
}
