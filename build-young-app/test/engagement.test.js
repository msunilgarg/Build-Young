import { describe, it, expect } from "vitest";
import { engagement } from "../src/funnel.js";

const visited = (source, country) => ({ event: "visited", ts: 1, props: { source, country } });

describe("engagement sourceCountry cross-tab", () => {
  it("breaks each source down by country, sorted by count, sources by total", () => {
    const eng = engagement([
      visited("direct", "US"), visited("direct", "US"), visited("direct", "PL"),
      visited("direct", null), // a visit with no geography still counts toward the source total
      visited("google.com", "US"),
    ]);
    expect(eng.sourceCountry[0].source).toBe("direct"); // highest total first
    const direct = eng.sourceCountry.find((s) => s.source === "direct");
    expect(direct.count).toBe(4);
    expect(direct.byCountry).toEqual([{ country: "US", count: 2 }, { country: "PL", count: 1 }]);
    const g = eng.sourceCountry.find((s) => s.source === "google.com");
    expect(g.byCountry).toEqual([{ country: "US", count: 1 }]);
  });
  it("is empty with no visits", () => {
    expect(engagement([]).sourceCountry).toEqual([]);
  });
});

const visitedGeo = (source, country, region) => ({ event: "visited", ts: 1, props: { source, country, region } });

describe("engagement usStates (US state breakdown)", () => {
  it("aggregates US visits by state (sorted), excluding non-US and region-less visits", () => {
    const eng = engagement([
      visitedGeo("direct", "US", "WA"),
      visitedGeo("direct", "US", "WA"),
      visitedGeo("google.com", "US", "CA"), // US-California (not Canada — country is US)
      visitedGeo("direct", "CA", "BC"),      // Canada → excluded (country !== "US")
      visitedGeo("direct", "US", undefined), // US but no region → excluded
    ]);
    expect(eng.usStates).toEqual([{ region: "WA", count: 2 }, { region: "CA", count: 1 }]);
  });
  it("is empty with no US-state data", () => {
    expect(engagement([]).usStates).toEqual([]);
  });
});
