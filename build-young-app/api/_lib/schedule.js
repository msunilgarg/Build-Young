// ============================ SCHEDULE (pure date math) ============================
//
// Pure, side-effect-free helpers that turn a cohort's `start` date + weekly cadence into
// concrete class dates, and decide which media emails are due to go out "today".
//
// Why this exists: the in-app simulation is click-driven (a student clicks "advance" and
// the whole 3-email drip fires at once). For the real program we instead want one email
// per real calendar day on days -3, -2, -1 before each weekly class (Weeks 3–12). A daily
// cron calls dueSends(today) and sends only what's due that day.
//
// Date handling: we work in whole calendar days. `start` (e.g. "Sep 9, 2026") is the Week-1
// class date; Week N is start + (N-1)*7 days. We normalize every date to a UTC midnight
// "day number" so DST / timezone shifts can never throw the 3/2/1-day window off by one.

// Weeks that carry a live market event (and therefore a media drip). FLIPPED CURRICULUM:
// Weeks 1–7 are the Build act + finance setup (no portfolio yet, no event/drip); the live
// market arc runs Weeks 8–12 — matching marketEventFor() in _lib/marketSchedule.js.
export const MEDIA_WEEKS = { first: 8, last: 12 };

// The day-offsets a drip goes out on, relative to class day: -3 (breaking), -2 (analysis),
// -1 (challenge). Stored as positive "days before class".
export const DRIP_OFFSETS = [3, 2, 1];

// A class reminder goes out this many days before EVERY weekly class (weeks 1–12) — a heads-up
// with what to prepare, separate from the market-news drip.
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

// Given "today" (ISO yyyy-mm-dd or any Date-parseable value) and the cohort list, return the
// list of media sends due today: { batchId, week, dayOffset } where dayOffset ∈ {3,2,1} means
// the Week-N class is exactly 3/2/1 days from today, for weeks 3..12 only.
//
// Sorted deterministically (by batchId, then week, then descending dayOffset) so the cron's
// behavior — and tests — are stable.
export function dueSends(today, batches) {
  const out = [];
  for (const batch of batches || []) {
    for (let week = MEDIA_WEEKS.first; week <= MEDIA_WEEKS.last; week++) {
      const classDate = classDateForWeek(batch, week);
      if (!classDate) continue;
      const daysUntil = daysBetween(today, classDate);
      if (DRIP_OFFSETS.includes(daysUntil)) {
        out.push({ batchId: batch.id, week, dayOffset: daysUntil });
      }
    }
  }
  out.sort((a, b) =>
    a.batchId < b.batchId ? -1 : a.batchId > b.batchId ? 1 :
    a.week - b.week || b.dayOffset - a.dayOffset
  );
  return out;
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
