# Spec: One spec per feature (teach the SPECS/ folder, not the monolith)

> One feature = one short spec. Decisions go here; PRs implement them.

**Status:** draft
**Owner:** Sunil Garg
**Date:** 2026-06-24

## What
Replace the single, monolithic Lesson-2 spec (one document with six fixed sections → one `SPEC.md`)
with a **list of small feature specs** — one spec per feature, each with its own "Done when…" —
exactly how Build Young itself is built (`SPECS/000…011`). The project kit then emits a **`SPECS/`
folder** (one file per feature) instead of a single `SPEC.md`, and each build lesson frames its layer
as a feature spec running its own Spec → Build → Check → Ship loop.

## Why
We *teach* Spec → Build → Check → Ship as a **loop you run per feature**, and our own repo lives that
way (eleven `SPECS/*.md`, one per feature, each approved then shipped). But we make the student write
**one giant spec up front** and build against it for six weeks — the exact "big-bang spec" the loop
exists to avoid. The monolith contradicts the method. Teaching "one feature = one short spec" makes the
student's experience match both the loop we teach and the way real builders (and Build Young) work — and
it fixes the awkward single global acceptance box by moving "Done when…" into each feature where it
belongs.

## Users & trigger
**Enrolled student**, Lesson 2 onward. Lesson 2 = write your **first** feature spec (the core product)
and meet the `SPECS/` folder; each build lesson (3–6, then grow) starts by writing/refining **that
feature's** spec before building it. The feature-spec list persists and grows through the course.

## Behavior (happy path)
- Lesson 2 shows a **feature-spec list**, pre-seeded with the four build layers as starter specs:
  `01-core-product`, `02-accounts`, `03-payments`, `04-production-ready` (preserves the proven
  layered scaffolding + the one-slice-per-week pacing). The student writes the core spec first; the
  others are there to fill in when their lesson arrives.
- Each feature spec is tiny: **name**, **what** (1–3 sentences), and **"Done when…"** (the per-feature
  acceptance — checkable lines). No fixed six-section straitjacket.
- The student can **add a feature spec** (grow weeks and beyond: "add referrals", "add a leaderboard").
- A **product overview** (vision + what success looks like — the product-level, not per-feature, stuff)
  stays as one short doc, mirroring our `000-current-state.md`.
- "Generate my project kit" emits **`SPECS/NN-name.md` per feature** + the product overview, plus the
  existing `CLAUDE.md` / `POSITIONING.md` / `PLAYBOOK.md`. `CLAUDE.md`'s "Definition of done" points at
  the `SPECS/` folder. Re-generatable as specs evolve.
- Edge cases: empty list → can't generate (nudge to write the core spec first); a spec with an empty
  "Done when…" → placeholder text in the file, never "undefined"; mid-course students keep their work
  (one-time migration seeds the list from the old `s.shape`).

## Done when (acceptance)
- [ ] Lesson-2 UI presents a **feature-spec list** (pre-seeded with the four layers) instead of six fixed
      textareas; the student can edit each and **add** new feature specs.
- [ ] Each feature spec carries its own **"Done when…"** acceptance (no single global acceptance box).
- [ ] A product-overview field holds **vision + success metrics** (the product-level content).
- [ ] `buildProjectKit` emits **one `SPECS/NN-name.md` per feature** (+ product overview) alongside
      `CLAUDE.md`/`POSITIONING.md`/`PLAYBOOK.md`; `CLAUDE.md` references the `SPECS/` folder; download is
      a folder/zip (or per-file), "Set up with Claude Code" writes the folder.
- [ ] **Migration:** an existing student's `s.shape` (product/accounts/payments/production/success/
      acceptance) seeds the new list (4 feature specs + product overview) with no data loss.
- [ ] The starter **template repo** ships a `SPECS/` folder (with the four placeholder specs), matching.
- [ ] Build lessons (3–6) frame their layer as "spec this feature → build → check → ship" (copy only).
- [ ] Pure generator unit tests (each feature → its own file; per-feature "Done when…" lands; migration
      seeds correctly) + a render test (list renders, add-spec works). Build + tests green; POSITIONING
      voice; `CLAUDE.md` + `BUILD-YOUNG-ARCHITECTURE.md` updated.

## Out of scope
- Numbered-folder bureaucracy beyond `NN-name.md` (no per-spec Status/Owner ceremony for a 16-year-old).
- Reworking the Check ("review") agent — it already grades against acceptance; it just reads per-feature
  "Done when…" now. Any deeper change is a separate spec.
- Phase-2 GitHub auto-commit (still SPEC 009 Path C, consent-gated).

## Surfaces & sources of truth
- Copy/voice → **POSITIONING.md**. Curriculum mechanics (the new `s.specs` model, build layers) →
  **CLAUDE.md**.
- Touches: `src/Platform.jsx` (`ShapePlan` → feature-spec list + add; build-lesson copy), `src/projectKit.js`
  (emit a `SPECS/` folder; per-feature files), the kit download/zip path, a migration for `s.shape`→`s.specs`,
  the starter template repo, tests, `CLAUDE.md`, `BUILD-YOUNG-ARCHITECTURE.md`. Possibly `api/_lib/kitAgent.js`
  (polish per-feature). `reviewAgent` reads per-feature acceptance.

## Risks / open questions (decisions needed before approval)
- **D1 — Seed vs. blank?** Pre-seed the four build layers as starter feature specs (recommended: keeps the
  layered scaffolding + weekly pacing) vs. let the student create every spec from scratch (more faithful to
  "real building" but loses the guardrails that make week-by-week work).
- **D2 — Migration.** Mid-course students have `s.shape`. Seed `s.specs` from it on first load (recommended,
  no data loss) — confirm the mapping (product→01-core, accounts→02, payments→03, production→04,
  success+vision→product-overview, the old global acceptance → split into each feature's "Done when…" or
  parked on the core spec).
- **D3 — Kit packaging.** Multiple files now. Download as a **`.zip`** of the repo layout (recommended) vs.
  per-file buttons. "Set up with Claude Code" prompt must instruct writing a **folder**.
- **D4 — Scope/phasing.** This is bigger than one PR. Recommended phasing: **Phase 1** = the list model +
  per-feature "Done when…" + kit emits `SPECS/` folder + migration (the substance). **Phase 2** = build-lesson
  copy reframe + template-repo `SPECS/` + polish-agent per feature (fast follow). Approve the split?
- No legal/payment/minor surface here (UI + generator only) — low risk beyond the migration.
