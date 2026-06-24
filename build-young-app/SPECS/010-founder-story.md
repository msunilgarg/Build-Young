# Spec: Your Founder Story (capstone → application-ready narrative)

> One feature = one short spec. Decisions go here; PRs implement them.

**Status:** approved
**Owner:** Sunil Garg
**Date:** 2026-06-24

> **Approved 2026-06-24** (founder sign-off). Decisions: surface on **BOTH** capstone lessons —
> **Lesson 11 = DRAFT** your founder story (alongside the reflection where the raw material is written),
> **Lesson 12 = FINAL** version for the presentation; ship a **worked sample** (a model story, like the
> spec lessons' `ExampleCard`) so students see what good looks like; **v1 is deterministic-only**, AI
> polish is a fast follow-on; the public portfolio page stays deferred (minors → consent). Tasks T46–T47.

## What
At the capstone, compile what the student built into an honest, **application-ready founder story** — a
short one-pager they can copy/download and use for **college essays, the activities list, interviews, and
a portfolio**. It's *their own words*, assembled and framed well — never an admissions claim.

## Why
The college/founder-mindset angle is now a sanctioned **secondary, parent-facing** angle (POSITIONING.md).
But it only pays off if the student walks away with a concrete artifact. They already jot the raw material
at **Lesson 11 (Prepare Your Capstone)** — `s.reflect[11]` (`whatBuilt` / `proud` / `whoUses` / `next`) plus
their live product (showcase link) and their Week-1 `promise`. Today that's scattered notes; this turns it
into a story they can actually *use*. Authenticity-first: it's evidence + a narrative, **not** a promise of
getting in (per the POSITIONING guardrails).

## Users & trigger
**Enrolled student**, across the **capstone**: **Lesson 11** (draft it, alongside the reflection) and
**Lesson 12** (the final version for the presentation). Re-generatable as they refine (like the project kit).

## Behavior
- **Two surfaces, one generator:** **Lesson 11 → "Draft your founder story"** (shown with the reflection,
  where the raw material is written) and **Lesson 12 → "Your founder story — for your presentation"** (the
  final). Same `buildFounderStory` output; only the framing copy differs (draft vs. final).
- **A worked sample** (`FOUNDER_STORY_EXAMPLE` — a model story for Build Young, mirroring `SHAPE_EXAMPLE`)
  is shown at Lesson 11 via an `ExampleCard`, so students see what a strong founder story looks like.
- The panel assembles a deterministic one-pager from existing data:
  - **Headline / one-liner** ← `build.promise` (or `reflect[11].whatBuilt`)
  - **The problem** ← `build.pain`
  - **What I built (with AI)** ← `reflect[11].whatBuilt` + the product/spec (`shape.product`)
  - **Who's using it** ← `reflect[11].whoUses` (+ the live product link if present)
  - **What I'm proudest of / what's next** ← `reflect[11].proud` / `reflect[11].next`
  - **"How to use this"** — a short, honest helper: a sentence for an essay hook, one line for the
    activities list, and a 30-second interview answer — drawn from the same material.
- Delivered like the project kit: **copy** (one block) + **download** (a `.md`), re-generatable from live state.
- **Honest framing baked in:** the generated text makes **no admissions claims** ("gets you in" / "boosts
  your chances"); it presents a real product + an authentic story. Empty fields degrade to gentle
  placeholders, never "undefined".
- Optional later: an **AI polish** layer (reuse the kit/review agent pattern — toggleable, key-gated,
  deterministic fallback). Out of v1.

## Done when (acceptance)
- [ ] New pure foundation helper (e.g. `src/founderStory.js`): `buildFounderStory({ build, shape, reflect })` → a string one-pager via a deterministic template; offline-safe; placeholders for empty fields; **no admissions-outcome language**.
- [ ] A capstone panel (Lesson 11/12) renders it with **copy + download**, re-generatable; never gates progression/cert.
- [ ] Copy honors POSITIONING guardrails (evidence + story, not an outcome; authenticity; us/we voice).
- [ ] Tests: generator unit tests (each reflection field lands; no banned outcome phrases; empty-safe) + a render test (the panel + copy/download render, asserting a visible story string). Build + tests green; CLAUDE.md + BUILD-YOUNG-ARCHITECTURE.md (new foundation helper) updated.

## Out of scope (for v1)
- **A public portfolio page / route** (e.g. `/builder/<id>`) — a new PUBLIC surface for a **minor's** work needs parental consent + privacy/hosting design (the showcase already gates public use on `consent`). Separate, gated spec.
- **AI polish** of the story (deterministic template only for v1).
- Any **admissions-outcome** claim or résumé-padding framing (forbidden by POSITIONING, not just deferred).

## Surfaces & sources of truth
- Copy/voice → **POSITIONING.md** (the new "College & the founder mindset" angle + guardrails).
- Reuses existing data: `s.reflect[11]` (REFLECT_WEEKS[11]), `s.build`, `s.shape`, the showcase product link.
- Touches: new `src/founderStory.js` (foundation, pure), `src/Platform.jsx` (capstone panel), tests, `CLAUDE.md`, `BUILD-YOUNG-ARCHITECTURE.md`.

## Tasks (Phase 1)
- **T46 · `founderStory` generator + worked sample (pure module)** — `buildFounderStory({ build, shape, reflect })` (deterministic; placeholders; no admissions language) + `FOUNDER_STORY_EXAMPLE`. risk: med.
- **T47 · Capstone panels (Lesson 11 draft + Lesson 12 final) + the sample** — copy/download, re-generatable; `ExampleCard` sample at Lesson 11. risk: med. (depends on T46)

## Risks / decisions
- ✅ **Both lessons:** Lesson 11 draft, Lesson 12 final-for-presentation (one generator, different framing).
- ✅ **Worked sample** shipped (model story, `ExampleCard` at Lesson 11).
- ✅ **v1 deterministic-only;** AI polish is a fast follow-on.
- ✅ **Public portfolio page deferred** — a minor's public work needs parental consent + privacy design (its own gated spec).
- **Claim integrity** — the single biggest risk is the generated copy drifting into admissions promises; the generator must contain none, and a test asserts the banned phrases are absent.
