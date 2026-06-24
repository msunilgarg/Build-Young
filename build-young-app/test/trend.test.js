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
    expect(t.map((p) => p.label)).toEqual(["Jun 8-14", "Jun 15-21"]);
  });
  it("respects the chosen metric (enrolled)", () => {
    const evs = [visited("2026-06-09T12:00:00Z"), enrolled("2026-06-09T13:00:00Z")];
    expect(weeklyTrend(evs, { metric: "enrolled" })).toEqual([{ label: "Jun 8-14", value: 1 }]);
  });
  it("TREND_METRICS exposes the selectable metrics; empty input → empty", () => {
    expect(TREND_METRICS.map((m) => m.key)).toEqual(expect.arrayContaining(["visited", "enrolled", "conv", "net"]));
    expect(weeklyTrend([], { metric: "visited" })).toEqual([]);
    expect(monthsIn([])).toEqual([]);
  });
  it("month scope enumerates the whole month's weeks (zeros included), with range labels — once the month is past", () => {
    const evs = [visited("2026-06-09T12:00:00Z"), visited("2026-06-10T12:00:00Z"), visited("2026-06-15T12:00:00Z")];
    // `now` after the month → every June week has started, so the full month renders (incl. zero weeks).
    const t2 = weeklyTrend(evs, { metric: "visited", month: "2026-06", now: T("2026-08-01T00:00:00Z") });
    expect(t2.map((p) => p.label)).toEqual(["Jun 1-7", "Jun 8-14", "Jun 15-21", "Jun 22-28", "Jun 29-Jul 5"]);
    expect(t2.map((p) => p.value)).toEqual([0, 2, 1, 0, 0]);
  });
  it("drops weeks that haven't started yet — no misleading nosedive to 0 for a future week (mid-month)", () => {
    const evs = [visited("2026-06-15T12:00:00Z"), visited("2026-06-23T12:00:00Z")];
    // mid-month (now = Jun 24): the current week (Jun 22-28) shows; the not-yet-started Jun 29-Jul 5 is dropped.
    const t = weeklyTrend(evs, { metric: "visited", month: "2026-06", now: T("2026-06-24T12:00:00Z") });
    expect(t.map((p) => p.label)).toEqual(["Jun 1-7", "Jun 8-14", "Jun 15-21", "Jun 22-28"]);
    expect(t.map((p) => p.value)).toEqual([0, 0, 1, 1]);
    expect(t[t.length - 1].label).not.toMatch(/Jun 29/); // the future week is gone — the line ends at the current week
  });
});
