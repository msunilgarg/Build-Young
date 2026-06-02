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

// Escape, then turn bare http(s) URLs into links. Runs on the ESCAPED string, so the only
// special char a URL can carry is `&amp;` (valid inside an href) — no injection surface.
function fmtInline(raw) {
  return escapeHtml(raw).replace(
    /(https?:\/\/[^\s<]+)/g,
    (m) => `<a href="${m}" style="color:#0067b8;text-decoration:underline;">${m}</a>`
  );
}

// One list line → <li> inner HTML. A leading "Label: value" gets its label bolded. The
// `:\s+` guard means URL schemes ("https://…", no space after the colon) are never mistaken
// for a label, so they fall through to fmtInline and get linkified instead.
function listItemHtml(text) {
  const m = text.match(/^([^:]{1,50}):\s+(\S.*)$/s);
  return m
    ? `<strong>${escapeHtml(m[1])}:</strong> ${fmtInline(m[2])}`
    : fmtInline(text);
}

// Turn the plain-text body into structured HTML: blank-line-separated blocks become <p>s,
// and any block whose lines all start with a bullet becomes a <ul>. This replaces the old
// white-space:pre-wrap approach (which Outlook ignores, collapsing every line into one blob).
function renderBlocks(body) {
  return String(body).trim().split(/\n\s*\n/).map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return "";
    const isList = lines.every((l) => /^[•·*-]\s+/.test(l));
    if (isList) {
      const items = lines
        .map((l) => `<li style="margin:6px 0;">${listItemHtml(l.replace(/^[•·*-]\s+/, ""))}</li>`)
        .join("");
      return `<ul style="margin:0 0 16px;padding-left:22px;">${items}</ul>`;
    }
    return `<p style="margin:0 0 16px;">${lines.map(fmtInline).join("<br>")}</p>`;
  }).join("");
}

// Wrap the body in the branded Build Young email shell, matching the site's theme: warm paper
// background (C.paper #faf9f8), white card with a C.line #e1dfdd border, C.ink #242424 text,
// C.muted #605e5c secondary, the brand-blue "Young" wordmark, and the blue→teal→green logo
// bar (C.emerald/turq/green). Table-based + fully inline styles so it renders consistently
// across clients (Outlook included). Plain-text body in, on-brand rich HTML out.
export function bodyToHtml(body) {
  const FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  return `<div style="background:#faf9f8;padding:24px 12px;font-family:${FONT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid #e1dfdd;border-radius:10px;border-collapse:separate;overflow:hidden;">
      <tr><td style="background:#eaf3fb;padding:22px 28px;">
        <div style="font-size:22px;font-weight:800;letter-spacing:-.02em;color:#242424;">Build <span style="color:#0067b8;">Young</span></div>
        <div style="font-size:12px;color:#605e5c;margin-top:3px;">Raising builders, not consumers.</div>
      </td></tr>
      <tr><td style="font-size:0;line-height:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
          <td height="4" style="height:4px;background:#0067b8;">&nbsp;</td>
          <td height="4" style="height:4px;background:#0a7d85;">&nbsp;</td>
          <td height="4" style="height:4px;background:#178045;">&nbsp;</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:28px;color:#242424;font-size:15px;line-height:1.6;">${renderBlocks(body)}</td></tr>
      <tr><td style="padding:18px 28px;background:#f3f2f1;border-top:1px solid #e1dfdd;color:#605e5c;font-size:12px;line-height:1.5;">
        Build Young · live, online money &amp; building skills for teens.<br>
        Money in the program is <strong>simulated</strong> — financial education, not licensed financial advice.
      </td></tr>
    </table>
  </td></tr></table>
</div>`;
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
