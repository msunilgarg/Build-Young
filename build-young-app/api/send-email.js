// Serverless email sender for Build Young.
// Works as a Vercel function at /api/send-email. (For Netlify, see README note.)
//
// Setup:
//   1. Create a Resend account (https://resend.com) and verify your domain (build-young.com).
//   2. Add an env var in your host:  RESEND_API_KEY = re_xxxxxxxx
//   3. In src/App.jsx CONFIG, set emailEnabled: true.
//
// This keeps your API key on the server — never in the browser bundle.
//
// Hardening (this endpoint sends from a verified domain, so treat it as abusable):
//   - POST only; rejects anything else.
//   - Validates `to` is a single, well-formed email address (no arrays, no comma lists).
//   - Caps subject/body length so it can't be used to blast large payloads.
//   - Best-effort, per-instance rate limiting by client IP.
//   - HTML-escapes the body before embedding it in the HTML part.
// For production you should ALSO put this behind your own auth/origin check — a public,
// unauthenticated send endpoint can be used to send mail from your domain to anyone.

// The actual Resend call (+ HTML escaping + from-address) lives in the shared sender so the
// public endpoint and the cron scheduler send identically and keep the API key server-side.
import { sendEmail } from "./_lib/sendEmail.js";

const MAX_SUBJECT = 200;
const MAX_BODY = 5000;
// RFC-5322-ish: good enough to reject obvious garbage and header-injection attempts.
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

// Same-origin gate. The ONLY legitimate caller of this HTTP endpoint is the browser app —
// the market-news cron uses the shared sender (api/_lib/sendEmail.js) directly, never HTTP.
// A real browser POST always carries an Origin header; curl/bots/other sites won't match.
// This blunts abuse of a public send endpoint on a verified domain (not a hard auth boundary
// — a determined attacker can forge Origin — but it stops cross-site/CSRF and casual misuse,
// layered on top of the per-IP rate limit). Add preview/extra origins (comma-separated, e.g.
// your Vercel preview URL) via the ALLOWED_ORIGIN env var.
const DEFAULT_ORIGINS = ["https://build-young.com", "https://www.build-young.com"];
function allowedOrigins() {
  const extra = (process.env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}
function requestOrigin(req) {
  const o = req.headers && req.headers.origin;
  if (typeof o === "string" && o) return o;
  // Fall back to the Referer's origin if Origin is absent.
  const ref = req.headers && req.headers.referer;
  if (typeof ref === "string" && ref) {
    try { return new URL(ref).origin; } catch { /* malformed referer */ }
  }
  return null;
}

// Best-effort in-memory limiter. Serverless instances are recycled, so this is not a
// hard guarantee — it just blunts trivial bursts from a single source. For real limits
// use a shared store (e.g. Upstash/Redis) or your platform's edge rate limiting.
const RATE_WINDOW_MS = 60_000;
// Headroom for one class advance, which can fire a small burst from a single student:
// a weekly recap + the 3-email pre-class market-news drip. Still blunts real abuse.
const RATE_MAX = 10;
const hits = new Map(); // ip -> number[] (timestamps within the window)

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_MAX;
}

function clientIp(req) {
  const fwd = req.headers && req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Reject anything that isn't a same-origin browser request (see DEFAULT_ORIGINS above).
  const origin = requestOrigin(req);
  if (!origin || !allowedOrigins().has(origin)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Email not configured (missing RESEND_API_KEY)" });
    return;
  }

  if (rateLimited(clientIp(req))) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  try {
    const { to, subject, body } = req.body || {};

    // Validate types + presence.
    if (typeof to !== "string" || typeof subject !== "string" || typeof body !== "string") {
      res.status(400).json({ error: "to, subject, and body are required strings" });
      return;
    }
    // Exactly one well-formed recipient (blocks arrays, comma lists, and header injection).
    if (!EMAIL_RE.test(to.trim())) {
      res.status(400).json({ error: "Invalid recipient email" });
      return;
    }
    if (subject.length === 0 || subject.length > MAX_SUBJECT) {
      res.status(400).json({ error: `subject must be 1-${MAX_SUBJECT} characters` });
      return;
    }
    if (body.length === 0 || body.length > MAX_BODY) {
      res.status(400).json({ error: `body must be 1-${MAX_BODY} characters` });
      return;
    }

    // Delegate the actual Resend call (HTML escaping + from-address) to the shared sender.
    const result = await sendEmail({ to: to.trim(), subject, body });
    if (!result.ok) {
      const status = result.status === 502 ? 502 : 500;
      res.status(status).json({ error: status === 502 ? "Provider error" : "Send failed", detail: result.detail });
      return;
    }
    res.status(200).json({ ok: true, id: result.id });
  } catch (e) {
    res.status(500).json({ error: "Send failed", detail: String(e) });
  }
}
