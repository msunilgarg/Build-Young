import { describe, it, expect } from "vitest";
import { catalogSeasons, seasonLabel, SEASONS } from "../src/cohorts.js";

// A founder-created cohort in a season that isn't predefined (e.g. "summer") must surface in the
// landing tabs + enroll dropdown — year-labeled and in chronological order (the bug: only the hardcoded
// SEASONS rendered, and a catalog season had no year + sorted last).
describe("catalogSeasons / seasonLabel — custom seasons surface, year-labeled, chronological", () => {
  it("includes a catalog-only season, labels it with the year, and orders it by earliest start", () => {
    const out = catalogSeasons([{ id: "summer-1", season: "summer", start: "Aug 10, 2026" }]);
    const summer = out.find((s) => s.key === "summer");
    expect(summer).toBeTruthy();
    expect(summer.label).toBe("Summer 2026"); // title-case + year from its earliest cohort
    // Summer has a real date (Aug 2026); the predefined fall/winter/spring have no cohorts here → ∞,
    // so Summer sorts FIRST, then the predefined seasons keep their order.
    expect(out.map((s) => s.key)).toEqual(["summer", ...SEASONS.map((s) => s.key)]);
  });
  it("orders seasons chronologically by earliest cohort start (Aug before Sep)", () => {
    const out = catalogSeasons([
      { id: "f", season: "fall", start: "Sep 7, 2026" },
      { id: "s", season: "summer", start: "Aug 10, 2026" },
    ]);
    // summer (Aug) before fall (Sep); winter/spring (no cohort) last
    expect(out.map((s) => s.key)).toEqual(["summer", "fall", "winter", "spring"]);
  });
  it("doesn't duplicate a predefined season; empty/blank → predefined order", () => {
    expect(catalogSeasons([{ id: "f", season: "fall" }]).filter((s) => s.key === "fall")).toHaveLength(1);
    expect(catalogSeasons([]).map((s) => s.key)).toEqual(SEASONS.map((s) => s.key));
    expect(catalogSeasons(undefined).length).toBe(SEASONS.length);
  });
  it("seasonLabel falls back to a title-cased key (the year is added by catalogSeasons)", () => {
    expect(seasonLabel("summer")).toBe("Summer");
    expect(seasonLabel("fall")).toBe("Fall 2026"); // predefined label unchanged
  });
});
