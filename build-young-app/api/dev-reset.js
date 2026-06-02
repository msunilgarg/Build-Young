// ===================== TEMPORARY DEV ACCOUNT RESET — DELETE BEFORE LAUNCH =====================
//
// Wipes a test account so the SAME email can re-run the enroll → set-password → dashboard flow
// from scratch. Deletes the user record (`user:<email>`) and the server-side sim state
// (`state:<email>`). Gated by the DEV_RESET_TOKEN env var (404 when unset; 403 on mismatch).
//
//   https://www.build-young.com/api/dev-reset?token=<DEV_RESET_TOKEN>&email=you@example.com
//
// DELETE this file and remove DEV_RESET_TOKEN before launch — it's a testing convenience only.
// (The enrollment roster `enroll:<batchId>` and the aggregate funnel events are left intact; they
// don't block re-enrolling and carry no login.)

import crypto from "node:crypto";
import { kvConfigured, kvDel } from "./_lib/kv.js";
import { normalizeEmail } from "./_lib/auth.js";

function timingSafeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export default async function handler(req, res) {
  const secret = process.env.DEV_RESET_TOKEN;
  if (!secret) { res.status(404).json({ error: "Not found" }); return; }

  const token = (req.query && req.query.token) || (req.headers && req.headers["x-dev-token"]) || "";
  if (!timingSafeEq(token, secret)) { res.status(403).json({ error: "Forbidden" }); return; }

  if (!kvConfigured()) { res.status(200).json({ ok: false, reason: "store not configured" }); return; }

  const email = normalizeEmail((req.query && req.query.email) || "");
  if (!email || !email.includes("@")) { res.status(400).json({ error: "Provide ?email=<address>" }); return; }

  try {
    await kvDel(`user:${email}`);
    await kvDel(`state:${email}`);
  } catch { res.status(200).json({ ok: false }); return; }

  res.status(200).json({
    ok: true,
    deleted: [`user:${email}`, `state:${email}`],
    note: "Account + sim state wiped. Also click Exit (or clear cookies) to drop the session, then re-enroll fresh.",
  });
}
