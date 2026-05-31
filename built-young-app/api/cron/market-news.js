// ============================ CRON: daily market-news drip ============================
//
// Runs once a day (see vercel.json). For each enrolled student, sends the ONE media email
// that is due today: on the calendar days -3 / -2 / -1 before each weekly class (Weeks 3–12)
// the simulated market event's breaking-news / analysis / research-challenge email goes out,
// one per day. This replaces the in-app behavior where the whole 3-email drip fired at once
// on a click — the content is identical, just delivered on real dates.
//
// Content is SINGLE-SOURCED from src/marketMedia.js (mediaDrip), the same module the browser
// app re-exports. The schedule (which week's class is in 3/2/1 days) comes from
// api/_lib/schedule.js. The roster (who to email) comes from api/_lib/roster.js.
//
// SECURITY:
//   - Requires `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this automatically
//     when CRON_SECRET is configured). Any other/missing value → 401. Never logs the secret.
//   - The Resend API key stays server-side (read inside the shared sender).
//   - No-ops gracefully (200, sent:0) if RESEND_API_KEY is missing, so a misconfigured deploy
//     doesn't error the cron — it just sends nothing.

import { BATCHES } from "../../src/cohorts.js";
import { mediaDrip } from "../../src/marketMedia.js";
import { dueSends, DRIP_OFFSETS } from "../_lib/schedule.js";
import { getRoster } from "../_lib/roster.js";
import { sendEmail } from "../_lib/sendEmail.js";

// Append the resource links to the plain-text body (mirrors the in-app sendEmail behavior).
function bodyWithResources(m) {
  return m.resources && m.resources.length
    ? `${m.body}\n\nResources:\n${m.resources.map((r) => `• ${r.label}: ${r.url}`).join("\n")}`
    : m.body;
}

// Build the single drip email for a given student + week + dayOffset (3/2/1).
// Returns null if there's no media for that week (e.g. a flat week — shouldn't happen since
// dueSends only emits weeks 3–12, but we stay defensive).
function emailForOffset(name, week, dayOffset) {
  const state = { phase: "course", week, checkin: 0, student: { name } };
  const drip = mediaDrip(state, null); // batch arg is unused by mediaDrip
  return drip.find((m) => m.day === dayOffset) || null;
}

export default async function handler(req, res) {
  // ---- Auth: require the shared cron secret. ----
  const secret = process.env.CRON_SECRET;
  const auth = (req.headers && (req.headers.authorization || req.headers.Authorization)) || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // ---- Graceful no-op if email isn't configured. ----
  if (!process.env.RESEND_API_KEY) {
    res.status(200).json({ ok: true, sent: 0, note: "RESEND_API_KEY not set — nothing sent" });
    return;
  }

  // "today" can be overridden via ?date=YYYY-MM-DD for manual backfills/testing; defaults to now.
  const today = (req.query && req.query.date) || new Date();

  const due = dueSends(today, BATCHES);

  let sent = 0;
  let failed = 0;
  const attempts = [];

  for (const { batchId, week, dayOffset } of due) {
    if (!DRIP_OFFSETS.includes(dayOffset)) continue;
    let roster = [];
    try {
      roster = await getRoster(batchId);
    } catch {
      roster = [];
    }
    for (const student of roster) {
      const m = emailForOffset(student.name, week, dayOffset);
      if (!m) continue;
      attempts.push({ batchId, week, dayOffset, to: student.email });
      try {
        const result = await sendEmail({
          to: student.email,
          subject: m.subject,
          body: bodyWithResources(m),
          from: m.from, // "Built Young Newsroom <…>"
        });
        if (result.ok) sent += 1; else failed += 1;
      } catch {
        failed += 1;
      }
    }
  }

  res.status(200).json({ ok: true, date: typeof today === "string" ? today : undefined, due: due.length, attempts: attempts.length, sent, failed });
}
