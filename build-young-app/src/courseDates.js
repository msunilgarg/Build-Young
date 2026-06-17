// Pure course-calendar + refund math — no React, no app state, no design system. Every function
// takes the cohort/state as a parameter, so it's safe to share across the app, the cron, and
// tests. Extracted from App.jsx (which imports + re-exports these for back-compat). Covered by
// test/engine.test.js + test/course-pace.test.js.

// --- Pace model (the unit is the 3-hour EXERCISE, not the calendar week) -----------------------
// The course is ALWAYS 12 exercises (= 36 hrs), each delivered as two ~90-min live sessions — that's
// invariant across cohorts. What VARIES per cohort is how fast those sessions land on the calendar:
// the flagship runs 1 exercise/week (the historical 12-week, twice-a-week cadence); an accelerated
// cohort packs several exercises into a week. A cohort encodes its pace with an optional `schedule`
// — an ascending array of integer DAY-OFFSETS from `start`, one per live session. When absent, we
// regenerate the flagship cadence (offsets 7w and 7w+2 for week w), so every existing cohort behaves
// EXACTLY as before. This is the one place a session is mapped to a date; everything else derives
// from it, so the same 12-exercise curriculum/cert runs unchanged at any pace.
export const EXERCISES_TOTAL = 12;       // 12 exercises = 36 hrs — invariant for the standard course
export const SESSIONS_PER_EXERCISE = 2;  // one 3-hr exercise = two ~90-min live sessions
// The cohort's session day-offsets (from `start`), ascending. Custom `schedule` wins; else the
// flagship default (12 exercises × two sessions/week on a day-pair): [0,2, 7,9, 14,16, …, 77,79].
export function cohortSchedule(batch) {
  const custom = batch && Array.isArray(batch.schedule)
    ? batch.schedule.filter((n) => Number.isFinite(n) && n >= 0)
    : null;
  if (custom && custom.length >= SESSIONS_PER_EXERCISE) return [...custom].sort((a, b) => a - b);
  const out = [];
  for (let w = 0; w < EXERCISES_TOTAL; w++) { out.push(w * 7); out.push(w * 7 + 2); }
  return out;
}
// How many exercises this cohort delivers (12 for the standard schedule; derived so a custom
// schedule stays self-consistent). Always ≥ 1.
export function exercisesTotalFor(batch) {
  return Math.max(1, Math.floor(cohortSchedule(batch).length / SESSIONS_PER_EXERCISE));
}
// Day-offset (from `start`) of a given exercise's session, or null if out of range.
function sessionOffset(sched, week, session) {
  const i = (week - 1) * SESSIONS_PER_EXERCISE + (session - 1);
  return i >= 0 && i < sched.length ? sched[i] : null;
}

export const CHECKIN_TIME = "5:00–6:00 PM PT"; // 60-minute follow-up check-in (the week after the course)
// The check-in is ONE MONTH after the cohort's final (Week 12) class, kept on the cohort's
// usual weekday (the same weekday it started/meets). Returns a label like
// "Mon, Dec 28, 2026 · 5:00–6:00 PM PT", or "" if the start is unparseable.
export function checkinDateLabel(batch) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return "";
  // The follow-up check-in is the WEEK AFTER the course's final session — one week past the last
  // scheduled class — naturally on the cohort's usual weekday. Derived from the cohort's own
  // schedule so it's correct at any pace; for the flagship cadence this is start + 12 weeks.
  const sched = cohortSchedule(batch);
  const numWeeks = Math.floor(sched[sched.length - 1] / 7) + 1; // calendar weeks the course spans
  const d = new Date(start.getTime() + numWeeks * 7 * 24 * 60 * 60 * 1000);
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
  const off = sessionOffset(cohortSchedule(batch), week, 1); // the week's first session
  if (off == null) return batch.day;
  const d = new Date(start.getTime() + off * 24 * 60 * 60 * 1000);
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
  const off = sessionOffset(cohortSchedule(batch), week, 1); // the week's first session
  if (off == null) return "";
  const d = new Date(start.getTime() + off * 24 * 60 * 60 * 1000);
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
// A cohort delivers 12 exercises as live sessions placed by its `schedule` (day-offsets from
// `start`); the flagship default is two sessions/week on a day-pair (offsets 7w and 7w+2). So the
// whole-day offset from `start`, looked up in that schedule, tells us the exercise + session.
export const dayNum = (d) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
// Does this cohort meet on `day`? → { week, session } or null (before start / not a scheduled day).
export function classMeetingOn(batch, day = new Date()) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return null;
  const offset = dayNum(day) - dayNum(start);
  if (offset < 0) return null;
  const i = cohortSchedule(batch).indexOf(offset);
  if (i < 0) return null;
  return { week: Math.floor(i / SESSIONS_PER_EXERCISE) + 1, session: (i % SESSIONS_PER_EXERCISE) + 1 };
}
// The cohort's date for exercise N, session 1 or 2 (a Date), for "next class" lookups.
export function sessionDate(batch, week, session) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return null;
  const off = sessionOffset(cohortSchedule(batch), week, session);
  if (off == null) return null;
  return new Date((dayNum(start) + off) * 86400000);
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
  const total = exercisesTotalFor(batch);
  for (let w = 1; w <= total; w++) {
    for (let sess = 1; sess <= SESSIONS_PER_EXERCISE; sess++) {
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
// The cohort's LIVE position from the calendar — what drives exercise progression now that there's
// no manual "advance" button. The current exercise is the number whose first session day (PT) has
// arrived; the student has `started` once the first session day arrives, and is `done` (graduated)
// the day after the final scheduled session. Derived from the cohort's own `schedule`, so it's
// correct at any pace (flagship weekly OR accelerated). Before the cohort starts we report exercise
// 1 / not started. `now` injectable for tests.
export function coursePosition(batch, now = new Date()) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return { week: 1, started: false, done: false };
  // Anchor the start to the literal calendar date the founder set ("Sep 7, 2026") as a PT date, and
  // read "now" in PT — so neither a student's device TZ nor a UTC server can shift which week it is.
  const startIdx = calDayIndex(start.getFullYear(), start.getMonth() + 1, start.getDate());
  const offset = ptDayIndex(now) - startIdx;
  if (offset < 0) return { week: 1, started: false, done: false };
  const sched = cohortSchedule(batch);
  const total = exercisesTotalFor(batch);
  const done = offset > sched[sched.length - 1]; // day after the final scheduled session
  // Current exercise = count of exercises whose FIRST session offset has been reached.
  let week = 0;
  for (let i = 0; i < sched.length; i += SESSIONS_PER_EXERCISE) if (sched[i] <= offset) week++;
  return { week: Math.min(total, Math.max(1, week)), started: true, done };
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
// prorated by EXERCISES NOT YET HELD (the Terms basis). `week` increments on each advance, so
// exercises held = week − 1 once started. Prorated over the cohort's own total (12 for the standard
// course). The eligibility window is enforced separately by `canWithdraw` in Platform — this just
// computes the amount.
export function refundFor(batch, started, week) {
  if (!started) return batch.price;
  const total = exercisesTotalFor(batch);
  const unheld = total - (week - 1); // exercises not yet held
  return Math.round((batch.price * unheld) / total);
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
