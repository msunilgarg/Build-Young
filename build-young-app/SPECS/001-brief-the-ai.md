# Spec: 001 — Teach students to direct their AI (brief to build + brief to tell)

**Status:** draft (awaiting approval — no code until then)
**Owner:** Sunil Garg
**Date:** 2026-06-07

## What
Make **"directing your AI with a clear, honest brief"** an explicit, taught skill — in two halves:
1. **Brief to BUILD** (Weeks 1–2): the spec / clear-intent.
2. **Brief to TELL** (Act 2 / go-to-market): the positioning + promise, with honest claims.

Reuse what already exists (Wk1 problem → Wk2 spec/`s.shape` → the build-plan press release); the work is
**naming the skill, adding a vague-vs-clear contrast, and adding an honest-claims check** — not new weeks.

## Why
In an AI world the scarce skill isn't "use AI to build" — it's thinking clearly enough to make AI build the
*right* thing and say *true* things. That's the program's own thesis (edge = taste + clarity), it generalizes
beyond building (essays, research, work), and it's the exact gap that wastes people's time when their first
prompt is a vague wish instead of a brief.

## Users & trigger
Enrolled student, in the dashboard:
- **Weeks 1–2** — the build brief.
- **Go-live / go-to-market (≈Wk 7–8)** — the tell brief.

## Behavior
**Framing (tool-agnostic, so it won't go stale):** "You are the director; the AI is the builder. A good brief
states **Goal · Why · Who it's for · What 'done' looks like · What's out of scope.**"

**Half 1 — Brief to build (Wk 1–2):**
- Keep Wk1 (find a problem) and Wk2 spec (`s.shape`).
- Add a short primer card: what makes a good brief, framed as *directing your AI*.
- Add a **vague-vs-clear contrast** (worked example: a lazy one-line prompt vs. their spec'd prompt, and why
  the second works). Lightweight, experiential — not a graded task.
- Reinforce that the existing copy-to-AI build prompt **is** their brief to the AI.

**Half 2 — Brief to tell (Act 2 / go-live):**
- Extend the press release into a short **positioning brief**: what it is, who it's for, the one promise, the
  voice, and the rule — **what's TRUE NOW vs. what's the GOAL.**
- Teach **honest claims**: mark real-now vs. aspirational and phrase it that way (mirrors our own site edits —
  "learn to grow," not "grow into a business"; "go after customers," not "got customers").
- **Writing the marketing copy is the student's own exercise in their AI** (Claude Pro). The dashboard
  gives them a **copy-to-AI prompt that wraps their positioning brief** — exactly the build-week pattern —
  not a built-in generator. We guide and hand them the prompt; they produce the copy themselves.

Keep it **ONE evolving product brief** for the student (build half + tell half) — not two docs. No heavy new UI;
reuse existing cards/components (primer card, build layer, the press-release fields).

## Done when (acceptance)
- [ ] Wk1–2 explicitly names "you are directing your AI" + a good-brief primer (Goal/Why/Who/Done/Out-of-scope).
- [ ] A concrete vague-vs-clear contrast example is shown (on-brand worked example).
- [ ] The press release is extended with a "the one promise" + "true now vs. goal" prompt.
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
- **OPEN (your call):** where the "tell" brief lands. **Proposed: Week 7 (Go Live)** — the product goes public
  there, so it needs honest public-facing copy at that moment; Week 8 (Funnel) then *uses* that copy to drive
  find → try → return. Confirm Wk7, or move it to Wk8.
- **RESOLVED:** writing the copy is the student's exercise in their own AI — the dashboard provides a copy-to-AI
  prompt (build-layer pattern), not a server-side generator. Keeps it hands-on; no copy-gen feature to build.
- Keep it age-appropriate: one product brief, not two docs.
