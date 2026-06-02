// ============================ SHARED RESEND SENDER ============================
//
// One place that talks to Resend, used by BOTH the public /api/send-email endpoint and the
// daily cron scheduler (/api/cron/market-news). Keeping the provider call here means the API
// key handling, from-address, and HTML escaping stay identical across callers.
//
// SECURITY: the API key is read from process.env.RESEND_API_KEY and never leaves the server.
// Callers are responsible for their own auth / validation BEFORE calling this.

export const FROM_ADDRESS = "Build Young <team@build-young.com>";
// Where replies land. From-address stays on the verified domain (Resend requires it), but a
// parent who hits "reply" reaches a monitored inbox. Override per-send via the `replyTo` arg.
export const REPLY_TO_ADDRESS = "sunilgarg@outlook.com";

// Escape a plain-text body for safe embedding in the HTML part (no innerHTML/eval anywhere).
export function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Wrap a plain-text body in the simple Build Young HTML shell (preserves line breaks).
export function bodyToHtml(body) {
  return `<div style="font-family:Segoe UI,system-ui,sans-serif;font-size:15px;line-height:1.6;color:#242424;white-space:pre-wrap">${escapeHtml(body)}</div>`;
}

// Send one email through Resend. Returns { ok, id } on success or { ok:false, status, detail }.
// Throws only on a thrown fetch/network error — callers decide how to surface failures.
//
// `fromEmail` lets the cron use a "Newsroom" display name; defaults to FROM_ADDRESS.
// `replyTo` sets the Reply-To header (defaults to REPLY_TO_ADDRESS, a monitored inbox).
export async function sendEmail({ to, subject, body, from = FROM_ADDRESS, replyTo = REPLY_TO_ADDRESS }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, status: 500, detail: "missing RESEND_API_KEY" };

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo,
      subject,
      text: body,
      html: bodyToHtml(body),
    }),
  });

  const data = await r.json();
  if (!r.ok) return { ok: false, status: 502, detail: data };
  return { ok: true, id: data.id };
}
