// ============================ BEST-EFFORT RATE LIMITER ============================
//
// Shared in-memory limiter for the auth endpoints (login, set-password, reset). Serverless
// instances are recycled, so this is not a hard guarantee — it just blunts trivial bursts
// from a single source. For real limits use a shared store (KV) or platform edge limiting.

const buckets = new Map(); // key -> number[] (timestamps within the window)

export function rateLimited(key, { windowMs = 60_000, max = 10 } = {}) {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  return recent.length > max;
}

export function clientIp(req) {
  const fwd = req && req.headers && req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return (req && req.socket && req.socket.remoteAddress) || "unknown";
}
