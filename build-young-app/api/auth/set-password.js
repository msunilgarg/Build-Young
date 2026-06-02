// POST /api/auth/set-password  { token, password }
// Consumes a one-time set-password/reset token, stores the scrypt password hash, and signs the
// student in (session cookie). This is the only way an account's password gets created or
// changed — proving control of the email via the tokenized link.

import {
  consumePasswordToken, putUser, hashPassword, signSession, sessionCookie, MIN_PASSWORD_LENGTH,
} from "../_lib/auth.js";
import { rateLimited, clientIp } from "../_lib/rateLimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (rateLimited(`setpw:${clientIp(req)}`, { max: 20 })) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const { token, password } = req.body || {};
  if (typeof token !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "token and password are required" });
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    return;
  }

  // One-time consume — also guards against a replayed link.
  const email = await consumePasswordToken(token);
  if (!email) {
    res.status(400).json({ error: "This link is invalid or has expired. Request a new one." });
    return;
  }

  const session = signSession(email);
  if (!session) {
    res.status(500).json({ error: "Auth not configured (missing AUTH_SECRET)" });
    return;
  }

  const user = await putUser(email, { passwordHash: hashPassword(password), emailVerified: true });
  res.setHeader("Set-Cookie", sessionCookie(session));
  res.status(200).json({ ok: true, user: { email: user.email, name: user.name || "", batchId: user.batchId || "" } });
}
