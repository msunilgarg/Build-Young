// ============================ SCHEDULE (pure date math) ============================
//
// Pure, side-effect-free helpers that turn a cohort's `start` date + its LESSON SCHEDULE into
// concrete class dates, and decide which class reminders are due to go out "today".
//
// A daily cron calls dueReminders(today) and sends a "prepare for your next lesson" heads-up two
// days before each lesson's first sitting — so an accelerated cohort gets several reminders a week.
//
// Date handling: we work in whole calendar days. `start` is lesson 1's date; each later lesson's
// date comes from the cohort's `lessons` schedule (its first sitting's day-offset) via
// `cohortLessons` — so it's correct at any pace (the flagship is still start + (N−1)*7). We
// normalize every date to a UTC midnight "day number" so DST / timezone shifts can't throw the
// reminder window off by one.
import { cohortLessons } from "../../src/courseDates.js";

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

// The class datetime (as a UTC-midnight Date) for lesson N of a batch — the lesson's FIRST sitting,
// from the cohort's `lessons` schedule. Lesson 1 == batch.start; the flagship cadence makes this
// start + (N−1)*7. Returns null if start is unparseable or the lesson is out of range. (Param kept
// named `week` for back-compat = lesson number.)
export function classDateForWeek(batch, week) {
  const lessons = cohortLessons(batch);
  if (!batch || week < 1 || week > lessons.length) return null;
  const start = toUtcMidnight(batch.start);
  if (!start) return null;
  return new Date(start.getTime() + lessons[week - 1][0] * MS_PER_DAY);
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
    const lessonCount = cohortLessons(batch).length; // 12 for the flagship; same at any pace
    for (let week = 1; week <= lessonCount; week++) {
      const classDate = classDateForWeek(batch, week);
      if (!classDate) continue;
      if (daysBetween(today, classDate) === REMINDER_OFFSET) out.push({ batchId: batch.id, week });
    }
  }
  out.sort((a, b) => (a.batchId < b.batchId ? -1 : a.batchId > b.batchId ? 1 : a.week - b.week));
  return out;
}
