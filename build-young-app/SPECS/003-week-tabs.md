# Spec: 003 — Week view as horizontal tabs

**Status:** draft (awaiting approval — no code until then)
**Owner:** Sunil Garg
**Date:** 2026-06-07

## What
Replace the long vertical stack in each week's view with **horizontal tabs**:
**Pre-req · What you'll learn · Class example · Your exercise** — so a week is scannable, not a scroll.

## Why
With the objectives card + "director" primer + worked example + the exercise + the tools checklist all
stacked, the week view got long and complicated. Tabs cut the scrolling and make the
kickoff → learn → example → do flow obvious at a glance.

## The tabs (and what goes in each)
1. **Pre-req** — the tools/setup a week needs (Claude Pro, GitHub, Vercel…). *Currently embedded inside
   `ShapePlan` ("Set up your tools") and `BuildLayer` (pre-reqs)* — extract into this tab.
2. **What you'll learn** — the objectives card (`weekObjectivesCard`).
3. **Class example** — the worked example (`weekExample`) + any `materials` resource links.
4. **Your exercise** — the week's activity (`weekActivity`: BuildPlan / ShapePlan / BuildLayer / …).

## Behavior (proposed defaults — confirm)
- Tabs sit at the top of the week view. **Empty tabs are hidden** (most weeks have no pre-req; some have no
  example) — a week shows only its relevant tabs.
- **Default tab = "What you'll learn"** (the class kickoff) when present, else the first available tab.
- Applies to **both** the current-week panel (`WeekPanel`) and the selectable Course-progress view
  (`CoursePanel`) — via **one shared `WeekTabs` component** so they can't drift.
- Reuse the existing `.tab` style; on mobile the tab row scrolls/wraps.
- **Content is unchanged** — this is reorganization, not new copy. (The "edit any time" note moves into
  the Your-exercise tab.)

## Done when (acceptance)
- [ ] Each week renders as up-to-4 horizontal tabs; empty sections show no tab.
- [ ] Pre-req content is extracted into the Pre-req tab (and no longer duplicated inside the activity).
- [ ] Shared `WeekTabs` used by both `CoursePanel` and `WeekPanel`.
- [ ] Default tab = "What you'll learn"; switching tabs doesn't lose any in-progress input (state lives above).
- [ ] Keyboard-accessible tabs (reuse `act()`/`.tab`), mobile tab row scrolls; a11y + perf hold.
- [ ] Build clean; 200 tests green.

## Out of scope
- Changing any week's content/copy or which sections a week has.
- The Overview / Dashboard top-level tabs (those stay).

## Surfaces & sources of truth
- Code → `CLAUDE.md` (CoursePanel/WeekPanel, `weekActivity`/`weekExample`/`weekObjectivesCard`, PREREQS,
  the `.tab` class; preserve the `navLock`/`setState(prev=>…)` patterns + a11y/perf bars).
- Touches: `src/App.jsx` (new `WeekTabs`; refactor CoursePanel + WeekPanel; extract pre-reqs from
  ShapePlan/BuildLayer).

## Risks / open questions
- **Visual change I can't verify** — founder reviews on the deploy.
- **Pre-req extraction** touches ShapePlan + BuildLayer — must not lose the tools checklist or its state.
- **Tab state** must live above the activity so typing in "Your exercise" isn't lost when switching tabs and back.
- Confirm: hide-empty-tabs (vs. always show 4), and default = "What you'll learn".
