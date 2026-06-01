import { describe, it, expect } from "vitest";
import {
  toUtcMidnight, daysBetween, classDateForWeek, classISOForWeek, dueSends,
  MEDIA_WEEKS, DRIP_OFFSETS,
} from "../api/_lib/schedule.js";
import { BATCHES } from "../src/cohorts.js";

// A sample cohort: Week 1 class is Wed Sep 9, 2026 → Week N class is +7*(N-1) days.
const WED = BATCHES.find((b) => b.id === "fall-hs-wed");

describe("toUtcMidnight / daysBetween", () => {
  it("strips time-of-day to a stable UTC midnight", () => {
    expect(toUtcMidnight("Sep 9, 2026").toISOString()).toBe("2026-09-09T00:00:00.000Z");
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
    expect(classISOForWeek(WED, 1)).toBe("2026-09-09");
    expect(classISOForWeek(WED, 2)).toBe("2026-09-16");
    expect(classISOForWeek(WED, 3)).toBe("2026-09-23");
    expect(classISOForWeek(WED, 12)).toBe("2026-11-25"); // 11 weeks after start
  });
  it("rejects out-of-range weeks and unparseable starts", () => {
    expect(classDateForWeek(WED, 0)).toBeNull();
    expect(classDateForWeek(WED, 13)).toBeNull();
    expect(classDateForWeek({ start: "nope" }, 3)).toBeNull();
  });
  it("preserves the cohort's weekday across all 12 weeks", () => {
    // Sep 9, 2026 is a Wednesday (UTC day 3). Every weekly class should land on Wednesday.
    for (let w = 1; w <= 12; w++) {
      expect(classDateForWeek(WED, w).getUTCDay()).toBe(3);
    }
  });
});

describe("dueSends — picks the right sends for a given day", () => {
  it("emits a send when a Week 8–12 class is exactly 3 / 2 / 1 days out", () => {
    // Week 8 class for fall-hs-wed is Oct 28, 2026 (first investing week).
    expect(dueSends("2026-10-25", [WED])).toEqual([{ batchId: "fall-hs-wed", week: 8, dayOffset: 3 }]);
    expect(dueSends("2026-10-26", [WED])).toEqual([{ batchId: "fall-hs-wed", week: 8, dayOffset: 2 }]);
    expect(dueSends("2026-10-27", [WED])).toEqual([{ batchId: "fall-hs-wed", week: 8, dayOffset: 1 }]);
  });

  it("emits nothing on the class day itself or 4+ days out", () => {
    expect(dueSends("2026-10-28", [WED])).toEqual([]); // class day
    expect(dueSends("2026-10-24", [WED])).toEqual([]); // 4 days out
  });

  it("never schedules a drip for the build/setup weeks (1–7)", () => {
    // Week 7 class is Oct 21 → 3 days before is Oct 18. No sends before the investing act.
    expect(dueSends("2026-09-06", [WED])).toEqual([]); // before week 1
    expect(dueSends("2026-10-18", [WED])).toEqual([]); // 3 days before week 7
  });

  it("walks a full cohort window: every Week 8–12 class yields exactly 3 send-days", () => {
    const counts = {}; // "week:offset" -> times seen across the season
    // Scan a wide date range covering the whole fall-hs-wed run (Sep 2026 → Dec 2026).
    const start = toUtcMidnight("2026-09-01");
    const DAY = 24 * 60 * 60 * 1000;
    for (let i = 0; i < 120; i++) {
      const iso = new Date(start.getTime() + i * DAY).toISOString().slice(0, 10);
      for (const s of dueSends(iso, [WED])) {
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
    // Oct 25, 2026: fall-hs-wed W8 (Oct 28) is 3 days out, fall-ms-mon W8 (Oct 26) is 1 day
    // out, fall-ms-tue W8 (Oct 27) is 2 days out.
    const due = dueSends("2026-10-25", BATCHES);
    expect(due).toEqual([
      { batchId: "fall-hs-wed", week: 8, dayOffset: 3 },
      { batchId: "fall-ms-mon", week: 8, dayOffset: 1 },
      { batchId: "fall-ms-tue", week: 8, dayOffset: 2 },
    ]);
  });

  it("tolerates an empty / missing batch list", () => {
    expect(dueSends("2026-09-20", [])).toEqual([]);
    expect(dueSends("2026-09-20", undefined)).toEqual([]);
  });
});
