import { describe, it, expect } from "vitest";
import { buildProjectKit, KIT_FILES, AGENTIC_STEPS, FEATURE_SPECS, specFileFor } from "../src/projectKit.js";

// SPECS/009 T42 + 011: the deterministic project-kit generator — specs → the files the student's AI reads
// (CLAUDE.md + a SPECS/ folder, one file per feature + an overview, + PITCH.md + PLAYBOOK.md).

const FULL = {
  build: {
    pain: "Classmates cram and forget — no quick way to self-quiz from your own notes.",
    promise: "Quiz yourself from your own notes in 2 minutes.",
    edge: "Quizzes straight from YOUR notes — no setup, no generic question banks.",
    pr: "Announcing NoteQuiz — turn your notes into a quiz instantly.",
    trueVsGoal: "True now: makes a quiz from notes. Goal: gets you an A.",
    voice: "Friendly and encouraging, like a study buddy rooting for you.",
  },
  shape: {
    product: "A web app that turns a student's notes into a self-quiz.",
    accounts: "Each student signs in and their notes + quizzes are saved.",
    payments: "Free to try; $3/mo unlocks unlimited quizzes.",
    production: "Welcome email; shows up in search; keeps notes private.",
    polish: "Empty notes, a bad paste, two tabs open — each handled gracefully.",
    // Per-feature "Done when…" (SPECS/012) — each folds into its own SPECS/<feature>.md, not the overview.
    accept: {
      product: "Done when a user can paste notes and get a quiz; quizzes save and reload.",
      accounts: "Done when login works and saved quizzes survive a refresh.",
    },
  },
};

describe("buildProjectKit — the kit files (CLAUDE.md + SPECS/ folder + PITCH + PLAYBOOK)", () => {
  it("produces exactly the kit files as non-empty strings", () => {
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
    // One spec per feature in SPECS/ — each carries its spec AND its own "Done when…" (SPECS/012)
    expect(kit["SPECS/core-product.md"]).toContain("turns a student's notes into a self-quiz");
    expect(kit["SPECS/core-product.md"]).toMatch(/Done when…/);
    expect(kit["SPECS/core-product.md"]).toContain("paste notes and get a quiz");   // acceptance lives in the feature file
    expect(kit["SPECS/accounts.md"]).toContain("saved quizzes survive a refresh");  // per-feature acceptance
    expect(kit["SPECS/payments.md"]).toContain("Free to try; $3/mo");
    expect(kit["SPECS/polish-and-iterate.md"]).toContain("two tabs open");
    // SPECS/000-overview.md ← just the feature index now (SPECS/012 removed the product-vision section);
    // per-feature spec + "Done when…" live in each feature file, NOT here.
    expect(kit["SPECS/000-overview.md"]).toContain("`SPECS/core-product.md`");   // indexes the features
    expect(kit["SPECS/000-overview.md"]).not.toContain("paste notes and get a quiz");
    expect(kit["SPECS/000-overview.md"]).not.toMatch(/What success looks like/);
    // PITCH.md ← promise, who-it's-for (pain), why-us (edge), pr, trueVsGoal (SPECS/019)
    expect(kit["PITCH.md"]).toContain("turn your notes into a quiz instantly");
    expect(kit["PITCH.md"]).toContain("True now: makes a quiz");
    expect(kit["PITCH.md"]).toContain("no generic question banks");   // the "why us" edge line
    expect(kit["PITCH.md"]).toContain("study buddy rooting for you");  // the voice line (SPECS/019)
    expect(kit["PITCH.md"]).toContain("How it talks (voice)");         // the voice section header
    expect(kit["POSITIONING.md"]).toBeUndefined();                    // PITCH.md replaced POSITIONING.md
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

  it("CLAUDE.md points at the SPECS/ folder (acceptance) and PLAYBOOK.md (the method) — the docs are wired together", () => {
    const c = buildProjectKit(FULL)["CLAUDE.md"];
    expect(c).toContain("SPECS/");
    expect(c).toContain("PLAYBOOK.md");
  });

  it("empty fields degrade to placeholders, never 'undefined' (works before the specs are filled in)", () => {
    const kit = buildProjectKit({});
    for (const f of KIT_FILES) {
      expect(kit[f]).not.toMatch(/undefined/);
      expect(typeof kit[f]).toBe("string");
    }
    expect(kit["SPECS/000-overview.md"]).toContain("`SPECS/core-product.md`"); // the feature index is always populated
    expect(kit["SPECS/core-product.md"]).toMatch(/fill this in/);              // empty spec → placeholder guidance
    expect(kit["PLAYBOOK.md"]).toContain("Spec");                  // the shared playbook is always populated
  });

  it("is safe with no args", () => {
    expect(() => buildProjectKit()).not.toThrow();
    expect(Object.keys(buildProjectKit()).sort()).toEqual([...KIT_FILES].sort());
  });

  // SPECS/011: one spec per build week, named for its feature.
  it("emits one SPECS/<feature>.md per build week, named for the feature", () => {
    const kit = buildProjectKit(FULL);
    expect(FEATURE_SPECS.map((f) => f.key)).toEqual(["product", "accounts", "payments", "production", "polish", "funnel"]);
    expect(specFileFor("product")).toBe("SPECS/core-product.md");
    expect(specFileFor("polish")).toBe("SPECS/polish-and-iterate.md");
    for (const f of FEATURE_SPECS) {
      const path = specFileFor(f.key);
      expect(KIT_FILES).toContain(path);                       // it's in the kit
      expect(kit[path]).toContain(`# ${f.title}`);             // the file is headed by its feature name
      expect(kit[path]).toMatch(/commit it, then have your AI build it/); // the per-feature spec is build-ready
    }
  });
});
