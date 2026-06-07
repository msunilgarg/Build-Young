# Spec: 002 — Per-week class objectives ("What you'll learn this class")

**Status:** approved — implementing
**Owner:** Sunil Garg
**Date:** 2026-06-07

## What
A short **"What you'll learn this class"** objectives block at the **top of every week's activity** — the
in-dashboard version of the kickoff slide. Per-week (all 12), and **founder-editable** from the console.

## Why
The site promises "no slideware, no lectures." Capturing each class's objectives in the dashboard (instead of a
slide) makes that real, and gives students the "here's what we'll do today" kickoff before they start doing.

## Users & trigger
- **Student** — sees the objectives at the top of each week's activity (Course-progress tab + current-week panel).
- **Founder** — edits the 12 weeks' objectives in the console (live, no redeploy).

## Behavior
- **Framing matters:** objectives are **what you'll LEARN** (the durable takeaway / insight), **not what
  you'll DO** (the activity). "A clear brief beats a vague wish" — not "write a spec." Takeaways, not a to-do list.
- **Mirror the homework infrastructure exactly** (it's proven): code defaults + KV store + public read + console editor.
  - Defaults: `WEEK_OBJECTIVES` (12 strings, newline-separated bullets) in `src/marketMedia.js` (dependency-free).
  - Store: `api/_lib/objectivesStore.js` (KV key `course:objectives`), cloned from `homeworkStore.js` — load/save, sanitize to 12 strings, fall back to defaults.
  - Public read: folded into `GET /api/cohorts` (`objectives`), like `homework`.
  - Save: founder-gated `PUT /api/funnel?resource=objectives`.
- **Client:** mutable `OBJECTIVES` module var (defaults to `WEEK_OBJECTIVES`), hydrated from `/api/cohorts` on load (mirrors `HOMEWORK`).
- **Render:** a calm "What you'll learn this class" card (bullets = the week's lines), at the top of the week
  view — in `CoursePanel` (before "Class materials") and `WeekPanel` (before "Class material"). Empty week → no card.
- **Editor:** `ObjectivesEditor` (clone of `HomeworkEditor`) in the founder console, near the homework editor.

## Done when (acceptance)
- [ ] `WEEK_OBJECTIVES` seeded for all 12 weeks (2–3 bullets each).
- [ ] Objectives card renders at the top of each week's activity (both panels); empty → hidden.
- [ ] Founder can edit all 12 in the console; saves live via `PUT ?resource=objectives`; hydrates from `/api/cohorts`.
- [ ] `objectives-store.test.js` mirrors `homework-store.test.js` (defaults / sanitize-to-12 / load-save).
- [ ] Build clean; full suite green; a11y (aria-labels) + landing perf unaffected.

## Out of scope
- Per-cohort objectives (these are course-wide, like homework).
- Rich formatting beyond simple bullets.

## Surfaces & sources of truth
- Copy/voice → `POSITIONING.md` (calm, no slideware — this *is* that promise).
- Code → `CLAUDE.md` (mirror the homework pattern; keep `WEEK_TITLES`/`WEEK_PREP` siblings in sync).
- Touches: `src/marketMedia.js`, `api/_lib/objectivesStore.js` (new), `api/cohorts.js`, `api/funnel.js`,
  `src/App.jsx` (module var + hydrate + render in CoursePanel/WeekPanel + ObjectivesEditor), `test/objectives-store.test.js` (new).

## Risks / open questions
- Keep it short — objectives, not a syllabus dump (don't recreate slideware in text).
- Default ON for all weeks; founder can clear a week (empty = no card), same as homework.
