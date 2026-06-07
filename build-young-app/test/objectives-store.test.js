import { describe, it, expect } from "vitest";
import { defaultObjectives, sanitizeObjectives, loadObjectives, saveObjectives } from "../api/_lib/objectivesStore.js";
import { WEEK_OBJECTIVES } from "../src/marketMedia.js";

// KV is unconfigured under test → store falls back to code defaults (WEEK_OBJECTIVES) and refuses writes.

describe("course objectives store", () => {
  it("defaultObjectives mirrors the 12 code WEEK_OBJECTIVES entries", () => {
    expect(defaultObjectives()).toEqual(WEEK_OBJECTIVES.slice(0, 12));
    expect(defaultObjectives()).toHaveLength(12);
  });

  it("sanitizeObjectives always returns 12 trimmed strings; blank is kept, missing falls back", () => {
    const clean = sanitizeObjectives(["  learn this  ", "", 42]); // index 2 not a string → default; rest provided
    expect(clean).toHaveLength(12);
    expect(clean[0]).toBe("learn this");      // trimmed
    expect(clean[1]).toBe("");                // intentionally blanked
    expect(clean[2]).toBe(WEEK_OBJECTIVES[2]); // non-string → code default
    expect(clean[11]).toBe(WEEK_OBJECTIVES[11]); // missing tail → defaults
  });

  it("loadObjectives falls back to defaults when KV is unconfigured", async () => {
    expect(await loadObjectives()).toEqual(WEEK_OBJECTIVES.slice(0, 12));
  });

  it("saveObjectives refuses an unconfigured store", async () => {
    const res = await saveObjectives(["x"]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/store not configured/);
  });
});
