import { describe, it, expect } from "vitest";
import { sortCohorts } from "../src/cohorts.js";
import { sanitizeCatalog } from "../api/_lib/cohortStore.js";

// T25: cohort display order — by start date ascending by default, with an explicit sortOrder override.
describe("sortCohorts", () => {
  it("orders by start date ascending (an August cohort before September), regardless of input order", () => {
    const out = sortCohorts([
      { id: "sep", start: "Sep 7, 2026" },
      { id: "aug", start: "Aug 3, 2026" },
      { id: "oct", start: "Oct 1, 2026" },
    ]);
    expect(out.map((b) => b.id)).toEqual(["aug", "sep", "oct"]);
  });
  it("an explicit sortOrder (>0) pins a cohort ahead, ascending; the rest fall back to date", () => {
    const out = sortCohorts([
      { id: "aug", start: "Aug 3, 2026" },
      { id: "sep", start: "Sep 7, 2026", sortOrder: 1 }, // pinned first
    ]);
    expect(out.map((b) => b.id)).toEqual(["sep", "aug"]);
  });
  it("unparseable dates sort last and don't crash; pure (input untouched)", () => {
    const input = [{ id: "bad", start: "nope" }, { id: "good", start: "Sep 7, 2026" }];
    expect(sortCohorts(input).map((b) => b.id)).toEqual(["good", "bad"]);
    expect(input[0].id).toBe("bad"); // original array order unchanged
    expect(sortCohorts(undefined)).toEqual([]);
  });
});

describe("sanitizeCatalog keeps sortOrder (integer ≥ 0, default 0)", () => {
  it("rounds + clamps", () => {
    const c = sanitizeCatalog({ batches: [
      { id: "a", start: "Sep 7, 2026", price: 999, sortOrder: 2 },
      { id: "b", start: "Sep 7, 2026", price: 999, sortOrder: -5 },
      { id: "c", start: "Sep 7, 2026", price: 999 },
    ] });
    expect(c.batches.map((b) => b.sortOrder)).toEqual([2, 0, 0]);
  });
});
