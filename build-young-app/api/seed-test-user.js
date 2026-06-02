// ===================== TEMPORARY TEST-USER SEED — DELETE AFTER AUTH TESTING =====================
//
// Lets you create a test account and get a working `?setpw=<token>` link WITHOUT Stripe, so you can
// exercise the real set-password → login → dashboard flow before payments are wired. It reuses the
// exact same helpers as the Stripe webhook (putUser + createPasswordToken), so what you test here is
// what production does — minus the payment.
//
// SECURITY / LIFECYCLE:
//   • Gated by the SEED_TOKEN env var. If SEED_TOKEN is unset, the route 404s (acts like it doesn't
//     exist). Every call must present the matching token (timing-safe compare).
//   • This is NOT part of real provisioning. DELETE this file AND remove the SEED_TOKEN env var once
//     you've confirmed auth works.
//
// USAGE (browser or curl), with SEED_TOKEN set in Vercel:
//   https://build-young.com/api/seed-test-user?token=<SEED_TOKEN>&email=you@example.com&name=Test%20Student&batchId=fall-hs-wed
// Response: { ok, email, setpwUrl } — open setpwUrl to set a password, then log in from /.

import crypto from "node:crypto";
import { putUser, createPasswordToken } from "./_lib/auth.js";
import { kvConfigured } from "./_lib/kv.js";
import { sendSetPasswordEmail } from "./_lib/sendSetPassword.js";

const BASE_URL = () => (process.env.PUBLIC_BASE_URL || "https://build-young.com").replace(/\/+$/, "");

function timingSafeEq(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export default async function handler(req, res) {
  const secret = process.env.SEED_TOKEN;
  if (!secret) { res.status(404).json({ error: "Not found" }); return; } // unset → pretend it doesn't exist

  const q = req.query || {};
  const provided = q.token || (req.headers && req.headers["x-seed-token"]) || "";
  if (!timingSafeEq(provided, secret)) { res.status(403).json({ error: "Forbidden" }); return; }

  if (!kvConfigured()) { res.status(500).json({ error: "KV not configured" }); return; }

  const email = String(q.email || "").trim().toLowerCase();
  const name = String(q.name || "Test Student").trim();
  const batchId = String(q.batchId || "fall-hs-wed").trim();
  if (!email || !email.includes("@")) { res.status(400).json({ error: "Provide ?email=<address>" }); return; }

  await putUser(email, { name, batchId });
  const token = await createPasswordToken(email);
  if (!token) { res.status(500).json({ error: "Could not mint token (KV write failed?)" }); return; }
  const setpwUrl = `${BASE_URL()}/?setpw=${token}`;

  // Also fire the REAL set-password email so this doubles as an email-delivery probe. The returned
  // `emailed` field surfaces exactly what Resend said — e.g. { ok:false, detail:"missing
  // RESEND_API_KEY" } or a domain-not-verified error — without needing the Resend dashboard. (This
  // mints a second, separate token for the email; both links work. setpwUrl above always works even
  // if email delivery fails.)
  let emailed;
  try { emailed = await sendSetPasswordEmail({ email, name }); }
  catch (e) { emailed = { ok: false, detail: String(e && e.message || e) }; }

  res.status(200).json({ ok: true, email, setpwUrl, emailed });
}
