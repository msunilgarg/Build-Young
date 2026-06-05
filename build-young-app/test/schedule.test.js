import { describe, it, expect } from "vitest";
import {
  toUtcMidnight, daysBetween, classDateForWeek, classISOForWeek, dueReminders, REMINDER_OFFSET,
} from "../api/_lib/schedule.js";
import { BATCHES } from "../src/cohorts.js";

// A sample cohort: fall-mw — Week 1 class is Mon Sep 7, 2026 → Week N class is +7*(N-1) days.
const MW = BATCHES.find((b) => b.id === "fall-mw");

describe("toUtcMidnight / daysBetween", () => {
  it("strips time-of-day to a stable UTC midnight", () => {
    expect(toUtcMidnight("Sep 7, 2026").toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });
  it("returns null for garbage input", () => {
    expect(toUtcMidnight("not a date")).toBeNull();
  });
  it("counts whole calendar days regardless of time-of-day", () => {
    expect(daysBetween("2026-09-09", "2026-09-12")).toBe(3);
    expect(daysBetween("2026-09-12", "2026-09-09")).toBe(-3);
    expect(daysBetween("2026-09-09", "2026-09-09")).toBe(0);
  });
});

describe("classDateForWeek", () => {
  it("Week 1 is the batch start; each week adds 7 days", () => {
    expect(classISOForWeek(MW, 1)).toBe("2026-09-07");
    expect(classISOForWeek(MW, 2)).toBe("2026-09-14");
    expect(classISOForWeek(MW, 3)).toBe("2026-09-21");
    expect(classISOForWeek(MW, 12)).toBe("2026-11-23"); // 11 weeks after start
  });
  it("rejects out-of-range weeks and unparseable starts", () => {
    expect(classDateForWeek(MW, 0)).toBeNull();
    expect(classDateForWeek(MW, 13)).toBeNull();
    expect(classDateForWeek({ start: "nope" }, 3)).toBeNull();
  });
  it("preserves the cohort's weekday across all 12 weeks", () => {
    // Sep 7, 2026 is a Monday (UTC day 1). Every weekly anchor should land on Monday.
    for (let w = 1; w <= 12; w++) {
      expect(classDateForWeek(MW, w).getUTCDay()).toBe(1);
    }
  });
});

describe("dueReminders (2 days before every weekly class)", () => {
  it("flags a cohort's week when its class is exactly REMINDER_OFFSET days out", () => {
    expect(REMINDER_OFFSET).toBe(2);
    // MW Week 1 class = Mon Sep 7, 2026 → reminder due Sat Sep 5.
    const r = dueReminders("2026-09-05", [MW]);
    expect(r).toContainEqual({ batchId: "fall-mw", week: 1 });
    // applies to later weeks too: Week 3 class = Sep 21 → reminder Sep 19.
    expect(dueReminders("2026-09-19", [MW])).toContainEqual({ batchId: "fall-mw", week: 3 });
  });
  it("handles multiple cohorts and sorts by batchId then week", () => {
    // Oct 24, 2026: fall-mw W8 (Oct 26) is exactly 2 days out; fall-tt W8 (Oct 27) is 3 days out.
    expect(dueReminders("2026-10-24", BATCHES)).toEqual([{ batchId: "fall-mw", week: 8 }]);
  });
  it("is empty when no class is 2 days out, and tolerates no batches", () => {
    expect(dueReminders("2026-09-06", [MW])).toEqual([]); // 1 day out, not 2
    expect(dueReminders("2026-09-05", [])).toEqual([]);
    expect(dueReminders("2026-09-05", undefined)).toEqual([]);
  });
});
