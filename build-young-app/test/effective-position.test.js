import { describe, it, expect } from "vitest";
import { effectivePosition, coursePosition } from "../src/courseDates.js";
import { sanitizeCatalog } from "../api/_lib/cohortStore.js";

// T18: the founder can manually set a cohort's progress; effectivePosition uses the override when set,
// else falls back to the calendar (so cohorts with no override behave exactly as before).
const BATCH = { id: "fall-mw", start: "Sep 7, 2026", price: 999 };
const before = new Date("2026-08-01T19:00:00Z"); // well before the cohort starts

describe("effectivePosition (manual override, else calendar)", () => {
  it("with NO override, equals the calendar coursePosition", () => {
    expect(effectivePosition(BATCH, before)).toEqual(coursePosition(BATCH, before));
    expect(effectivePosition({ ...BATCH, manualLesson: 0 }, before)).toEqual(coursePosition(BATCH, before)); // 0 = auto
  });
  it("manual lesson N overrides the calendar (started, on lesson N) even before the start date", () => {
    expect(effectivePosition({ ...BATCH, manualLesson: 5 }, before)).toEqual({ week: 5, started: true, done: false });
    // calendar alone would say not-started here:
    expect(coursePosition(BATCH, before).started).toBe(false);
  });
  it("manualLesson > total marks the cohort graduated (done)", () => {
    expect(effectivePosition({ ...BATCH, manualLesson: 13 }, before)).toEqual({ week: 12, started: true, done: true });
  });
});

describe("sanitizeCatalog clamps manualLesson (0..13)", () => {
  it("rounds + clamps, defaults to 0 (auto)", () => {
    const c = sanitizeCatalog({ batches: [
      { id: "a", start: "Sep 7, 2026", price: 999, manualLesson: 5 },
      { id: "b", start: "Sep 7, 2026", price: 999, manualLesson: 99 },
      { id: "c", start: "Sep 7, 2026", price: 999 },
    ] });
    expect(c.batches[0].manualLesson).toBe(5);
    expect(c.batches[1].manualLesson).toBe(13); // clamped
    expect(c.batches[2].manualLesson).toBe(0);  // default = auto
  });
});
