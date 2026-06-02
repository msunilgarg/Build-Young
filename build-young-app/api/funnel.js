// ============================ FUNNEL READ (founder-gated) ============================
//
// Returns the raw funnel event stream for the founder dashboard + data-room exports. The
// dashboard does the aggregation client-side via src/funnel.js (single source of truth), so
// this endpoint is just gated storage read-back.
//
// SECURITY: gated by the FOUNDER_TOKEN env var. If it's unset the route 404s (acts like it
// doesn't exist); otherwise every call must present the matching token (timing-safe). The
// events themselves are aggregate-only (no PII), but access is still restricted to the founder.

import crypto from "node:crypto";
import { kvConfigured, kvCommand } from "./_lib/kv.js";

const KEY = "funnel:events";

function timingSafeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export default async function handler(req, res) {
  const secret = process.env.FOUNDER_TOKEN;
  if (!secret) { res.status(404).json({ error: "Not found" }); return; }

  const token = (req.query && req.query.token) || (req.headers && req.headers["x-founder-token"]) || "";
  if (!timingSafeEq(token, secret)) { res.status(403).json({ error: "Forbidden" }); return; }

  if (!kvConfigured()) { res.status(200).json({ events: [] }); return; }

  let raw = [];
  try { raw = (await kvCommand(["LRANGE", KEY, "0", "-1"])) || []; } catch { raw = []; }
  const events = raw
    .map((r) => { try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; } })
    .filter(Boolean);

  res.status(200).json({ events });
}
