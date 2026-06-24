import { describe, it, expect } from "vitest";
import { buildFounderStory, FOUNDER_STORY_EXAMPLE } from "../src/founderStory.js";

// SPECS/010 T46: the deterministic founder-story generator — reflection/build → an honest one-pager.

const FULL = {
  build: { promise: "Quiz yourself from your own notes in 2 minutes.", pain: "Classmates cram and forget — no quick way to self-quiz from notes." },
  shape: { product: "A web app that turns notes into a self-quiz." },
  reflect: { 11: {
    whatBuilt: "NoteQuiz — turns your notes into a quiz instantly.",
    proud: "The first time a friend used it to study for a real test.",
    whoUses: "My classmates and two other study groups.",
    next: "Add spaced repetition so it reminds you what to review.",
  } },
};

describe("buildFounderStory", () => {
  it("routes each reflection/build field into the right section", () => {
    const s = buildFounderStory(FULL);
    expect(s).toContain("Quiz yourself from your own notes");        // promise → headline
    expect(s).toContain("Classmates cram and forget");               // pain → the problem
    expect(s).toContain("NoteQuiz — turns your notes into a quiz");   // whatBuilt → what I built
    expect(s).toContain("My classmates and two other study groups");  // whoUses
    expect(s).toContain("first time a friend used it");               // proud
    expect(s).toContain("Add spaced repetition");                     // next
  });

  it("includes the honest 'How to use this' helper (essay / activities / interview)", () => {
    const s = buildFounderStory(FULL);
    expect(s).toMatch(/Essay hook/);
    expect(s).toMatch(/Activities list/);
    expect(s).toMatch(/interviews/);
  });

  it("contains NO admissions-outcome language (POSITIONING guardrail)", () => {
    const s = buildFounderStory(FULL).toLowerCase();
    for (const banned of ["guarantee", "boost", "get you in", "gets you in", "boosts your chances", "admission"]) {
      expect(s).not.toContain(banned);
    }
  });

  it("empty input degrades to placeholders, never 'undefined', and never throws", () => {
    expect(() => buildFounderStory()).not.toThrow();
    const s = buildFounderStory({});
    expect(s).not.toMatch(/undefined/);
    expect(s).toContain("# My founder story");
    expect(s).toMatch(/your product in one line/); // placeholder guidance present
  });

  it("the worked sample (FOUNDER_STORY_EXAMPLE) produces a real, complete story", () => {
    const s = buildFounderStory(FOUNDER_STORY_EXAMPLE);
    expect(s).toContain("Build Young");
    expect(s).not.toMatch(/fill this in|_\(/); // no placeholders — the sample is fully filled
    expect(s.toLowerCase()).not.toContain("guarantee");
  });
});
