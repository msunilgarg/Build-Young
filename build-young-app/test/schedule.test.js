import { describe, it, expect } from "vitest";
import {
  toUtcMidnight, daysBetween, classDateForWeek, classISOForWeek, dueSends, dueReminders,
  MEDIA_WEEKS, DRIP_OFFSETS, REMINDER_OFFSET,
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

describe("dueSends — picks the right sends for a given day", () => {
  it("emits a send when a Week 8–12 class is exactly 3 / 2 / 1 days out", () => {
    // Week 8 class for fall-mw is Oct 26, 2026 (first investing week).
    expect(dueSends("2026-10-23", [MW])).toEqual([{ batchId: "fall-mw", week: 8, dayOffset: 3 }]);
    expect(dueSends("2026-10-24", [MW])).toEqual([{ batchId: "fall-mw", week: 8, dayOffset: 2 }]);
    expect(dueSends("2026-10-25", [MW])).toEqual([{ batchId: "fall-mw", week: 8, dayOffset: 1 }]);
  });

  it("emits nothing on the class day itself or 4+ days out", () => {
    expect(dueSends("2026-10-26", [MW])).toEqual([]); // class day
    expect(dueSends("2026-10-22", [MW])).toEqual([]); // 4 days out
  });

  it("never schedules a drip for the build/setup weeks (1–7)", () => {
    // Week 7 class is Oct 19 → 3 days before is Oct 16. No sends before the investing act.
    expect(dueSends("2026-09-04", [MW])).toEqual([]); // before week 1
    expect(dueSends("2026-10-16", [MW])).toEqual([]); // 3 days before week 7
  });

  it("walks a full cohort window: every Week 8–12 class yields exactly 3 send-days", () => {
    const counts = {}; // "week:offset" -> times seen across the season
    // Scan a wide date range covering the whole fall-mw run (Sep 2026 → Dec 2026).
    const start = toUtcMidnight("2026-09-01");
    const DAY = 24 * 60 * 60 * 1000;
    for (let i = 0; i < 120; i++) {
      const iso = new Date(start.getTime() + i * DAY).toISOString().slice(0, 10);
      for (const s of dueSends(iso, [MW])) {
        const k = `${s.week}:${s.dayOffset}`;
        counts[k] = (counts[k] || 0) + 1;
        expect(DRIP_OFFSETS).toContain(s.dayOffset);
        expect(s.week).toBeGreaterThanOrEqual(MEDIA_WEEKS.first);
        expect(s.week).toBeLessThanOrEqual(MEDIA_WEEKS.last);
      }
    }
    // Weeks 8..12 (5 weeks) × offsets {3,2,1} = 15 distinct (week,offset) send-days, each once.
    expect(Object.keys(counts)).toHaveLength(15);
    for (const k of Object.keys(counts)) expect(counts[k]).toBe(1);
  });

  it("handles multiple cohorts on one day and sorts deterministically", () => {
    // Oct 24, 2026: fall-mw W8 (Oct 26) is 2 days out; fall-tt W8 (Oct 27) is 3 days out.
    const due = dueSends("2026-10-24", BATCHES);
    expect(due).toEqual([
      { batchId: "fall-mw", week: 8, dayOffset: 2 },
      { batchId: "fall-tt", week: 8, dayOffset: 3 },
    ]);
  });

  it("tolerates an empty / missing batch list", () => {
    expect(dueSends("2026-09-20", [])).toEqual([]);
    expect(dueSends("2026-09-20", undefined)).toEqual([]);
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
  it("is empty when no class is 2 days out, and tolerates no batches", () => {
    expect(dueReminders("2026-09-06", [MW])).toEqual([]); // 1 day out, not 2
    expect(dueReminders("2026-09-05", [])).toEqual([]);
  });
});
