import { describe, it, expect } from "vitest";
import {
  cohortSchedule, exercisesTotalFor, coursePosition, classMeetingOn, nextClass,
  refundFor, EXERCISES_TOTAL, SESSIONS_PER_EXERCISE,
} from "../src/courseDates.js";

// The flagship cohort (no `schedule`) must behave EXACTLY as before: 12 exercises, two sessions a
// week on a day-pair → offsets [0,2, 7,9, …, 77,79].
const FLAGSHIP = { id: "fall-mw", start: "Sep 7, 2026", day: "Mondays & Wednesdays · 5:00–6:30 PM PT", price: 999 };

// An accelerated cohort: same 12 exercises / 24 sessions, packed 3 exercises (6 sessions) a week
// over ~4 weeks. Exercise e (0-based): week=floor(e/3), pos=e%3 → sessions at week*7+pos*2 and +1.
const INTENSIVE_SCHEDULE = [];
for (let e = 0; e < 12; e++) {
  const base = Math.floor(e / 3) * 7 + (e % 3) * 2;
  INTENSIVE_SCHEDULE.push(base, base + 1);
}
const INTENSIVE = { id: "fall-fast", start: "Jul 6, 2026", day: "Mon–Sat · 5:00–6:30 PM PT", price: 999, schedule: INTENSIVE_SCHEDULE };

const at = (iso) => new Date(iso); // noon-PT-ish instants for coursePosition (PT-anchored)

describe("cohortSchedule / exercisesTotalFor", () => {
  it("regenerates the exact flagship cadence when no schedule is set", () => {
    const expected = [];
    for (let w = 0; w < 12; w++) expected.push(w * 7, w * 7 + 2);
    expect(cohortSchedule(FLAGSHIP)).toEqual(expected);
    expect(cohortSchedule(FLAGSHIP)[23]).toBe(79); // final session offset
  });
  it("uses (and sorts) an explicit schedule, and ignores junk", () => {
    expect(cohortSchedule(INTENSIVE)).toEqual([...INTENSIVE_SCHEDULE].sort((a, b) => a - b));
    expect(cohortSchedule({ ...FLAGSHIP, schedule: [5, 1, "x", -3, 9] })).toEqual([1, 5, 9]);
    expect(cohortSchedule({ ...FLAGSHIP, schedule: [3] })).toEqual(cohortSchedule(FLAGSHIP)); // <2 valid → default
  });
  it("always 12 exercises (the invariant), at either pace", () => {
    expect(EXERCISES_TOTAL).toBe(12);
    expect(SESSIONS_PER_EXERCISE).toBe(2);
    expect(exercisesTotalFor(FLAGSHIP)).toBe(12);
    expect(exercisesTotalFor(INTENSIVE)).toBe(12);
  });
});

describe("coursePosition — accelerated cohort progresses faster on the calendar", () => {
  it("before start → exercise 1, not started", () => {
    expect(coursePosition(INTENSIVE, at("2026-07-01T19:00:00Z"))).toEqual({ week: 1, started: false, done: false });
  });
  it("on the start day → started, exercise 1", () => {
    expect(coursePosition(INTENSIVE, at("2026-07-06T19:00:00Z"))).toEqual({ week: 1, started: true, done: false });
  });
  it("+7 days is exercise 4 (vs exercise 2 for the flagship) — same date, faster pace", () => {
    expect(coursePosition(INTENSIVE, at("2026-07-13T19:00:00Z")).week).toBe(4);
    expect(coursePosition(FLAGSHIP, at("2026-09-14T19:00:00Z")).week).toBe(2); // invariance check
  });
  it("caps at exercise 12 and graduates the day after the final session", () => {
    expect(coursePosition(INTENSIVE, at("2026-08-01T19:00:00Z"))).toMatchObject({ week: 12, done: false }); // last session = +26d
    expect(coursePosition(INTENSIVE, at("2026-08-02T19:00:00Z")).done).toBe(true);
  });
});

describe("classMeetingOn / nextClass follow the cohort's real schedule", () => {
  it("maps a scheduled day to its exercise + session", () => {
    // +7 days = offset 7 = the 7th session (index 6) = exercise 4, session 1.
    expect(classMeetingOn(INTENSIVE, new Date(2026, 6, 13))).toEqual({ week: 4, session: 1 });
    expect(classMeetingOn(INTENSIVE, new Date(2026, 6, 12))).toBe(null); // +6 days isn't a session here
  });
  it("nextClass before start is the first session", () => {
    expect(nextClass(INTENSIVE, new Date(2026, 6, 1))).toMatchObject({ week: 1, session: 1 });
  });
});

describe("refundFor prorates over the cohort's own total (12 exercises either way)", () => {
  it("matches the flagship math because both have 12 exercises", () => {
    expect(refundFor(INTENSIVE, false, 1)).toBe(999); // full before start
    expect(refundFor(INTENSIVE, true, 3)).toBe(Math.round((999 * 10) / 12)); // 2 held, 10 unheld → $833
    expect(refundFor(INTENSIVE, true, 3)).toBe(refundFor(FLAGSHIP, true, 3));
  });
});
