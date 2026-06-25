import { describe, it, expect } from "vitest";
import { duplicateCohort } from "../src/cohorts.js";

// SPECS/018 — the founder "Duplicate" action clones a cohort as a starting point for a new one.
describe("duplicateCohort (SPECS/018)", () => {
  const src = {
    id: "fall-mw", season: "fall", track: "Builders", start: "Sep 7, 2026",
    day: "Mondays & Wednesdays · 5:00–6:30 PM PT", seats: 10, price: 999,
    zoom: "https://zoom.us/j/1", groupEmail: "fall-mw@build-young.com",
    groupAudienceId: "aud_123", stripeLink: "https://buy.stripe.com/abc",
    recordings: { 1: "https://rec/1" }, manualLesson: 3, blurb: "Build something real.",
  };

  it("keeps the reusable shape but clears the per-instance fields", () => {
    const out = duplicateCohort(src, ["fall-mw"]);
    // reusable shape kept
    expect(out).toMatchObject({ season: "fall", track: "Builders", day: src.day, seats: 10, price: 999, zoom: src.zoom, blurb: src.blurb });
    // per-instance fields cleared / dropped
    expect(out.start).toBe("");
    expect(out.stripeLink).toBe("");
    expect(out.groupEmail).toBe(""); // re-derives from the new id via sanitizeCatalog
    expect(out).not.toHaveProperty("groupAudienceId");
    expect(out).not.toHaveProperty("recordings");
    expect(out).not.toHaveProperty("manualLesson");
  });

  it("assigns a fresh UNIQUE id, deduping against existing ids", () => {
    expect(duplicateCohort(src, ["fall-mw"]).id).toBe("fall-mw-copy");
    // if the -copy id is taken, it bumps the suffix
    expect(duplicateCohort(src, ["fall-mw", "fall-mw-copy"]).id).toBe("fall-mw-copy-2");
    expect(duplicateCohort(src, ["fall-mw", "fall-mw-copy", "fall-mw-copy-2"]).id).toBe("fall-mw-copy-3");
    // duplicating a copy doesn't stack "-copy-copy"
    expect(duplicateCohort({ ...src, id: "fall-mw-copy" }, ["fall-mw", "fall-mw-copy"]).id).toBe("fall-mw-copy-2");
  });

  it("preserves a $0 scholarship cohort's price (stays free on duplicate)", () => {
    expect(duplicateCohort({ ...src, price: 0 }, ["fall-mw"]).price).toBe(0);
  });

  it("doesn't carry the UI-only pace fields", () => {
    const out = duplicateCohort({ ...src, _lpw: "2", _spl: "1" }, []);
    expect(out).not.toHaveProperty("_lpw");
    expect(out).not.toHaveProperty("_spl");
  });
});
