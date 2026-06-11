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

## [ ] T7 — Show country in the "Top paths through the site" view  ·  risk: med
Goal: surface visitor **country** in the founder dashboard's "Top paths" (journeys) section — the chart currently shows only the ordered screens per visit, with no geography.
Context (already in code — build ON this, don't re-collect): the `visited` event is already stamped server-side with a 2-letter `country` (`api/funnel.js` from Vercel's `x-vercel-ip-country` header; in `ALLOWED_PROPS`). `src/funnel.js` `engagement()` already returns `countries` + `sourceCountry`, and there's a country→flag helper in `FounderDashboard.jsx`. The gap is that `journeys()` stitches `screen_view`/`exit` by `sid` and never joins the visit's country, and the "Top paths" card shows no country.
Acceptance criteria:
- `journeys()` in `src/funnel.js` joins each visit's `country` (map the visit's `sid` → the `country` on that visit's `visited`/events) and returns it per traced visit/path (additive — existing return shape stays back-compatible)
- the "Top paths through the site" card in `FounderDashboard.jsx` shows country per path (e.g. a small flag + code, or a per-path country breakdown), AND a compact standalone "Top countries" line/list is shown for traffic (reuse the existing `countries` from `engagement()` if simpler) — pick the cleaner UX; keep it calm/aggregate, no PII
- aggregate-only, no new data collected, no per-visitor identifier beyond the existing ephemeral `sid`; visits with no country render gracefully (e.g. "—"/"Unknown")
- `test/funnel.test.js` gains a case asserting `journeys()` carries country; `npm run build` + `npx vitest run` green (count ≥ current)
Files: build-young-app/src/funnel.js, build-young-app/src/FounderDashboard.jsx, build-young-app/test/funnel.test.js
Stop-and-ask if: joining country to a journey would require storing an IP or any non-ephemeral identifier (it must not) — then stop.

## [ ] T8 — Break down US traffic by state  ·  risk: med  ·  (do after T7)
Goal: for visits whose country is **US**, show a **state/region** breakdown in the founder traffic view (the natural drill-down under country).
Context: only `country` is captured today; the region is NOT. Vercel exposes the subdivision via the `x-vercel-ip-country-region` header (e.g. `WA`, `CA`) alongside the country header already read in `api/funnel.js`.
Acceptance criteria:
- `api/funnel.js` stamps a `region` prop on `visited` (US state code) ONLY when country is `US`, validated/short like the existing country stamp, and `region` is added to `ALLOWED_PROPS`
- `src/funnel.js` `engagement()` aggregates a US-state breakdown (additive field, e.g. `usStates: [{ region, count }]`, descending)
- `FounderDashboard.jsx` shows the US-state breakdown (only meaningful when US traffic exists; empty/absent renders gracefully) — keep it aggregate, no PII
- `test/funnel.test.js` covers the US-state aggregation (incl. non-US visits excluded); `npm run build` + `npx vitest run` green (count ≥ current)
Files: build-young-app/api/funnel.js, build-young-app/src/funnel.js, build-young-app/src/FounderDashboard.jsx, build-young-app/test/funnel.test.js
Stop-and-ask if: surfacing state-level geo for a site serving minors feels like it crosses from coarse/aggregate analytics into per-visitor tracking — it should stay aggregate counts only (no IPs, no per-visitor rows). If that can't be guaranteed, stop.

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

## [x] T2 — Refresh the stale technical sections of build-young-app/README.md  ·  risk: low
Done: refreshed the go-live + layout sections to the current app — class-reminder cron (not a
market-news drip), high-school-only cohorts (`fall-mw`/`fall-tt`, one $999 price; no MS/HS tiers),
`CONFIG` now in `src/lib.js` + founder-console live-editing, server/KV-authoritative state, and a
Project-layout block mirroring CLAUDE.md's module map (App.jsx = router; screens + foundation + the
real `api/` set). Docs only — build + 230 tests green.

## [x] T1 — Remove the unused lazy `Charts` import from App.jsx  ·  risk: low
Done: removed the dead `const Charts = React.lazy(() => import("./Charts.jsx"))` (+ its comment) from
the router; charts are lazy-loaded from FounderDashboard.jsx. Build still code-splits recharts; 230
tests green.

## [x] T6 — Create ARCHITECTURE.md (living diagrams) + the keep-it-updated rule  ·  risk: med
Done: `ARCHITECTURE.md` added at the repo root with two **Mermaid** diagrams + component tables —
(1) the agentic loop (triggers incl. the new issue-triggered `run-loop.yml` Action → durable state →
driver → doer → verifier → ship/pause → live, plus the always-on guards/hooks/MCP/worktrees machinery)
and (2) the app (App.jsx router → screen modules → foundation modules → `api/` serverless endpoints →
KV + Stripe/Resend/Vercel/Anthropic). Module/endpoint names match the repo. The **living-document
rule** is installed in `build-young-app/CLAUDE.md` (any PR changing a module/endpoint/skill/hook/
service or the loop flow updates ARCHITECTURE.md in the same PR). Docs only — no app code touched.
