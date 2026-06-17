import { describe, it, expect } from "vitest";
import { buildLessonSchedule, cohortLessons, coursePosition, lessonsTotalFor } from "../src/courseDates.js";
import { sanitizeCatalog } from "../api/_lib/cohortStore.js";

// T21: the founder console builds a cohort's `lessons` schedule from pace inputs via buildLessonSchedule.
describe("buildLessonSchedule (founder pace builder)", () => {
  it("at the defaults (1 lesson/week, 2 sittings) reproduces the flagship cadence exactly", () => {
    expect(buildLessonSchedule()).toEqual(cohortLessons({})); // [[0,2],[7,9], …, [77,79]]
    expect(buildLessonSchedule({ lessonsPerWeek: 1, sittingsPerLesson: 2 })[11]).toEqual([77, 79]);
  });
  it("builds an accelerated schedule: 12 lessons, strictly ascending offsets, finishes sooner", () => {
    const fast = buildLessonSchedule({ lessonsPerWeek: 3, sittingsPerLesson: 1 });
    expect(fast).toHaveLength(12);
    const flat = fast.flat();
    expect(flat).toEqual([...flat].sort((a, b) => a - b)); // strictly ascending, no collisions
    expect(new Set(flat).size).toBe(flat.length);
    // last sitting is far sooner than the flagship's day 79
    expect(fast[11][fast[11].length - 1]).toBeLessThan(79);
  });
  it("drives faster progression when attached to a cohort", () => {
    const intensive = { id: "x", start: "Jul 6, 2026", price: 999, lessons: buildLessonSchedule({ lessonsPerWeek: 3, sittingsPerLesson: 2 }) };
    expect(lessonsTotalFor(intensive)).toBe(12);
    // +7 calendar days → already past lesson 2 (vs exactly lesson 2 for the weekly flagship)
    expect(coursePosition(intensive, new Date("2026-07-13T19:00:00Z")).week).toBeGreaterThan(2);
  });
  it("round-trips through the server sanitizer (sanitizeCatalog keeps a valid `lessons`)", () => {
    const lessons = buildLessonSchedule({ lessonsPerWeek: 2, sittingsPerLesson: 2 });
    const clean = sanitizeCatalog({ batches: [{ id: "fast", start: "Jul 6, 2026", price: 999, lessons }] });
    expect(clean.batches[0].lessons).toEqual(lessons);
    // a cohort WITHOUT lessons stays on the flagship default (no `lessons` key)
    const plain = sanitizeCatalog({ batches: [{ id: "std", start: "Sep 7, 2026", price: 999 }] });
    expect(plain.batches[0].lessons).toBeUndefined();
  });
});
