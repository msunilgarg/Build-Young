// ============================ SCHEDULE (pure date math) ============================
//
// Pure, side-effect-free helpers that turn a cohort's `start` date + weekly cadence into
// concrete class dates, and decide which class reminders are due to go out "today".
//
// A daily cron calls dueReminders(today) and sends a "prepare for next week" heads-up two
// days before each weekly class.
//
// Date handling: we work in whole calendar days. `start` (e.g. "Sep 9, 2026") is the Week-1
// class date; Week N is start + (N-1)*7 days. We normalize every date to a UTC midnight
// "day number" so DST / timezone shifts can never throw the reminder window off by one.

// A class reminder goes out this many days before EVERY weekly class (weeks 1–12) — a heads-up
// with what to prepare for the upcoming class.
export const REMINDER_OFFSET = 2;

// Parse a date string/Date into a UTC-midnight Date (time-of-day stripped). Returns null
// for unparseable input so callers can skip a malformed batch rather than crash.
export function toUtcMidnight(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Integer count of whole days from `a` to `b` (b - a), using UTC midnights.
const MS_PER_DAY = 24 * 60 * 60 * 1000;
export function daysBetween(a, b) {
  const am = toUtcMidnight(a);
  const bm = toUtcMidnight(b);
  if (!am || !bm) return NaN;
  return Math.round((bm.getTime() - am.getTime()) / MS_PER_DAY);
}

// The class datetime (as a UTC-midnight Date) for week N of a batch. Week 1 == batch.start;
// each later week is +7 days. Returns null if start is unparseable or week is out of range.
export function classDateForWeek(batch, week) {
  if (!batch || week < 1 || week > 12) return null;
  const start = toUtcMidnight(batch.start);
  if (!start) return null;
  return new Date(start.getTime() + (week - 1) * 7 * MS_PER_DAY);
}

// Convenience: ISO yyyy-mm-dd for a week's class date (handy for logging/tests).
export function classISOForWeek(batch, week) {
  const d = classDateForWeek(batch, week);
  return d ? d.toISOString().slice(0, 10) : null;
}

// Class reminders due today: { batchId, week } for every week 1–12 whose class is exactly
// REMINDER_OFFSET days from `today`. Used by the cron to send the "prepare for next week"
// heads-up. Sorted by batchId, then week.
export function dueReminders(today, batches) {
  const out = [];
  for (const batch of batches || []) {
    for (let week = 1; week <= 12; week++) {
      const classDate = classDateForWeek(batch, week);
      if (!classDate) continue;
      if (daysBetween(today, classDate) === REMINDER_OFFSET) out.push({ batchId: batch.id, week });
    }
  }
  out.sort((a, b) => (a.batchId < b.batchId ? -1 : a.batchId > b.batchId ? 1 : a.week - b.week));
  return out;
}
