// ============================ SHARED KV CLIENT (durable, dependency-free) ============================
//
// One thin wrapper over Vercel KV / Upstash Redis's REST API — just `fetch` + two env vars, no
// npm SDK, works in any serverless runtime. Used by the enrollment store (store.js), the auth
// user/session records (auth.js), and the server-authoritative simulation state (api/state.js).
//
// Why Redis-over-REST: serverless instances are ephemeral, so in-memory won't survive. Upstash/
// Vercel KV is durable, has a free tier, and needs no connection pooling.
//
// Env (set EITHER pair — Vercel KV and Upstash use the same shape):
//   KV_REST_API_URL        / KV_REST_API_TOKEN          (Vercel KV)
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   (Upstash)

const REST_URL = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export function kvConfigured() {
  return Boolean(REST_URL() && REST_TOKEN());
}

// Run one Redis command via the REST API. Returns the `result` field, or null on any error
// (callers degrade gracefully rather than crash a webhook, cron, or request handler).
export async function kvCommand(args) {
  if (!kvConfigured()) return null;
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

// Convenience helpers over kvCommand for the common string-value cases.
// kvSet supports an optional TTL (seconds) — used for one-time, expiring tokens.
export async function kvSet(key, value, ttlSeconds) {
  const args = ttlSeconds ? ["SET", key, value, "EX", String(ttlSeconds)] : ["SET", key, value];
  const res = await kvCommand(args);
  return res !== null;
}

export async function kvGet(key) {
  return kvCommand(["GET", key]);
}

// Returns true if the key existed and was removed (DEL returns the count deleted).
export async function kvDel(key) {
  const res = await kvCommand(["DEL", key]);
  return Boolean(res);
}

// Atomically read-and-delete a key (one-time tokens). Falls back to GET+DEL when GETDEL isn't
// available; the DEL still makes the token single-use even if two reads race.
export async function kvGetDel(key) {
  const res = await kvCommand(["GETDEL", key]);
  if (res !== null) return res;
  const val = await kvGet(key);
  if (val !== null) await kvDel(key);
  return val;
}
