import { describe, it, expect } from "vitest";
import {
  cohortLessons, lessonsTotalFor, coursePosition, classMeetingOn, nextClass,
  refundFor, LESSONS_TOTAL, HOURS_PER_LESSON,
} from "../src/courseDates.js";

// The flagship cohort (no `lessons`) must behave EXACTLY as before: 12 lessons, two 90-min sittings a
// week on a day-pair → [[0,2],[7,9], …, [77,79]].
const FLAGSHIP = { id: "fall-mw", start: "Sep 7, 2026", day: "Mondays & Wednesdays · 5:00–6:30 PM PT", price: 999 };

// An accelerated cohort: same 12 lessons, packed 3 lessons a week over ~4 weeks. Lesson e (0-based):
// week=floor(e/3), pos=e%3 → two sittings at week*7+pos*2 and +1.
const INTENSIVE_LESSONS = [];
for (let e = 0; e < 12; e++) {
  const base = Math.floor(e / 3) * 7 + (e % 3) * 2;
  INTENSIVE_LESSONS.push([base, base + 1]);
}
const INTENSIVE = { id: "fall-fast", start: "Jul 6, 2026", day: "Mon–Sat · 5:00–6:30 PM PT", price: 999, lessons: INTENSIVE_LESSONS };

const at = (iso) => new Date(iso); // noon-PT-ish instants for coursePosition (PT-anchored)

describe("cohortLessons / lessonsTotalFor", () => {
  it("regenerates the exact flagship cadence when no schedule is set", () => {
    const expected = [];
    for (let i = 0; i < 12; i++) expected.push([i * 7, i * 7 + 2]);
    expect(cohortLessons(FLAGSHIP)).toEqual(expected);
  });
  it("uses (and sorts/cleans) an explicit `lessons` schedule, ignoring junk", () => {
    expect(cohortLessons(INTENSIVE)).toEqual(INTENSIVE_LESSONS);
    expect(cohortLessons({ ...FLAGSHIP, lessons: [[5, 1, "x", -3]] })).toEqual([[1, 5]]); // cleaned + sorted
    expect(cohortLessons({ ...FLAGSHIP, lessons: [] })).toEqual(cohortLessons(FLAGSHIP)); // empty → default
  });
  it("always 12 lessons (the invariant), at either pace; 3 hrs each", () => {
    expect(LESSONS_TOTAL).toBe(12);
    expect(HOURS_PER_LESSON).toBe(3);
    expect(lessonsTotalFor(FLAGSHIP)).toBe(12);
    expect(lessonsTotalFor(INTENSIVE)).toBe(12);
  });
  it("supports a FLEXIBLE (non-2) sitting count per lesson", () => {
    const odd = { ...FLAGSHIP, lessons: [[0], [3, 4, 5], [10, 11]] }; // 1, 3, 2 sittings
    expect(lessonsTotalFor(odd)).toBe(3);
    expect(classMeetingOn(odd, new Date(2026, 8, 7))).toEqual({ week: 1, session: 1 }); // offset 0
    expect(classMeetingOn(odd, new Date(2026, 8, 12))).toEqual({ week: 2, session: 3 }); // offset 5 = lesson 2, 3rd sitting
    expect(classMeetingOn(odd, new Date(2026, 8, 18))).toEqual({ week: 3, session: 2 }); // offset 11
  });
});

describe("coursePosition — accelerated cohort progresses faster on the calendar", () => {
  it("before start → lesson 1, not started", () => {
    expect(coursePosition(INTENSIVE, at("2026-07-01T19:00:00Z"))).toEqual({ week: 1, started: false, done: false });
  });
  it("on the start day → started, lesson 1", () => {
    expect(coursePosition(INTENSIVE, at("2026-07-06T19:00:00Z"))).toEqual({ week: 1, started: true, done: false });
  });
  it("+7 days is lesson 4 (vs lesson 2 for the flagship) — same date, faster pace", () => {
    expect(coursePosition(INTENSIVE, at("2026-07-13T19:00:00Z")).week).toBe(4);
    expect(coursePosition(FLAGSHIP, at("2026-09-14T19:00:00Z")).week).toBe(2); // invariance check
  });
  it("caps at lesson 12 and graduates the day after the final sitting", () => {
    expect(coursePosition(INTENSIVE, at("2026-08-01T19:00:00Z"))).toMatchObject({ week: 12, done: false }); // last sitting = +26d
    expect(coursePosition(INTENSIVE, at("2026-08-02T19:00:00Z")).done).toBe(true);
  });
});

describe("classMeetingOn / nextClass follow the cohort's real schedule", () => {
  it("maps a scheduled day to its lesson + sitting", () => {
    // +7 days = offset 7 = lesson 4's first sitting.
    expect(classMeetingOn(INTENSIVE, new Date(2026, 6, 13))).toEqual({ week: 4, session: 1 });
    expect(classMeetingOn(INTENSIVE, new Date(2026, 6, 12))).toBe(null); // +6 days isn't a sitting here
  });
  it("nextClass before start is the first sitting", () => {
    expect(nextClass(INTENSIVE, new Date(2026, 6, 1))).toMatchObject({ week: 1, session: 1 });
  });
});

describe("refundFor — flat rule, same for any pace (full before start · 75% first lesson · 0 after)", () => {
  it("is full before start, a flat 75% in lesson 1, and 0 after — identical for intensive and flagship", () => {
    expect(refundFor(INTENSIVE, false, 1)).toBe(999);                 // full before start
    expect(refundFor(INTENSIVE, true, 1)).toBe(Math.round(999 * 0.75)); // flat 75% within the window
    expect(refundFor(INTENSIVE, true, 3)).toBe(0);                    // past the window → non-refundable
    expect(refundFor(INTENSIVE, true, 1)).toBe(refundFor(FLAGSHIP, true, 1)); // pace-independent
  });
});
