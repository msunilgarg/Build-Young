// Serverless email sender for Built Young.
// Works as a Vercel function at /api/send-email. (For Netlify, see README note.)
//
// Setup:
//   1. Create a Resend account (https://resend.com) and verify your domain (builtyoung.com).
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

const MAX_SUBJECT = 200;
const MAX_BODY = 5000;
// RFC-5322-ish: good enough to reject obvious garbage and header-injection attempts.
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

// Best-effort in-memory limiter. Serverless instances are recycled, so this is not a
// hard guarantee — it just blunts trivial bursts from a single source. For real limits
// use a shared store (e.g. Upstash/Redis) or your platform's edge rate limiting.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
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

    // Convert the plain-text body to simple HTML (preserve line breaks).
    const html = `<div style="font-family:Segoe UI,system-ui,sans-serif;font-size:15px;line-height:1.6;color:#242424;white-space:pre-wrap">${
      body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    }</div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Built Young <team@builtyoung.com>",
        to: [to.trim()],
        subject,
        text: body,
        html,
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: "Provider error", detail: data });
      return;
    }
    res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ error: "Send failed", detail: String(e) });
  }
}
