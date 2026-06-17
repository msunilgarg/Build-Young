import { describe, it, expect } from "vitest";
import { catalogSeasons, seasonLabel, SEASONS } from "../src/cohorts.js";

// A founder-created cohort in a season that isn't predefined (e.g. "summer") must still surface in the
// landing tabs + enroll dropdown — otherwise it's orphaned (the bug: only hardcoded SEASONS rendered).
describe("catalogSeasons / seasonLabel — custom seasons surface", () => {
  it("includes a catalog season key not in the predefined SEASONS", () => {
    const out = catalogSeasons([{ id: "summer-1", season: "summer", start: "Aug 10, 2026" }]);
    expect(out.some((s) => s.key === "summer")).toBe(true);
    expect(out.find((s) => s.key === "summer").label).toBe("Summer"); // title-cased fallback
    // predefined seasons still present + first
    expect(out.slice(0, SEASONS.length).map((s) => s.key)).toEqual(SEASONS.map((s) => s.key));
  });
  it("doesn't duplicate a predefined season, and tolerates empty/blank", () => {
    expect(catalogSeasons([{ id: "f", season: "fall" }]).filter((s) => s.key === "fall")).toHaveLength(1);
    expect(catalogSeasons([]).map((s) => s.key)).toEqual(SEASONS.map((s) => s.key));
    expect(catalogSeasons(undefined).length).toBe(SEASONS.length);
  });
  it("seasonLabel falls back to a title-cased key for unknown seasons", () => {
    expect(seasonLabel("summer")).toBe("Summer");
    expect(seasonLabel("fall")).toBe("Fall 2026"); // predefined label unchanged
  });
});
