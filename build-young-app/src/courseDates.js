// Pure course-calendar + refund math — no React, no app state, no design system. Every function
// takes the cohort/state as a parameter, so it's safe to share across the app, the cron, and
// tests. Extracted from App.jsx (which imports + re-exports these for back-compat). Covered by
// test/engine.test.js.

export const CHECKIN_TIME = "5:00–6:00 PM PT"; // 60-minute follow-up check-in (the week after the course)
// The check-in is ONE MONTH after the cohort's final (Week 12) class, kept on the cohort's
// usual weekday (the same weekday it started/meets). Returns a label like
// "Mon, Dec 28, 2026 · 5:00–6:00 PM PT", or "" if the start is unparseable.
export function checkinDateLabel(batch) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return "";
  // The follow-up check-in is the WEEK AFTER the 12-week course (Week 12 ≈ start + 11 weeks), so it
  // lands one week later — start + 12 weeks — naturally on the cohort's usual weekday. Keeping it
  // close (not a month out) keeps students engaged.
  const d = new Date(start.getTime() + 12 * 7 * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) + " · " + CHECKIN_TIME;
}
// The student's NEXT live session, as a CONCRETE date, so the dashboard banner reads
// "Mon, Sep 7, 2026 · 5:00–6:30 PM PT" rather than just the recurring weekday — making it
// clear it's the upcoming class. During the course, week N's class is start + (N-1)*7 days;
// once in the follow-up phase we reuse checkinDateLabel. The time-of-day is lifted from the
// cohort's `day` label ("Mondays · 5:00–6:30 PM PT"). Falls back to batch.day if start is
// unparseable (mirrors checkinDateLabel's guard).
export function nextClassLabel(batch, phase, week) {
  if (!batch) return "";
  if (phase !== "course") return checkinDateLabel(batch) || batch.day;
  const start = new Date(batch.start);
  if (isNaN(start.getTime())) return batch.day;
  const d = new Date(start.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const time = (batch.day.split("·")[1] || "").trim(); // "5:00–6:30 PM PT"
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  return time ? `${date} · ${time}` : date;
}
// Date-only label (no time) for a course week's class, e.g. "Wed, Sep 23, 2026". Used by the
// cancel/withdraw banner to state the EXACT refund deadlines. Week 1 == batch.start; week N is
// +7 days each. Returns "" if start is unparseable so callers can omit the date gracefully.
export function classDateLabel(batch, week) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return "";
  const d = new Date(start.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
// Real-world timing of the cohort's FIRST class vs. today — so a student who enrolls weeks early
// sees "starts in 5 weeks · Mon, Sep 7, 2026" instead of a misleading "Week 1 of 12". `beforeStart`
// drives the pre-start Overview landing + the header pill. `now` is injectable for tests.
export function cohortStartInfo(batch, now = new Date()) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return { days: null, beforeStart: false, shortDate: "", longDate: "", phrase: "" };
  const days = Math.ceil((start.getTime() - now.getTime()) / 86400000);
  const shortDate = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const longDate = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  let phrase;
  if (days > 13) phrase = `starts in ${Math.round(days / 7)} weeks`;
  else if (days > 1) phrase = `starts in ${days} days`;
  else if (days === 1) phrase = "starts tomorrow";
  else if (days === 0) phrase = "starts today";
  else phrase = "in progress";
  return { days, beforeStart: days > 0, shortDate, longDate, phrase };
}

// --- Founder teaching schedule (pure date math) ---------------------------------------------
// Cohorts meet twice a week on a day-pair (e.g. Mon & Wed): session 1 of week N is
// start + (N−1)*7 days; session 2 is +2 days. So the whole-day offset from `start` tells us
// everything: offset%7===0 → session 1, ===2 → session 2; week = floor(offset/7)+1.
export const dayNum = (d) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
// Does this cohort meet on `day`? → { week, session } or null (before start / after week 12 / off-day).
export function classMeetingOn(batch, day = new Date()) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return null;
  const offset = dayNum(day) - dayNum(start);
  if (offset < 0) return null;
  const slot = offset % 7;
  if (slot !== 0 && slot !== 2) return null;
  const week = Math.floor(offset / 7) + 1;
  if (week < 1 || week > 12) return null;
  return { week, session: slot === 0 ? 1 : 2 };
}
// The cohort's date for week N, session 1 or 2 (a Date), for "next class" lookups.
export function sessionDate(batch, week, session) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime()) || week < 1 || week > 12) return null;
  const base = dayNum(start) + (week - 1) * 7 + (session === 2 ? 2 : 0);
  return new Date(base * 86400000);
}
// Enrollment closes the day before a cohort starts: the LAST day to enroll is start − 1 day, so on
// the start date (and after) enrollment is closed. `now` is injectable for tests. Unparseable start
// → never auto-closes (founder can still close manually via the `full` flag).
export function enrollClosed(batch, now = new Date()) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return false;
  return dayNum(now) >= dayNum(start);
}
// A cohort is unavailable to enroll in if it's sold out (`full`, founder-set) OR past its
// enrollment cutoff (the day before it starts). Single source of truth for the landing card +
// the enroll screen so they can't disagree.
export function cohortClosed(batch, now = new Date()) {
  return !!(batch && batch.full) || enrollClosed(batch, now);
}
// The next class strictly on/after `day` → { week, session, date } or null if the course is done.
export function nextClass(batch, day = new Date()) {
  const today = dayNum(day);
  for (let w = 1; w <= 12; w++) {
    for (const sess of [1, 2]) {
      const d = sessionDate(batch, w, sess);
      if (d && dayNum(d) >= today) return { week: w, session: sess, date: d };
    }
  }
  return null;
}
// Build Young runs on Pacific Time (class times are "… PM PT"). All week progression is anchored to
// PT so every student — whatever their device timezone — and the UTC server/cron compute the SAME
// "current week", with no drift near midnight.
export const PROGRAM_TZ = "America/Los_Angeles";
// A calendar day as a stable integer index (days since the epoch), built from explicit Y/M/D — TZ
// independent because it goes through Date.UTC, never the local zone.
const calDayIndex = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / 86400000);
// "Now" as a PT calendar-day index: read the year/month/day of the instant *in PT*, then index it.
function ptDayIndex(when = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: PROGRAM_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(when);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return calDayIndex(get("year"), get("month"), get("day"));
}
// The cohort's LIVE position from the calendar — what drives week progression now that there's no
// manual "advance" button. Week N runs from its anchor day for 7 days; the student has `started`
// once the first class day (PT) arrives, and is `done` (graduated) the day after the final Week 12
// class. Before the cohort starts we report week 1 / not started. `now` injectable for tests.
export function coursePosition(batch, now = new Date()) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return { week: 1, started: false, done: false };
  // Anchor the start to the literal calendar date the founder set ("Sep 7, 2026") as a PT date, and
  // read "now" in PT — so neither a student's device TZ nor a UTC server can shift which week it is.
  const startIdx = calDayIndex(start.getFullYear(), start.getMonth() + 1, start.getDate());
  const offset = ptDayIndex(now) - startIdx;
  if (offset < 0) return { week: 1, started: false, done: false };
  const finalIdx = startIdx + 11 * 7 + 2; // Week 12, session 2 — the final class
  const done = ptDayIndex(now) > finalIdx;
  const week = Math.min(12, Math.floor(offset / 7) + 1);
  return { week, started: true, done };
}
// The time-of-day portion of a cohort's `day` label ("Mondays & Wednesdays · 5:00–6:30 PM PT").
export function cohortTime(batch) {
  const parts = String((batch && batch.day) || "").split("·");
  return parts.length > 1 ? parts.slice(1).join("·").trim() : "";
}
// The weekday-pair portion of a cohort's `day` label (before the "·").
export function cohortDays(batch) {
  return String((batch && batch.day) || "").split("·")[0].trim();
}

// The refund a student gets if they cancel now. Full price before the cohort starts; otherwise
// prorated by WEEKS NOT YET HELD (the Terms basis). `week` increments on each advance, so
// sessions held = week − 1 once started. The 3-week eligibility window is enforced separately
// by `canWithdraw` in Platform — this just computes the amount.
export function refundFor(batch, started, week) {
  if (!started) return batch.price;
  const unheld = 12 - (week - 1); // weeks not yet held (sim advances by week; 12-week course)
  return Math.round((batch.price * unheld) / 12);
}
// The prorated-refund window: a cancellation is only allowed during the first N weeks of class
// (plus any time before the cohort starts). Change this one number to move the window.
export const REFUND_WEEKS = 1;
// Human label for the window, singular-aware ("first week" vs "first N weeks"). Copy uses this.
export const REFUND_WINDOW = REFUND_WEEKS === 1 ? "first week" : `first ${REFUND_WEEKS} weeks`;
// Single source of truth for whether cancellation/withdrawal is offered right now. Pre-start →
// always (full refund); once started → only through the first REFUND_WEEKS course weeks.
export function canWithdrawNow(s) {
  if (!s.started) return true;
  return s.phase === "course" && s.week <= REFUND_WEEKS;
}
