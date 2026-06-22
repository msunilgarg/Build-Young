import { describe, it, expect } from "vitest";
import { buildReviewPrompt, parseJsonObject, sanitizeReview, parseAcceptanceLines, localReview, generateReview, REVIEW_MODEL } from "../api/_lib/reviewAgent.js";

// The "Check my work" agent (SPECS/008). The pure helpers are tested here; the model call is gated on a
// key (none under test → generateReview returns null and the endpoint falls back to localReview).

describe("buildReviewPrompt", () => {
  it("includes the spec, the acceptance criteria, and what was built; asks for the JSON shape", () => {
    const p = buildReviewPrompt({ spec: "a notes app", acceptance: "Done when login works", built: "I built login + a notes list" });
    expect(p).toContain("a notes app");
    expect(p).toContain("Done when login works");
    expect(p).toContain("I built login + a notes list");
    expect(p).toMatch(/"verdict"/);
    expect(p).toMatch(/strengths/);
    expect(p).toMatch(/gaps/);
    // tone guardrail in the instructions (never a harsh grade)
    expect(p.toLowerCase()).toContain("never harsh");
  });
  it("is safe with missing fields (placeholders, no throw)", () => {
    expect(() => buildReviewPrompt({})).not.toThrow();
    expect(buildReviewPrompt({})).toContain("(nothing pasted)");
  });
});

describe("parseJsonObject", () => {
  it("parses a bare object and one wrapped in prose/markdown", () => {
    expect(parseJsonObject('{"verdict":"pass"}')).toEqual({ verdict: "pass" });
    expect(parseJsonObject('Here you go:\n```json\n{"verdict":"gaps","gaps":["x"]}\n```')).toEqual({ verdict: "gaps", gaps: ["x"] });
  });
  it("returns null for non-objects / junk / arrays", () => {
    expect(parseJsonObject("not json")).toBeNull();
    expect(parseJsonObject("[1,2,3]")).toBeNull(); // an array is not a review object
    expect(parseJsonObject(42)).toBeNull();
  });
});

describe("sanitizeReview", () => {
  it("normalizes the verdict and clamps strengths/gaps (count + length), dropping non-strings", () => {
    const out = sanitizeReview({
      verdict: "PASS-ish",                                  // anything but exactly "pass" → "gaps"
      strengths: ["good login", 42, "", "  clean UI  ", "a", "b", "c", "d", "e", "f", "g"], // >6 → capped
      gaps: ["x".repeat(500)],                              // long → clamped to 240
    });
    expect(out.verdict).toBe("gaps");
    expect(out.strengths).toEqual(["good login", "clean UI", "a", "b", "c", "d"]); // trimmed, junk dropped, capped at 6
    expect(out.gaps[0].length).toBe(240);
  });
  it("keeps a clean pass verdict", () => {
    expect(sanitizeReview({ verdict: "pass", strengths: ["it works"], gaps: [] }))
      .toEqual({ verdict: "pass", strengths: ["it works"], gaps: [] });
  });
  it("returns null when there's nothing useful (so the caller can fall back)", () => {
    expect(sanitizeReview({ verdict: "pass", strengths: [], gaps: [] })).toBeNull();
    expect(sanitizeReview(null)).toBeNull();
    expect(sanitizeReview("nope")).toBeNull();
  });
});

describe("parseAcceptanceLines", () => {
  it("splits bullets / newlines / semicolons and strips list markers", () => {
    expect(parseAcceptanceLines("• Login works\n- Notes save; 2. Search works"))
      .toEqual(["Login works", "Notes save", "Search works"]);
  });
  it("drops empty/too-short fragments and caps at 8", () => {
    expect(parseAcceptanceLines("")).toEqual([]);
    expect(parseAcceptanceLines("ok\n" + Array.from({ length: 12 }, (_, i) => `Criterion number ${i}`).join("\n")).length).toBe(8);
  });
});

describe("localReview (deterministic offline fallback)", () => {
  it("nudges to write criteria first when none are given", () => {
    const r = localReview({ acceptance: "", built: "stuff" });
    expect(r.verdict).toBe("gaps");
    expect(r.gaps[0]).toMatch(/Lesson 2/);
    expect(r.strengths).toEqual([]);
  });
  it("marks a criterion covered when its keywords appear in what was built, else a self-check gap", () => {
    const r = localReview({ acceptance: "Login works\nPayments work", built: "I finished the login screen and it works on my phone" });
    expect(r.strengths.some((s) => /Login works/.test(s))).toBe(true);   // 'login' is in the built text
    expect(r.gaps.some((g) => /Payments work/.test(g))).toBe(true);      // 'payments' is not → flagged to check
    expect(r.verdict).toBe("gaps");
    expect(() => localReview()).not.toThrow();                            // never throws on empty input
  });
  it("a fully-covered checklist passes", () => {
    const r = localReview({ acceptance: "Login works", built: "the login flow works end to end" });
    expect(r.verdict).toBe("pass");
    expect(r.gaps).toEqual([]);
  });
});

describe("generateReview (key-gated)", () => {
  it("returns null without an API key (no throw) so the endpoint falls back to localReview", async () => {
    expect(await generateReview({ acceptance: "x works", built: "built x" })).toBeNull(); // no apiKey
  });
  it("returns null when there's nothing to grade even with a key", async () => {
    expect(await generateReview({ apiKey: "sk-test", acceptance: "", built: "" })).toBeNull();
  });
  it("calls the model and sanitizes its reply when a key + input are present", async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: '{"verdict":"pass","strengths":["clean build"],"gaps":[]}' }] }) });
    const r = await generateReview({ apiKey: "sk-test", acceptance: "Login works", built: "login done", model: REVIEW_MODEL, fetchImpl });
    expect(r).toEqual({ verdict: "pass", strengths: ["clean build"], gaps: [] });
  });
  it("returns null (→ local fallback) when the model errors", async () => {
    const fetchImpl = async () => ({ ok: false });
    expect(await generateReview({ apiKey: "sk-test", acceptance: "x", built: "y", fetchImpl })).toBeNull();
  });
});
