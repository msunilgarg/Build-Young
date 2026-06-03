import { describe, it, expect } from "vitest";
import { defaultHomework, sanitizeHomework, loadHomework, saveHomework } from "../api/_lib/homeworkStore.js";
import { WEEK_PREP } from "../src/marketMedia.js";

// KV is unconfigured under test → store falls back to code defaults (WEEK_PREP) and refuses writes.

describe("course homework store", () => {
  it("defaultHomework mirrors the 12 code WEEK_PREP entries", () => {
    expect(defaultHomework()).toEqual(WEEK_PREP.slice(0, 12));
    expect(defaultHomework()).toHaveLength(12);
  });

  it("sanitizeHomework always returns 12 trimmed strings; blank is kept, missing falls back", () => {
    const clean = sanitizeHomework(["  do this  ", "", 42]); // index 2 not a string → default; rest provided
    expect(clean).toHaveLength(12);
    expect(clean[0]).toBe("do this"); // trimmed
    expect(clean[1]).toBe("");        // intentionally blanked
    expect(clean[2]).toBe(WEEK_PREP[2]); // non-string → code default
    expect(clean[11]).toBe(WEEK_PREP[11]); // missing tail → defaults
  });

  it("loadHomework falls back to defaults when KV is unconfigured", async () => {
    expect(await loadHomework()).toEqual(WEEK_PREP.slice(0, 12));
  });

  it("saveHomework refuses an unconfigured store", async () => {
    const res = await saveHomework(["x"]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/store not configured/);
  });
});
