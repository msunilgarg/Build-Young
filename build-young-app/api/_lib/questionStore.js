// ============================ FAQ QUESTIONS (KV-backed) ============================
//
// Visitors who don't see their question in the FAQ can submit it. Stored in a KV list
// (`faq:questions`) and emailed to the founder (reply-to the asker), mirroring the
// interest/schedule capture. A question that comes up a lot is a candidate to add to the FAQ.

import { kvConfigured, kvCommand } from "./kv.js";
import { normalizeEmail } from "./auth.js";
import { sendEmail } from "./sendEmail.js";
import { loadOps, loadSettings } from "./settingsStore.js";

const TEAM_EMAIL = "team@build-young.com"; // default founder-notification destination (not a personal inbox)
const KEY = "faq:questions";
const parse = (r) => { try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; } };

// Capture a visitor question + email it to the founder. Returns { ok, emailed } (ok:false with a
// user-facing `error` on bad input or when neither the store nor email is configured).
export async function addQuestion({ email, question }) {
  const e = normalizeEmail(email || "");
  if (!e || !e.includes("@")) return { ok: false, error: "Please enter a valid email." };
  const q = String(question || "").trim().slice(0, 2000);
  if (q.length < 4) return { ok: false, error: "Please type your question." };

  let stored = false;
  if (kvConfigured()) {
    const rec = JSON.stringify({ email: e, question: q, ts: Date.now() });
    try { await kvCommand(["RPUSH", KEY, rec]); await kvCommand(["LTRIM", KEY, "-5000", "-1"]); stored = true; } catch { /* fall through to email */ }
  }

  let emailed = false;
  try {
    const [ops, settings] = await Promise.all([loadOps(), loadSettings()]);
    const to = (ops && ops.notifyEmail) || (settings && settings.contactEmail) || TEAM_EMAIL;
    const sent = await sendEmail({
      to,
      subject: "New question from the FAQ — Build Young",
      body: `A visitor asked a question that isn't in the FAQ.\n\nFrom: ${e}\n\nQuestion:\n${q}\n\nReply to them directly. If this comes up a lot, consider adding it to the FAQ.`,
      replyTo: e,
    });
    emailed = !!(sent && sent.ok);
  } catch { /* keep going — the KV record still shows on the dashboard */ }

  if (!stored && !emailed) return { ok: false, error: "We couldn't submit that just now — please email us instead." };
  return { ok: true, emailed };
}

// All submitted questions, newest first — for the founder console.
export async function listQuestions() {
  if (!kvConfigured()) return [];
  try { const raw = (await kvCommand(["LRANGE", KEY, "0", "-1"])) || []; return raw.map(parse).filter(Boolean).reverse(); } catch { return []; }
}
