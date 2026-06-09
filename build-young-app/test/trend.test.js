import { describe, it, expect } from "vitest";
import { monthsIn, eventsInMonth, weeklyTrend, TREND_METRICS } from "../src/funnel.js";

const T = (iso) => new Date(iso).getTime();
const visited = (iso) => ({ event: "visited", ts: T(iso), props: { source: "direct" } });
const enrolled = (iso) => ({ event: "enrolled", ts: T(iso), props: { batchId: "fall-mw", season: "fall", track: "Builders", priceCents: 99900 } });

describe("funnel time-slicing (month scope + weekly trend)", () => {
  it("monthsIn lists distinct calendar months oldest→newest", () => {
    const ms = monthsIn([visited("2026-06-10T12:00:00Z"), visited("2026-07-02T00:00:00Z"), visited("2026-06-30T23:00:00Z")]);
    expect(ms.map((m) => m.key)).toEqual(["2026-06", "2026-07"]);
    expect(ms[0].label).toBe("Jun 2026");
  });
  it("eventsInMonth scopes to a month; 'all' returns everything", () => {
    const evs = [visited("2026-06-10T12:00:00Z"), visited("2026-07-02T00:00:00Z")];
    expect(eventsInMonth(evs, "2026-06")).toHaveLength(1);
    expect(eventsInMonth(evs, "all")).toHaveLength(2);
  });
  it("weeklyTrend buckets by Monday-start week, oldest→newest (Jun 8 2026 is a Monday)", () => {
    const evs = [visited("2026-06-09T12:00:00Z"), visited("2026-06-10T12:00:00Z"), visited("2026-06-15T12:00:00Z")];
    const t = weeklyTrend(evs, { metric: "visited" });
    expect(t.map((p) => p.value)).toEqual([2, 1]);
    expect(t.map((p) => p.label)).toEqual(["Jun 8", "Jun 15"]);
  });
  it("respects the chosen metric (enrolled)", () => {
    const evs = [visited("2026-06-09T12:00:00Z"), enrolled("2026-06-09T13:00:00Z")];
    expect(weeklyTrend(evs, { metric: "enrolled" })).toEqual([{ label: "Jun 8", value: 1 }]);
  });
  it("TREND_METRICS exposes the selectable metrics; empty input → empty", () => {
    expect(TREND_METRICS.map((m) => m.key)).toEqual(expect.arrayContaining(["visited", "enrolled", "conv", "net"]));
    expect(weeklyTrend([], { metric: "visited" })).toEqual([]);
    expect(monthsIn([])).toEqual([]);
  });
});
