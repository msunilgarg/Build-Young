// POST /api/auth/request-reset  { email }
// Emails a password-reset link IF the account exists. Always responds 200 with the same body
// so the endpoint can't be used to enumerate which emails have accounts.

import { getUser, putUser, validEmail, isFounder } from "../_lib/auth.js";
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
    let user = await getUser(email);
    const existed = !!user;
    // Founders/admins can self-provision a login WITHOUT enrolling (no payment): the allowlist is
    // the authorization. Everyone else only gets a reset link if they already have an account.
    if (!user && (await isFounder(email))) user = await putUser(email, { name: "" });
    if (user) {
      try {
        await sendSetPasswordEmail({ email: user.email, name: user.name, isReset: existed });
      } catch {
        /* swallow — never reveal send failures or account existence */
      }
    }
  }
  res.status(200).json({ ok: true });
}
