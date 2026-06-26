# Spec: Track the scholarship application as its own screen

> One feature = one short spec. Decisions go here; the PR implements them.

**Status:** approved
**Owner:** Sunil Garg
**Date:** 2026-06-26

> **Approved 2026-06-26:** screen key `enroll-scholarship`, label "Scholarship application"; scope = track it as
> its own screen (panels stay whole-site), per the two recommended decisions.

## Why
On the founder console, selecting the **Scholarship** segment changes the funnel + **Drop-off** (they use
`SCHOLARSHIP_STAGES`), but **Traffic & engagement** and **Top paths** don't reflect scholarship at all. Root
cause: those two panels are built from anonymous `screen_view`/`exit` events that carry only a random session
id — **no source, no cohort** — and the scholarship application isn't its own screen: it runs *inside* the
`enroll` flow (`Enroll.jsx` in `isFree` mode), so a scholarship applicant and a paying enroller both register
as the **`enroll`** screen. There's nothing in that data to tell them apart.

Fix the signal at the source: emit a **distinct screen key** when the enroll flow is the funded/apply flow.
Then the existing whole-site panels gain a real, clearly-labeled scholarship row **for free** — `engagement()`
and `journeys()` are already generic over screen keys, so a new screen flows into "Which screens hold
attention," "Where they leave," and Top paths with no change to either function.

## What
### 1. Emit a distinct screen key for the funded apply flow (`App.jsx`)
In the screen-view effect, derive the screen key: when `route === "enroll"` **and** the preselected batch is
**free (`price === 0`)**, record the screen as **`enroll-scholarship`** instead of `enroll` (for both
`screen_view` and the `exit` event, via `screenRef`). Everything else (the `/enroll` URL, the `ROUTES`
registry, the funnel `enroll_started`/`enrolled` events) is unchanged — this only relabels the *engagement*
screen key.

### 2. Give it a friendly label (`FounderDashboard.jsx`)
Add `"enroll-scholarship": "Scholarship application"` to `SCREEN_LABELS`. No other dashboard change — the
screen now appears as its own row in the two engagement cards and as its own node in Top paths automatically.

### 3. (No change to `funnel.js`)
`engagement()` and `journeys()` already key on whatever `screen` string they're given. Confirm with a test.

## Decisions (recommendation in **bold**)
1. **Screen key + label:** key **`enroll-scholarship`**, label **"Scholarship application"**. (Alt key:
   `apply-free`.)
2. **Scope:** **just track it as its own screen** (the chosen direction) — the panels stay whole-site; the
   founder now *sees* a scholarship-application row/path. NOT in scope: filtering Traffic/Top-paths to
   scholarship-only sessions (a later option if wanted).

## Done when (acceptance)
- [x] When the enroll flow is entered for a **funded ($0)** cohort, the emitted `screen_view`/`exit` carry
      `screen: "enroll-scholarship"`; for a **paid** cohort they still carry `screen: "enroll"`. (Logic in the
      pure `engagementScreen(route, batch)` helper, `src/lib.js`; App.jsx calls it in the screen-view effect.)
- [x] The founder console shows **"Scholarship application"** as a distinct row in "Which screens hold
      attention" / "Where they leave" and as its own node in Top paths (`SCREEN_LABELS` + `engagement`/`journeys`).
- [x] `engagement()`/`journeys()` distinguish the new screen from `enroll` (test/engagement-screen.test.js).
- [x] Build + tests green (441); docs synced (CLAUDE.md analytics/screens note; arch doc checked — no new
      module/endpoint/route, just a new screen key + a foundation helper, so no arch-doc change).

> **Note on the App-level test:** the emit logic lives in the pure `engagementScreen` helper, unit-tested
> directly (free→`enroll-scholarship`, paid→`enroll`, other routes/null-batch→route). This is stronger than a
> full App render+`track` spy — `track()` is a deliberate no-op in tests, so a render couldn't observe the emit
> anyway; the helper *is* the decision and App.jsx only calls it.

## Limitations (called out, not silently)
- **Going forward only** — no backfill; past scholarship applicants already logged as `enroll` stay that way.
- **Approximation** — keyed off the *initially-clicked* batch. Reliable for scholarship because the funded
  enroll flow **locks the cohort picker**, so the preselected free batch can't be switched to a paid one.

## Out of scope
- Filtering Traffic & engagement / Top paths to scholarship-only sessions.
- A separate `/apply` URL or per-screen SEO `<title>` (this is an analytics-only relabel).

## Risk
Low. Client-side analytics relabel + one dashboard label string. No public-copy, money, auth, module,
endpoint, or route change.
