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
export async function addEnrollment({ email, name, batchId }) {
  if (!storeConfigured()) return { ok: false, reason: "store not configured" };
  if (!email || !batchId) return { ok: false, reason: "missing email or batchId" };
  const record = JSON.stringify({ email, name: name || "", batchId, ts: Date.now() });
  const res = await command(["HSET", keyFor(batchId), email, record]);
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
      if (rec && rec.email) out.push({ email: rec.email, name: rec.name || "", batchId: rec.batchId || batchId });
    } catch {
      /* skip malformed entry */
    }
  }
  return out;
}
