// POST /api/auth/request-reset  { email }
// Emails a password-reset link IF the account exists. Always responds 200 with the same body
// so the endpoint can't be used to enumerate which emails have accounts.

import { getUser, validEmail } from "../_lib/auth.js";
import { sendSetPasswordEmail } from "../_lib/sendSetPassword.js";
import { rateLimited, clientIp } from "../_lib/rateLimit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (rateLimited(`reset:${clientIp(req)}`, { max: 5 })) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const { email } = req.body || {};
  if (validEmail(email)) {
    const user = await getUser(email);
    if (user) {
      try {
        await sendSetPasswordEmail({ email: user.email, name: user.name, isReset: true });
      } catch {
        /* swallow — never reveal send failures or account existence */
      }
    }
  }
  res.status(200).json({ ok: true });
}
