import { describe, it, expect } from "vitest";
import { defaultCatalog, sanitizeCatalog, loadCatalog, saveCatalog } from "../api/_lib/cohortStore.js";
import { BATCHES, CHECKINS } from "../src/cohorts.js";

// KV is unconfigured under test (no KV_REST_API_* env), so the store falls back to code defaults
// and refuses writes — which is exactly what we assert here. The validation (sanitize) is pure.

describe("cohort catalog store", () => {
  it("defaultCatalog mirrors the code catalog, with a stripeLink on every cohort + checkins", () => {
    const c = defaultCatalog();
    expect(c.batches).toHaveLength(BATCHES.length);
    expect(c.checkins).toBe(CHECKINS);
    expect(c.batches.every((b) => "stripeLink" in b)).toBe(true);
  });

  it("sanitizeCatalog enforces fields, coerces types, dedupes ids, and drops id-less rows", () => {
    const clean = sanitizeCatalog({
      batches: [
        { id: "a", season: "fall", price: "999", seats: "12", day: "Mon", junk: "x" },
        { id: "a", price: 500 },     // duplicate id → dropped
        { season: "fall" },          // no id → dropped
        { id: "b", price: -5, seats: -3 }, // clamped to 0
      ],
      checkins: "2",
    });
    expect(clean.batches.map((b) => b.id)).toEqual(["a", "b"]);
    expect(clean.batches[0].price).toBe(999);   // string coerced to number
    expect(clean.batches[0].seats).toBe(12);
    expect(clean.batches[0].track).toBe("Builders"); // defaulted
    expect(clean.batches[0]).not.toHaveProperty("junk"); // unknown keys stripped
    expect(clean.batches[1].price).toBe(0);     // negative clamped
    expect(clean.checkins).toBe(2);
  });

  it("preserves an explicit $0 (free / by-application) cohort — SPECS/016", () => {
    // The founder creates a free cohort by setting Price to 0 in the console; it must survive the save
    // round-trip as 0 (not coerced to a default), since price===0 is what routes enrollment to application.
    const clean = sanitizeCatalog({ batches: [{ id: "free-fall", price: 0, season: "fall" }] });
    expect(clean.batches[0].price).toBe(0);
  });

  it("sanitizeCatalog keeps + trims the group email, and derives <id>@domain when absent", () => {
    const clean = sanitizeCatalog({ batches: [{ id: "a", price: 999, groupEmail: "  custom@build-young.com  " }] });
    expect(clean.batches[0].groupEmail).toBe("custom@build-young.com"); // explicit value trimmed + kept
    expect(sanitizeCatalog({ batches: [{ id: "fall-mw", price: 999 }] }).batches[0].groupEmail).toBe("fall-mw@build-young.com"); // absent → derived, never empty
  });

  it("sanitizeCatalog keeps per-week recording links (weeks 1–12, non-empty strings only)", () => {
    const clean = sanitizeCatalog({
      batches: [{ id: "a", price: 999, recordings: { 1: "https://rec/1", "2": "  https://rec/2  ", 3: "", 13: "https://nope", x: "junk" } }],
    });
    expect(clean.batches[0].recordings).toEqual({ "1": "https://rec/1", "2": "https://rec/2" }); // trimmed; week 13 + empty + junk dropped
    expect(sanitizeCatalog({ batches: [{ id: "b", price: 999 }] }).batches[0].recordings).toEqual({}); // none → empty map, never undefined
  });

  it("loadCatalog falls back to the code defaults when KV is unconfigured", async () => {
    const c = await loadCatalog();
    expect(c.batches.length).toBe(BATCHES.length);
  });

  it("saveCatalog refuses an empty catalog and an unconfigured store", async () => {
    expect((await saveCatalog({ batches: [] })).ok).toBe(false);
    const res = await saveCatalog({ batches: [{ id: "x", price: 999 }] });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/store not configured/);
  });
});
