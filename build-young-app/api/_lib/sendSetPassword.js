// ============================ SET-PASSWORD / RESET EMAIL ============================
//
// Mints a one-time token (api/_lib/auth.js) and emails the student a link to set or reset
// their password, through the shared Resend sender (api/_lib/sendEmail.js). Used by the Stripe
// webhook (after a verified enrollment) and by /api/auth/request-reset.
//
// The link points at the SPA with a `?setpw=<token>` param, which the app reads to show the
// set-password screen. The base URL is PUBLIC_BASE_URL (defaults to the production domain).

import { sendEmail } from "./sendEmail.js";
import { createPasswordToken } from "./auth.js";

const BASE_URL = () => (process.env.PUBLIC_BASE_URL || "https://www.build-young.com").replace(/\/+$/, "");

export async function sendSetPasswordEmail({ email, name, isReset = false, isAdmin = false }) {
  const token = await createPasswordToken(email);
  if (!token) return { ok: false, status: 500, detail: "could not mint token (KV unconfigured?)" };
  const link = `${BASE_URL()}/?setpw=${token}`;
  const first = String(name || "").trim().split(" ")[0] || "there";

  const subject = isReset
    ? "Reset your Build Young password"
    : isAdmin
      ? "You've been added as a Build Young admin — set your password"
      : "Welcome to Build Young — set your password";
  const body = isReset
    ? `Hi ${first},

We got a request to reset your Build Young password. Use the link below to choose a new one — it's good for 24 hours:

  •  Reset your password: ${link}

If you didn't ask for this, you can safely ignore this email — your password won't change.

The Build Young Team`
    : isAdmin
    ? `Hi ${first},

You've been given admin access to Build Young. Set your password to log in to the admin console — this link is good for 24 hours:

  •  Set your password: ${link}

Your username is your email (${email}). Once your password is set, the "Admin" option appears when you log in from any device.

The Build Young Team`
    : `Hi ${first},

Welcome aboard! Set your password to finish setting up your student portal. This link is good for 24 hours:

  •  Set your password: ${link}

Your username is your email (${email}). Once your password is set, you can log in to your dashboard from any device.

See you in class,
The Build Young Team`;

  return sendEmail({ to: email, subject, body });
}
