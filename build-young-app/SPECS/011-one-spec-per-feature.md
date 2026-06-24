# Spec: One spec per build week (write it that week, commit it, build it)

> One feature = one short spec. Decisions go here; PRs implement them.

**Status:** shipped
**Owner:** Sunil Garg
**Date:** 2026-06-24

> **Approved 2026-06-24** (founder sign-off). Decisions: **build starts Lesson 2** (the dedicated
> "Shape the Idea" spec week is gone — Lesson 2 now writes the core-product spec AND builds it); the
> freed Lesson 6 becomes a **"Finish & Harden"** build week (an extra production-ready pass — Act ranges
> 1–7 / 8–10 / 11–12 unchanged, so Go Live stays Lesson 7 and the public copy is untouched); **one spec
> per build week, named for its feature**; the student has their **own Claude commit + build** each spec.
> Shipped as one change.

## What
Each build week the student WRITES the one spec for that week's feature (spec name = the feature) and
builds it that week — no monolithic up-front spec. The project kit emits a **`SPECS/` folder** (one file
per feature + an overview), and each build week's "Copy" hands the student's Claude a **"create
`SPECS/<feature>.md` → commit → build"** handoff. Mirrors how Build Young itself is built (`SPECS/*.md`).

## Why
We teach Spec → Build → Check → Ship as a **loop you run per feature**, and our own repo lives that way
(one `SPECS/*.md` per feature). The old Lesson-2 mega-spec had students write everything up front and
build against it for six weeks — the exact big-bang the loop exists to avoid. Writing *this week's* spec
*this week*, committing it, and having the AI build it makes the student's experience match the method.

## The build weeks → specs (one per week, name = feature)
| Lesson | Feature (= spec name) | s.shape key | Spec file |
|---|---|---|---|
| 2 | core product | `product` | `SPECS/core-product.md` |
| 3 | accounts & saved data | `accounts` | `SPECS/accounts.md` |
| 4 | payments | `payments` | `SPECS/payments.md` |
| 5 | production-ready | `production` | `SPECS/production-ready.md` |
| 6 | finish & harden | `harden` | `SPECS/finish-and-harden.md` |
| 8 | the funnel | `funnel` | `SPECS/funnel.md` |

Plus `SPECS/000-overview.md` (product vision `success` + the global **"Done when…"** `acceptance`).

## Behavior (per build week)
- The week shows the feature's spec editor (`BuildLayer`, `s.shape[key]`) + a "Done when…" Check card.
- **"Copy"** builds the handoff: *"create `${specFileFor(key)}` with the spec below, commit it, then
  build it"* + the spec + the week's build instruction. The student pastes it into their own Claude Code.
- **Lesson 2** is the first build week: the Agentic-Process primer + product vision + the **project kit**
  (`ProjectKitPanel` → CLAUDE.md + the `SPECS/` folder + POSITIONING.md + PLAYBOOK.md), then the
  core-product `BuildLayer`. Building starts here (Go Live still Lesson 7; capstone still Lesson 12).
- Re-generatable: the kit always reflects the live specs.

## Done when (acceptance) — all met
- [x] `BUILD_LAYERS`/`BUILD_WEEKS` keyed by lessons **2, 3, 4, 5, 6, 8**; L2 = core product, L6 = finish & harden.
- [x] Each build week's "Copy" is a **commit-&-build** handoff naming the feature's `SPECS/<feature>.md` file.
- [x] `buildProjectKit` emits the `SPECS/` folder (one file per feature + overview) + CLAUDE.md/POSITIONING/PLAYBOOK; `KIT_FILES`/`specFileFor`/`FEATURE_SPECS` are the SoT; `CLAUDE.md` points at `SPECS/`.
- [x] Lesson 2 = first build week (`ShapePlan` setup → core-product `BuildLayer`); the old spec-only Lesson 2 is gone.
- [x] Curriculum renumbered (course.js, marketMedia.js titles/prep/objectives, PREREQS, HeroPreview) with Act ranges + public copy unchanged; connective "last/next lesson" threads rewoven.
- [x] Build + 386 tests green (project-kit / kit-agent / Platform updated); `CLAUDE.md` + this spec updated.

## Out of scope
- Per-feature acceptance (kept ONE global `s.shape.acceptance`, edited in each build week's Check card).
- Server-side GitHub commit for the student (still SPECS/009 Path C, consent-gated) — here the student's
  OWN Claude does the commit.

## Surfaces & sources of truth
- Copy/voice → **POSITIONING.md** (Act ranges unchanged). Curriculum mechanics → **CLAUDE.md**.
- Touched: `src/course.js`, `src/marketMedia.js`, `src/Platform.jsx` (BUILD_LAYERS/BUILD_WEEKS/weekActivity/
  ShapePlan/BuildLayer/PREREQS/SHAPE_EXAMPLE), `src/projectKit.js` (SPECS/ folder + `specFileFor`/`FEATURE_SPECS`),
  `src/Landing.jsx` (HeroPreview), `api/_lib/kitAgent.js`, `public/llms.txt`, tests, `CLAUDE.md`.
