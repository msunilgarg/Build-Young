# Spec: 001 — Teach students to direct their AI (brief to build + brief to tell)

**Status:** approved — "establish" phase implemented; "resurface" phase is the next increment
**Owner:** Sunil Garg
**Date:** 2026-06-07

> **Implemented (establish phase):** Week 1 (BuildPlan) — a "you're the director, AI is the builder" primer
> + a persistent **positioning brief** (the one promise + an honest "true now vs. goal" check). Week 2
> (ShapePlan) — spec reframed as "the brief you hand your AI" + a vague-vs-clear contrast example.
> **Next increment (resurface phase):** surface the Week-1 positioning brief at go-live / funnel / capstone
> with an honest-claims check, and a copy-to-AI prompt that wraps it (build-layer pattern).

## What
Make **"directing your AI with a clear, honest brief"** an explicit, taught skill — in two halves:
1. **Brief to BUILD** (Weeks 1–2): the spec / clear-intent.
2. **Brief to TELL**: the positioning + promise — a **persistent north star** set early (Wk 1–2) and used
   throughout (go-live, funnel, capstone), with honest claims as a standing rule.

Reuse what already exists (Wk1 problem → Wk2 spec/`s.shape` → the build-plan press release); the work is
**naming the skill, adding a vague-vs-clear contrast, and adding an honest-claims check** — not new weeks.

## Why
In an AI world the scarce skill isn't "use AI to build" — it's thinking clearly enough to make AI build the
*right* thing and say *true* things. That's the program's own thesis (edge = taste + clarity), it generalizes
beyond building (essays, research, work), and it's the exact gap that wastes people's time when their first
prompt is a vague wish instead of a brief.

## Users & trigger
Enrolled student, in the dashboard:
- **Weeks 1–2** — both briefs are **established**: the build brief (spec) and the positioning brief (the tell).
- **Wherever they communicate** (Go Live, the Funnel, the Capstone) — the positioning brief is **surfaced,
  applied, and refined**, with an honest-claims check. It is a persistent north star, not a one-week task.

## Behavior
**Framing (tool-agnostic, so it won't go stale):** "You are the director; the AI is the builder. A good brief
states **Goal · Why · Who it's for · What 'done' looks like · What's out of scope.**"

**Half 1 — Brief to build (Wk 1–2):**
- Keep Wk1 (find a problem) and Wk2 spec (`s.shape`).
- Add a short primer card: what makes a good brief, framed as *directing your AI*.
- Add a **vague-vs-clear contrast** (worked example: a lazy one-line prompt vs. their spec'd prompt, and why
  the second works). Lightweight, experiential — not a graded task.
- Reinforce that the existing copy-to-AI build prompt **is** their brief to the AI.

**Half 2 — Brief to tell (a north star, NOT a step):**
Positioning isn't a single week's task — like Build Young's own `POSITIONING.md`, it's **set early and used
throughout.** So:
- **Established early (Wk 1–2)**, alongside the spec, by evolving the existing **press release** into a short,
  **persistent positioning brief**: what it is, who it's for, the one promise, the voice, and the rule —
  **what's TRUE NOW vs. what's the GOAL.** It lives in the dashboard (like `s.shape` / `s.build` already do).
- **Referenced wherever they communicate** — at Go Live (write the landing copy from it), in the Funnel (the
  message that drives find → try → return), at the Capstone (present from it) — and **refined** as the product changes.
- **Honest claims is a standing rule**, applied whenever they use/refine it — surfaced most sharply at Go Live,
  when it goes public (mirrors our own edits: "learn to grow," not "grow into a business").
- **Writing the actual copy is the student's own exercise in their AI** (Claude Pro): the dashboard hands them a
  **copy-to-AI prompt that wraps their current positioning brief** (build-week pattern), not a generator.

Keep it **ONE evolving product brief** for the student (build half + tell half) — not two docs. No heavy new UI;
reuse existing cards/components (primer card, build layer, the press-release fields).

## Done when (acceptance)
- [ ] Wk1–2 explicitly names "you are directing your AI" + a good-brief primer (Goal/Why/Who/Done/Out-of-scope).
- [ ] A concrete vague-vs-clear contrast example is shown (on-brand worked example).
- [ ] The press release is extended with a "the one promise" + "true now vs. goal" prompt.
- [ ] The positioning brief is a **persistent artifact** (set Wk 1–2) surfaced at each communication point — not a single-week task.
- [ ] An honest-claims check appears before go-to-market copy ("mark what's real vs. aspirational; say it that way").
- [ ] Marketing copy is produced via a **copy-to-AI prompt** (student's own AI), not a built-in generator.
- [ ] Framed as a transferable principle, not a Claude-specific template.
- [ ] No lecture/slideware; learn-by-doing; respects the "no busywork" promise.
- [ ] Tests pass; landing perf budget unaffected.

## Out of scope
- The internal dev `_TEMPLATE.md` / `CLAUDE.md`-style code-rules layer (not for teens).
- A separate student-facing `.md` (student work stays in-app, as one brief).
- Auto-grading or AI-evaluating the student's brief.
- Net-new weeks — this rides the weeks that already exist.

## Surfaces & sources of truth
- **Copy/claims →** `POSITIONING.md` (reuse the achieved-vs-learned + claims-we-avoid sections as the honest-claims model).
- **Code →** `CLAUDE.md` (`WEEKS`, `BUILD_LAYERS`, `SHAPE_EXAMPLE`, the build plan; keep `WEEK_TITLES` in sync; preserve a11y/perf).
- **Touches:** `src/App.jsx` (Wk1–2 primer + contrast, the press-release/positioning fields, the go-to-market honest-claims check); possibly `src/marketMedia.js`.

## Risks / open questions
- **Don't let it feel like forms** — that breaks "no busywork" and loses teens. Keep cards short and experiential.
- **RESOLVED (per founder):** positioning is a **persistent north star, not a step** — established early
  (Wk 1–2 with the spec) and referenced/refined at every communication point (Go Live, Funnel, Capstone),
  mirroring how Build Young's own `POSITIONING.md` works. It does not "land" in a single week.
- **RESOLVED:** writing the copy is the student's exercise in their own AI — the dashboard provides a copy-to-AI
  prompt (build-layer pattern), not a server-side generator. Keeps it hands-on; no copy-gen feature to build.
- Keep it age-appropriate: one product brief, not two docs.
