// POST /api/auth/login  { email, password }
// Verifies credentials and issues a session cookie. Errors are deliberately generic so the
// endpoint never reveals whether an account exists.

import { getUser, verifyPassword, signSession, sessionCookie, validEmail } from "../_lib/auth.js";
import { rateLimited, clientIp } from "../_lib/rateLimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (rateLimited(`login:${clientIp(req)}`, { max: 10 })) {
    res.status(429).json({ error: "Too many attempts. Please try again shortly." });
    return;
  }

  const { email, password } = req.body || {};
  if (!validEmail(email) || typeof password !== "string" || !password) {
    res.status(400).json({ error: "Enter your email and password." });
    return;
  }

  const user = await getUser(email);
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }

  const session = signSession(user.email);
  if (!session) {
    res.status(500).json({ error: "Auth not configured (missing AUTH_SECRET)" });
    return;
  }
  res.setHeader("Set-Cookie", sessionCookie(session));
  res.status(200).json({ ok: true, user: { email: user.email, name: user.name || "", batchId: user.batchId || "" } });
}
