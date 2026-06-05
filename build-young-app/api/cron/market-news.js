// ============================ CRON: daily class reminders ============================
//
// Runs once a day (see vercel.json). For each enrolled student, sends a "prepare for next
// week" heads-up two days before each weekly class (Weeks 1–12). What to prepare comes from
// the founder-editable homework (api/_lib/homeworkStore.js, defaulting to WEEK_PREP).
//
// The CALENDAR schedule (which week's class is in 2 days) comes from api/_lib/schedule.js.
// The roster (who to email) comes from api/_lib/roster.js.
//
// SECURITY:
//   - Requires `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this automatically
//     when CRON_SECRET is configured). Any other/missing value → 401. Never logs the secret.
//   - The Resend API key stays server-side (read inside the shared sender).
//   - No-ops gracefully (200, sent:0) if RESEND_API_KEY is missing, so a misconfigured deploy
//     doesn't error the cron — it just sends nothing.

import { BATCHES } from "../../src/cohorts.js";
import { WEEK_TITLES } from "../../src/marketMedia.js";
import { dueReminders, classDateForWeek } from "../_lib/schedule.js";
import { getRoster } from "../_lib/roster.js";
import { loadHomework } from "../_lib/homeworkStore.js";
import { sendEmail } from "../_lib/sendEmail.js";

// Readable class date for week N (UTC, so the calendar day never shifts by timezone).
function readableClassDate(batch, week) {
  const d = classDateForWeek(batch, week);
  return d ? d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }) : (batch.day || "");
}

// The reminder, sent 2 days before a week's FIRST session. Each week has two classes, so this is
// the heads-up that the week is starting; what to prepare comes from the founder-editable homework.
function reminderEmail(name, week, batch, homework) {
  const first = String(name || "").trim().split(" ")[0] || "there";
  const title = WEEK_TITLES[week - 1] || `Week ${week}`;
  const prep = homework[week - 1];
  return {
    subject: `Week ${week} of Build Young starts in 2 days`,
    body: `Hi ${first},

Heads-up — Week ${week} starts in 2 days. You meet twice this week (${batch.day}).

Week ${week}: "${title}"
First session: ${readableClassDate(batch, week)}
Join on Zoom: ${batch.zoom}
${prep ? `\nBefore class — please complete these so you're ready:\n${prep}\n` : ""}
See you there,
The Build Young Team`,
  };
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

  let sent = 0;
  let failed = 0;
  const attempts = [];

  // ---- Class reminders: 2 days before every weekly class (weeks 1–12). ----
  const reminders = dueReminders(today, BATCHES);
  const homework = reminders.length ? await loadHomework() : [];
  for (const { batchId, week } of reminders) {
    const batch = BATCHES.find((b) => b.id === batchId);
    if (!batch) continue;
    let roster = [];
    try { roster = await getRoster(batchId); } catch { roster = []; }
    for (const student of roster) {
      const mail = reminderEmail(student.name, week, batch, homework);
      attempts.push({ kind: "reminder", batchId, week, to: student.email });
      try {
        const result = await sendEmail({ to: student.email, subject: mail.subject, body: mail.body });
        if (result.ok) sent += 1; else failed += 1;
      } catch { failed += 1; }
    }
  }

  res.status(200).json({ ok: true, date: typeof today === "string" ? today : undefined, reminders: reminders.length, attempts: attempts.length, sent, failed });
}
