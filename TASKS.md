# Build Young — task backlog (the loop's queue + state)

This file is the **durable state** for the autonomous loop (see `LOOP.md`). The loop drains it
top-to-bottom: it picks the first unchecked task, implements it, has a separate verifier check it,
ships it, marks it done, and moves on. Because it's committed to git, it **survives container resets**
— a fresh session re-reads this file and resumes where the last one stopped.

**You (the human) own this file.** Add tasks as goals + acceptance criteria; the loop does the rest.
Keep each task small, single-feature, and independently shippable (one file/feature where possible).

## Format
```
## [ ] T<id> — <title>  ·  risk: low | med | high
Goal: one sentence — what "done" looks like.
Acceptance criteria:
- concrete, checkable conditions (the verifier checks these)
- build + tests stay green (always implied)
Files: likely file(s) to touch
Stop-and-ask if: (optional) conditions that should bounce back to the human
```
Risk drives autonomy: `low`/`med` the loop ships on its own; `high` it implements + opens a PR but
**stops for you** (architectural / behavioral / money-auth / ambiguous).

---

## [ ] T1 — Remove the unused lazy `Charts` import from App.jsx  ·  risk: low
Goal: App.jsx no longer declares `const Charts = React.lazy(...)` if nothing in App.jsx uses it (it moved to FounderDashboard.jsx).
Acceptance criteria:
- confirm `Charts` is not referenced anywhere in `src/App.jsx` (only the import/declaration); if truly unused, remove the declaration
- `npm run build` succeeds; `npx vitest run` stays green (230 passing)
Files: build-young-app/src/App.jsx
Stop-and-ask if: `Charts` turns out to be referenced in App.jsx (then it's not dead — skip and note it).

## [ ] T2 — Refresh the stale technical sections of build-young-app/README.md  ·  risk: low
Goal: the README's "go-live" / "project layout" sections describe the CURRENT app, not the old money-sim monolith.
Acceptance criteria:
- the "market-news scheduler" section reflects the current cron (class-reminders, not a market-news drip) — cross-check `api/cron/` + CLAUDE.md
- pricing/batch ids that say `$599 MS / $799 HS` and `ms-mon/hs-wed` are corrected to the current per-cohort model (high-school only)
- "Project layout" reflects the split (App.jsx is the router; features in their own files) — mirror CLAUDE.md's module map
- no code changed; build + tests unaffected
Files: build-young-app/README.md
Stop-and-ask if: a fact is genuinely unclear from the codebase (don't invent specifics).

## [ ] T3 — Co-locate tests per feature module  ·  risk: med
Goal: split the monolithic `test/app.test.jsx` into per-feature test files so a failure names one owner (loop-engineering: independent verification per slice).
Acceptance criteria:
- the Landing render+a11y tests live in `test/Landing.test.jsx`; the Enroll-flow tests in `test/Enroll.test.jsx`; the Course-hub tests in `test/Platform.test.jsx`
- no test coverage is lost — total passing count is >= the current 230
- `npm run build` + `npx vitest run` green
Files: build-young-app/test/app.test.jsx (+ new per-feature test files)
Stop-and-ask if: splitting would require changing app source (it shouldn't — tests only).

## [ ] T4 — Add render tests for the certificate route + card  ·  risk: med
Goal: close the under-tested cert UI gap (CertifyVerify `/verify/<id>` page + CertificateCard) flagged during the split.
Acceptance criteria:
- a test mounts `CertifyVerify` with a mocked `/api/cohorts?cert=` response and asserts the verified certificate renders (and the not-found path)
- a test renders `CertificateCard` with a sample cert and asserts the name + actions show
- green build + tests; new tests included in the count
Files: build-young-app/test/cert-ui.test.jsx (new), imports from src/Certificate.jsx
Stop-and-ask if: the components need prop/context wiring that isn't obvious.

## [ ] T5 — Make the App.jsx router data-driven (routes registry)  ·  risk: high
Goal: convert routing so adding a screen is an append-only registry entry (the deferred parallel-work optimization in CLAUDE.md), removing App.jsx as a per-feature edit point.
Acceptance criteria:
- routes are a table/registry; `nav`/render derive from it; adding a screen = one appended entry
- all existing navigation behavior + tests unchanged (back-stack, scroll restore, deep links)
Files: build-young-app/src/App.jsx
Stop-and-ask: YES — this is architectural. Implement on a branch, open a PR, and STOP for human review before merge.

---

<!-- Completed tasks are checked off and moved below this line by the loop, newest first. -->
## Done
