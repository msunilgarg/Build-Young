# Spec: One consistent build-week loop — Spec → Acceptance → Verify (per-feature)

> One feature = one short spec + its own "Done when…". Decisions go here; PRs implement them.

**Status:** shipped
**Owner:** Sunil Garg
**Date:** 2026-06-24

> **Approved 2026-06-24** (founder sign-off, two decisions): (1) **acceptance is per-feature** —
> each build week writes that feature's own "Done when…" criteria, folded into the SAME
> `SPECS/<feature>.md` (spec + its acceptance in one file); the verifier checks the build against that
> file. **This supersedes SPECS/011's "kept ONE global `s.shape.acceptance`" out-of-scope note.**
> (2) The Lesson-2 **project kit** (CLAUDE.md + the SPECS downloads + "Set up with Claude Code") is
> **collapsed and moved below the spec**, so Week 2 leads with the clean loop, not the kit.

## Why
Week 2 had become a cluttered special case — the product vision, a 10-file project-kit panel, AND the
spec, all before the student wrote a line. And acceptance ("Done when…") was one global field, so the
per-week story ("write *this* feature's criteria") didn't hold. We teach Spec → Build → Check → Ship as
a loop you run **per feature**; the UI should be the same simple three steps **every build week**, with
each step visibly mapping to the file it writes.

## The consistent build-week structure (Lessons 2–6, 8 — all share `BuildLayer`)
Every build week is the same three numbered steps, top to bottom:

1. **① Write your spec** — the feature's spec field. Mapping shown plainly: *"→ saves to
   `SPECS/<feature>.md`"*. **Copy** hands the student's own Claude the *create the file → commit →
   build it* handoff (the file content = the spec **and** its "Done when…").
2. **② Write your acceptance criteria** — the feature's own **"Done when…"** field
   (`s.shape.accept[key]`). Mapping shown plainly: *"→ saved into the same `SPECS/<feature>.md`, under
   'Done when…' — this is the bar your check measures against."*
3. **③ The verifier check** — paste what you built → an independent check **against this feature's**
   acceptance criteria (`s.shape.accept[key]`). Never blocks moving on.

## Data model
- **NEW** `s.shape.accept` = `{ [featureKey]: "Done when… criteria" }` — one per feature.
- **REMOVED** the single global `s.shape.acceptance`. (Pre-launch; demo localStorage only — no migration.)
- `s.shape.success` (product vision) unchanged → `SPECS/000-overview.md`.

## Project kit (`projectKit.js`)
- Each `SPECS/<feature>.md` = `## Spec` (the feature spec) + `## Done when… (acceptance criteria)`
  (`accept[key]`). One file carries both — what the student commits and what the verifier reads.
- `SPECS/000-overview.md` keeps the product vision; the global "Done when…" block is gone (acceptance is
  per-feature now). It notes each feature's spec carries its own "Done when…".
- `CLAUDE.md` "How we spec" / "Definition of done" updated: done = meets the "Done when…" in **that
  feature's own spec file**.

## Lesson 2 only
- `ShapePlan` = the Agentic-Process primer + the product vision (`success`) **only** — the kit is removed
  from it. Heading: "Your product vision".
- Order: `ShapePlan` → core-product `BuildLayer` (the 3 steps) → `ProjectKitPanel` **collapsed**
  (an optional "Set up your project files" `<details>`), so the files reflect the spec just written.

## Done when (acceptance) — all met
- [x] `BuildLayer` renders three labeled steps (① spec, ② acceptance, ③ verifier) for **every** build
      week (2–6, 8), each with its file-mapping pill; acceptance reads/writes `s.shape.accept[key]`.
- [x] The build handoff prompt embeds the spec **and** the "Done when…" acceptance into the
      `create SPECS/<feature>.md` instruction.
- [x] `buildProjectKit` folds per-feature acceptance into each `SPECS/<feature>.md`; the overview no
      longer carries a global "Done when…"; no "undefined" on empty input.
- [x] Lesson 2: kit is collapsed + below the spec; `ShapePlan` no longer renders the kit.
- [x] Worked example per build week shows the spec sample **and** the "Done when…" sample.
- [x] Build + 392 tests green (project-kit + Platform updated, incl. render tests of the 3 steps +
      per-feature isolation + collapsed kit); docs synced — `CLAUDE.md`, SPECS/011 (superseded note), this spec.

## Out of scope
- Per-feature *spec* files already exist (SPECS/011); this only adds their per-feature acceptance.
- Server-side commit for the student (still their own Claude via the handoff).
