import { describe, it, expect } from "vitest";
import { buildProjectKit, KIT_FILES, AGENTIC_STEPS } from "../src/projectKit.js";

// SPECS/009 T42: the deterministic project-kit generator — spec → the four files the student's AI reads.

const FULL = {
  build: {
    pain: "Classmates cram and forget — no quick way to self-quiz from your own notes.",
    promise: "Quiz yourself from your own notes in 2 minutes.",
    pr: "Announcing NoteQuiz — turn your notes into a quiz instantly.",
    trueVsGoal: "True now: makes a quiz from notes. Goal: gets you an A.",
  },
  shape: {
    product: "A web app that turns a student's notes into a self-quiz.",
    accounts: "Each student signs in and their notes + quizzes are saved.",
    payments: "Free to try; $3/mo unlocks unlimited quizzes.",
    production: "Welcome email; shows up in search; keeps notes private.",
    success: "Active = makes a quiz weekly; they come back; they tell a friend.",
    acceptance: "Done when a user can paste notes and get a quiz; quizzes save and reload.",
  },
};

describe("buildProjectKit — the four files", () => {
  it("produces exactly the four kit files as non-empty strings", () => {
    const kit = buildProjectKit(FULL);
    expect(Object.keys(kit).sort()).toEqual([...KIT_FILES].sort());
    for (const f of KIT_FILES) expect(typeof kit[f] === "string" && kit[f].length > 0).toBe(true);
  });

  it("routes each field into the right file", () => {
    const kit = buildProjectKit(FULL);
    // CLAUDE.md ← product, pain, promise, accounts, payments, production
    expect(kit["CLAUDE.md"]).toContain("turns a student's notes into a self-quiz");
    expect(kit["CLAUDE.md"]).toContain("Classmates cram and forget");
    expect(kit["CLAUDE.md"]).toContain("Quiz yourself from your own notes");
    expect(kit["CLAUDE.md"]).toContain("notes + quizzes are saved");
    // SPEC.md ← the four layers + success + the acceptance contract
    expect(kit["SPEC.md"]).toContain("Free to try; $3/mo");
    expect(kit["SPEC.md"]).toContain("they tell a friend");
    expect(kit["SPEC.md"]).toMatch(/Done when…/);
    expect(kit["SPEC.md"]).toContain("paste notes and get a quiz");
    // POSITIONING.md ← promise, pr, pain, trueVsGoal
    expect(kit["POSITIONING.md"]).toContain("turn your notes into a quiz instantly");
    expect(kit["POSITIONING.md"]).toContain("True now: makes a quiz");
  });

  it("bakes in the guardrails (never homemade passwords, never handle cards, secrets off the browser)", () => {
    const c = buildProjectKit(FULL)["CLAUDE.md"];
    expect(c).toMatch(/never write your own password code/i);
    expect(c).toMatch(/Stripe/);
    expect(c).toMatch(/never handle card details/i);
    expect(c).toMatch(/off the browser/i);
  });

  it("PLAYBOOK.md derives the four steps from the shared AGENTIC_STEPS (single source of truth)", () => {
    const p = buildProjectKit(FULL)["PLAYBOOK.md"];
    for (const step of AGENTIC_STEPS) {
      expect(p).toContain(step.n);                 // Spec / Build / Check / Ship
      expect(p).toContain(step.d.slice(0, 25));    // each step's description text
    }
    expect(AGENTIC_STEPS.map((s) => s.n)).toEqual(["Spec", "Build", "Check", "Ship"]);
  });

  it("CLAUDE.md points at SPEC.md (acceptance) and PLAYBOOK.md (the method) — the docs are wired together", () => {
    const c = buildProjectKit(FULL)["CLAUDE.md"];
    expect(c).toContain("SPEC.md");
    expect(c).toContain("PLAYBOOK.md");
  });

  it("empty fields degrade to placeholders, never 'undefined' (works before the spec is filled in)", () => {
    const kit = buildProjectKit({});
    for (const f of KIT_FILES) {
      expect(kit[f]).not.toMatch(/undefined/);
      expect(typeof kit[f]).toBe("string");
    }
    expect(kit["SPEC.md"]).toMatch(/fill this in/);     // placeholder guidance present
    expect(kit["PLAYBOOK.md"]).toContain("Spec");        // the shared playbook is always populated
  });

  it("is safe with no args", () => {
    expect(() => buildProjectKit()).not.toThrow();
    expect(Object.keys(buildProjectKit()).sort()).toEqual([...KIT_FILES].sort());
  });
});
