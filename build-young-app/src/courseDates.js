// Pure course-calendar + refund math — no React, no app state, no design system. Every function
// takes the cohort/state as a parameter, so it's safe to share across the app, the cron, and
// tests. Extracted from App.jsx (which imports + re-exports these for back-compat). Covered by
// test/engine.test.js + test/course-pace.test.js.

// --- Pace model (the unit is the 3-hour LESSON; sitting cadence is flexible) -------------------
// The course is ALWAYS 12 lessons (= 36 hrs), each a 3-hour block of learning — that's invariant
// across cohorts. What VARIES per cohort is (a) how fast the lessons land on the calendar and (b)
// how each lesson's 3 hrs is split into live SITTINGS (students can't sit 3 hrs straight, but the
// split isn't fixed: the flagship uses two 90-min sittings a week; an accelerated cohort may use one
// 3-hr slot or several short ones). A cohort encodes its pace with an optional `lessons` array — one
// entry per lesson, each an ascending list of that lesson's sitting DAY-OFFSETS from `start`. When
// absent, we regenerate the flagship cadence ([[0,2],[7,9], …, [77,79]]), so every existing cohort
// behaves EXACTLY as before. This is the one place sittings map to dates; everything else derives
// from it, so the same 12-lesson curriculum/cert runs unchanged at any pace.
export const LESSONS_TOTAL = 12;     // 12 lessons = 36 hrs — invariant for the standard course
export const HOURS_PER_LESSON = 3;   // each lesson is a 3-hour block of learning
// The cohort's lessons, as an array (one per lesson) of that lesson's sitting day-offsets, ascending.
// Custom `lessons` wins; else the flagship default (12 lessons × two sittings/week on a day-pair).
export function cohortLessons(batch) {
  const custom = batch && Array.isArray(batch.lessons) ? batch.lessons : null;
  if (custom) {
    const clean = custom
      .map((sits) => (Array.isArray(sits) ? sits.filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b) : []))
      .filter((sits) => sits.length > 0);
    if (clean.length) return clean;
  }
  const out = [];
  for (let i = 0; i < LESSONS_TOTAL; i++) out.push([i * 7, i * 7 + 2]);
  return out;
}
// How many lessons this cohort delivers (12 for the standard schedule; ≥ 1).
export function lessonsTotalFor(batch) {
  return Math.max(1, cohortLessons(batch).length);
}
// Build a `lessons` schedule from founder-friendly pace inputs (used by the cohort editor) — the
// inverse of cohortLessons. Lays the 12 lessons at a fixed stride and spaces each lesson's sittings
// `gapDays` apart; the stride is the larger of "fit `lessonsPerWeek` into 7 days" and "the span a
// lesson's own sittings need" (so offsets stay strictly ascending — no collisions). At the defaults
// (1 lesson/week, 2 sittings) it reproduces the flagship `[[0,2],[7,9], …, [77,79]]` exactly.
export function buildLessonSchedule({ lessonsPerWeek = 1, sittingsPerLesson = 2, gapDays = 2 } = {}) {
  const lpw = Math.max(1, Math.round(lessonsPerWeek));
  const spl = Math.max(1, Math.round(sittingsPerLesson));
  const gap = Math.max(1, Math.round(gapDays));
  const span = (spl - 1) * gap;                       // days a lesson's sittings span
  const stride = Math.max(Math.ceil(7 / lpw), span + 1); // days between lesson starts (no overlap)
  const out = [];
  for (let i = 0; i < LESSONS_TOTAL; i++) {
    const base = i * stride;
    out.push(Array.from({ length: spl }, (_, s) => base + s * gap));
  }
  return out;
}
// Every sitting, flattened + ascending, tagged with its lesson (1-based) and session (1-based within
// the lesson). The single source the calendar/progression helpers iterate.
function allSittings(batch) {
  const out = [];
  cohortLessons(batch).forEach((sits, li) => sits.forEach((off, si) => out.push({ week: li + 1, session: si + 1, offset: off })));
  return out.sort((a, b) => a.offset - b.offset);
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
  const lessons = cohortLessons(batch);
  const lastLesson = lessons[lessons.length - 1];
  const lastOffset = lastLesson[lastLesson.length - 1]; // last sitting of the last lesson
  const numWeeks = Math.floor(lastOffset / 7) + 1; // calendar weeks the course spans
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
  const sits = cohortLessons(batch)[week - 1]; // this lesson's sittings
  if (!sits) return batch.day;
  const d = new Date(start.getTime() + sits[0] * 24 * 60 * 60 * 1000); // the lesson's first sitting
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
  const sits = cohortLessons(batch)[week - 1]; // this lesson's sittings
  if (!sits) return "";
  const d = new Date(start.getTime() + sits[0] * 24 * 60 * 60 * 1000); // the lesson's first sitting
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
// A cohort delivers 12 lessons as live sittings placed by its `lessons` schedule (per-lesson sitting
// day-offsets from `start`); the flagship default is two sittings/week on a day-pair (offsets 7w and
// 7w+2). So the whole-day offset from `start`, found among a lesson's sittings, tells us the lesson +
// session. (`week`/`session` keep their names for back-compat: `week` = lesson number.)
export const dayNum = (d) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
// Does this cohort meet on `day`? → { week, session } or null (before start / not a scheduled day).
export function classMeetingOn(batch, day = new Date()) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return null;
  const offset = dayNum(day) - dayNum(start);
  if (offset < 0) return null;
  const lessons = cohortLessons(batch);
  for (let li = 0; li < lessons.length; li++) {
    const si = lessons[li].indexOf(offset);
    if (si >= 0) return { week: li + 1, session: si + 1 };
  }
  return null;
}
// The cohort's date for lesson N's sitting `session` (a Date), for "next class" lookups.
export function sessionDate(batch, week, session) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return null;
  const sits = cohortLessons(batch)[week - 1];
  if (!sits || session < 1 || session > sits.length) return null;
  return new Date((dayNum(start) + sits[session - 1]) * 86400000);
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
// The next sitting strictly on/after `day` → { week, session, date } or null if the course is done.
export function nextClass(batch, day = new Date()) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return null;
  const today = dayNum(day);
  const base = dayNum(start);
  for (const s of allSittings(batch)) {
    if (base + s.offset >= today) return { week: s.week, session: s.session, date: new Date((base + s.offset) * 86400000) };
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
// The cohort's LIVE position from the calendar — what drives lesson progression now that there's no
// manual "advance" button. The current lesson is the number whose FIRST sitting day (PT) has arrived;
// the student has `started` once that first sitting day arrives, and is `done` (graduated) the day
// after the final scheduled sitting. Derived from the cohort's own `lessons` schedule, so it's
// correct at any pace (flagship weekly OR accelerated). Before the cohort starts we report lesson
// 1 / not started. (`week` in the return keeps its name for back-compat = lesson number.) `now`
// injectable for tests.
export function coursePosition(batch, now = new Date()) {
  const start = batch && batch.start ? new Date(batch.start) : null;
  if (!start || isNaN(start.getTime())) return { week: 1, started: false, done: false };
  // Anchor the start to the literal calendar date the founder set ("Sep 7, 2026") as a PT date, and
  // read "now" in PT — so neither a student's device TZ nor a UTC server can shift which lesson it is.
  const startIdx = calDayIndex(start.getFullYear(), start.getMonth() + 1, start.getDate());
  const offset = ptDayIndex(now) - startIdx;
  if (offset < 0) return { week: 1, started: false, done: false };
  const lessons = cohortLessons(batch);
  const lastOffset = Math.max(...lessons.map((sits) => sits[sits.length - 1])); // final sitting
  const done = offset > lastOffset; // day after the final scheduled sitting
  // Current lesson = count of lessons whose FIRST sitting offset has been reached.
  let week = 0;
  for (const sits of lessons) if (sits[0] <= offset) week++;
  return { week: Math.min(lessons.length, Math.max(1, week)), started: true, done };
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

// The refund a student gets if they cancel now — a SIMPLE flat rule (no proration):
//   • before the cohort starts → FULL price;
//   • started, within the first-week window (`week` = lesson number ≤ REFUND_WEEKS) → flat REFUND_RATE (75%);
//   • after that → 0 (non-refundable).
// The eligibility window is also enforced by `canWithdrawNow` (the withdraw UI only shows when eligible);
// this returns the amount. Flat-rate by the founder's call — simpler than per-hour proration.
export const REFUND_RATE = 0.75; // flat refund for cancelling within the first week
export function refundFor(batch, started, week) {
  if (!started) return batch.price;
  if (week <= REFUND_WEEKS) return Math.round(batch.price * REFUND_RATE);
  return 0;
}
// The refund-eligibility window: a cancellation is only allowed during the first N weeks of class
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
