// ============================ ENROLLMENT STORE (durable) ============================
//
// A tiny, dependency-free durable store for cohort enrollments, backed by Upstash Redis /
// Vercel KV over their REST API (just `fetch` + two env vars — no npm SDK, works in any
// serverless runtime). This is what makes the market-news scheduler able to email REAL
// enrolled students: the Stripe webhook (api/stripe-webhook.js) writes here, and
// api/_lib/roster.js reads here.
//
// Why Redis-over-REST: serverless instances are ephemeral, so in-memory won't survive.
// Upstash/Vercel KV is durable, has a free tier, and needs no connection pooling.
//
// Env (set EITHER pair — Vercel KV and Upstash use the same shape):
//   KV_REST_API_URL    / KV_REST_API_TOKEN          (Vercel KV)
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (Upstash)
//
// Data model: one Redis hash per cohort, `enroll:<batchId>`, field = student email,
// value = JSON { email, name, batchId, ts }. Keying by email makes writes idempotent —
// Stripe retries just overwrite the same field.

const REST_URL = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export function storeConfigured() {
  return Boolean(REST_URL() && REST_TOKEN());
}

const keyFor = (batchId) => `enroll:${batchId}`;

// Run one Redis command via the REST API. Returns the `result` field, or null on any error
// (callers degrade gracefully rather than crash a webhook or cron run).
async function command(args) {
  if (!storeConfigured()) return null;
  try {
    const r = await fetch(REST_URL(), {
      method: "POST",
      headers: { Authorization: `Bearer ${REST_TOKEN()}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data && "result" in data ? data.result : null;
  } catch {
    return null;
  }
}

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
