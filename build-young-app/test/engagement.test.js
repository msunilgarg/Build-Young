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
