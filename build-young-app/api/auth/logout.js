// POST /api/auth/logout — clears the session cookie. (Stateless sessions: clearing the cookie
// is the sign-out; the token would otherwise expire on its own.)

import { sessionCookie } from "../_lib/auth.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader("Set-Cookie", sessionCookie("", { clear: true }));
  res.status(200).json({ ok: true });
}
