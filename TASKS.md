# Build Young — task backlog (the loop's queue + state)

This file is the **durable state** for the autonomous loop (see `ENGINEERING-PLAYBOOK.md` §9). The loop drains it
top-to-bottom: it picks the first unchecked task, implements it, has a separate verifier check it,
ships it, marks it done, and moves on. Because it's committed to git, it **survives container resets**
— a fresh session re-reads this file and resumes where the last one stopped.

**You (the human) own this file.** Add tasks as goals + acceptance criteria; the loop does the rest.
Keep each task small, single-feature, and independently shippable (one file/feature where possible).

> Not-yet-scheduled ideas live in [`BACKLOG.md`](./BACKLOG.md) (a parking lot the loop ignores).
> Promote one into this file as a task when it's ready to build.

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

## [ ] T13 — Halve every page's scroll height (≥50%) and keep it there — without trimming content  ·  risk: high
Goal: cut each live page's rendered vertical scroll height by **≥50% versus today's baseline** — on a
390px mobile viewport *and* on desktop — and **lock it in with an automated guard** so it can never
silently re-inflate. **Existing content must NOT be trimmed:** every word, section, claim, CTA, and chart
stays present and reachable in the DOM. The reduction comes from **structure / progressive disclosure**,
not deletion — spacing alone is exhausted (the T12 padding pass bought only ~2–3%; see Done). Ship
incrementally, **one screen per PR, landing FIRST** (funnel entry).
Baselines (measured 2026-06-14, built app, `document.documentElement.scrollHeight`):
- **Landing** — 390px: **11,157px → target ≤ 5,579** · 768px: 7,048 → ≤ 3,524 · 1280px: 6,743 → ≤ 3,372.
- (Re-measure each follow-on screen the same way and record its baseline + 50% ceiling in its PR.)
Acceptance criteria (per screen):
- Rendered `document.documentElement.scrollHeight` at **390px wide ≤ 50% of that screen's recorded
  baseline** (and ≤50% at 1280px). Measure on the **built app via a headless browser** (jsdom has no
  layout engine, so it can't measure this) — not an eyeball estimate.
- **Zero content removed.** Every existing paragraph/section/claim/CTA/chart is still in the DOM and
  reachable — e.g. behind an accordion, a "Read more" expander, tabs, a carousel, or a denser
  multi-column grid on wider viewports (collapsed or re-laid-out, **never cut**). POSITIONING.md voice +
  claims verbatim; no copy changes.
- **"Maintain it all the time" — permanent guard:** add an automated page-height check that asserts each
  shipped screen stays **≤ its 50% ceiling**, wired into the standing guards/CI so **every future PR runs
  it** and a regression that re-inflates the page **fails the build**. Record the ceilings in the test so
  they are the durable contract (this is the half of the task that makes the win stick).
- Preserve behavior + a11y: every collapsible is keyboard-operable with correct `aria-expanded`/labels,
  focus styles + contrast intact, `navLock` + scroll-restore unchanged, recharts lazy-split + JS budget
  preserved; `act()`-tested clickables still pass.
- Note before/after height (**px and %**) in the PR so the win is visible.
- `npm run build` + `npx vitest run` + the new height guard all green.
Files (landing first): `build-young-app/src/Landing.jsx` (+ a small reusable collapsible/section helper if
shared; the height-guard test + its headless harness/config). Follow-on screens (own PRs): `Enroll.jsx`,
`BookCall.jsx`, `Platform.jsx`.
Stop-and-ask if: it's outward-facing **and now a real UX/structural change** (progressive disclosure
changes what users see first) — implement, open a PR, and **pause for the founder's screenshot review**
before merge. Also stop if hitting 50% would force cutting real content or a copy change — the no-trim
rule is hard, so that bounces back as a separate human decision.

---
<!-- Completed tasks are checked off and moved below this line by the loop, newest first. -->
## Done

## [x] T12 — Audit & tighten the current pages for less scrolling (landing first)  ·  risk: med
Done (landing-page increment — founder-approved the screenshots, then merged): a spacing/padding-only pass
on `Landing.jsx` applying the House-style "optimize for less scrolling" rule — tightened the hero stack
+ every section's padding/inter-block gaps so the **primary CTA ("Pick a batch & enroll") now sits in the
first mobile viewport** (390px), where before it barely peeked past the cut-off hero preview. No copy,
sections, CTAs, behavior, or a11y changed (verified line-by-line + before/after mobile screenshots on the
Sonnet tier); recharts lazy-split + JS budget preserved; build + 237 tests green. Outward-facing visual,
so it paused for the founder's sign-off before merge (per the Stop-and-ask). **Follow-on screens remain
(not auto-created): `Enroll.jsx`, `BookCall.jsx`, `Platform.jsx` — promote to a task when ready.**

## [x] T11 — Fix inflated traffic & engagement metrics (foreground-only dwell + exit per session)  ·  risk: med
Done: the founder dashboard's Traffic & engagement numbers were inflated because `flush()` ran on every
`visibilitychange → hidden` and measured wall-clock time (so idle/backgrounded time counted as dwell —
~20 min on landing — and an `exit`+`screen_view` fired on every tab-hide → 78 exits > 77 views > 46
visits). Fixed: **App.jsx** now records **foreground-only dwell** (accumulate active time, pause on hide,
resume on visible) and emits **one `screen_view` per visit** (a `flushed` guard, at the first of
navigation/hide/close); `exit` still fires on hide/close. **`funnel.js engagement()`** dedupes exits to
**one per session** (`sid`, last screen wins) so exits ≤ sessions; legacy no-sid exits counted
individually. **FounderDashboard.jsx** adds `countryName()` (CA→Canada, US→United States) on the country
breakdowns so a country code can't be confused with the California state code in "US visits by state."
`funnel.test.js` exit test uses sids + asserts dedup. Behavioral (the `exit` event's meaning changed —
read historical data accordingly); aggregate, no PII. Build + 237 tests green; independently verified on
the Sonnet tier.

## [x] T10 — Make the loop model-tiered (cheap execution, premium reasoning)  ·  risk: high
Done (human-approved the Sonnet tier + merge — high-risk pause honored): the loop/ship flows now tier the
model to the role. The independent **verifier** sub-agent runs on a **Sonnet-class** model
(`model: "sonnet"` via the Agent tool), and the premium frontier model is reserved for planning,
architecture/design, and `risk: high` tasks. Cheapen the *work*, not the *rigor* — the cheaper verifier
still re-runs build/tests, grades the diff, and runs every standing check (floor: never below Sonnet).
Policy: `ENGINEERING-PLAYBOOK.md` §9 (portable) + `build-young-app/CLAUDE.md` (project); both `/run-loop`
and `/ship` spawn the verifier on the cheaper tier; `BUILD-YOUNG-ARCHITECTURE.md` component table reflects
the tiers; `run-loop.yml` notes the cloud Action is a single all-in-one agent (no fan-out) so it stays
premium. Tiers named by family alias, not a dated string. Docs/skills/workflow only — build + 237 tests
green; **independently verified by a Sonnet-tier sub-agent (dogfooding the change).**

## [x] T9 — Make every crawlable surface 100% accurate + fix the search-result favicon  ·  risk: low
Done: audited all crawlable surfaces — **no stale money/finance positioning anywhere** (the old SERP
snippet is pure Google cache); JSON-LD price (999) matches `cohorts.js`; title/desc/OG/Twitter/canonical
consistent. Aligned two descriptive "teens" → "high schoolers"/"they" (JSON-LD + llms.txt). **Favicon:**
the SERP showed a generic globe (only an SVG favicon existed), so generated raster icons from the brand
mark — `favicon.ico` (16/32/48), `favicon-96x96.png`, `apple-touch-icon.png` (180) — and declared them
in `index.html`. Build + 237 tests green. Human follow-through (not loop-able): GSC → Request Indexing +
monitor until Google re-crawls (it controls timing).

## [x] T5 — Make the App.jsx router data-driven (routes registry)  ·  risk: high
Done (human-authorized to merge without the usual high-risk pause): App.jsx routing is now a single
`ROUTES` registry (`{ key, path, title, desc, el }`); the render block and the URL-path/`<title>`
effect both derive from it, so adding a screen is one appended entry. Behavior unchanged — same
component/props per route, the `app` route keeps its `state` guard, paths + per-route titles match the
old maps, `verify` keeps `/verify/<id>`. nav/goBack/navLock/scroll-restore/deep-link load untouched.
Independently verified route-by-route. Build + 237 tests green.

## [x] T8 — Break down US traffic by state  ·  risk: med
Done: `api/funnel.js` stamps a `region` (2-letter US state) on `visited` only when country is `US`,
from Vercel's `x-vercel-ip-country-region` header — **server-stamped, NOT in `ALLOWED_PROPS`** (so it
can't be spoofed, mirroring `country`; an intentional security improvement over the task's literal
wording). `engagement()` adds an additive `usStates: [{region,count}]` (US-only, region-required,
descending); the "Where visitors come from" card shows a "US visits by state" line (hidden when none).
New engagement test + updated exact-shape assertion. Aggregate, no PII. Suite 35 files / 237 passing.

## [x] T7 — Show country in the "Top paths through the site" view  ·  risk: med
Done: `journeys()` now joins each visit's server-stamped `country` (via the visit's `sid`, now also
on the `visited` event) and returns it additively — `byCountry` per path + an overall `countries`
tally (existing `steps/left/count`/`sessions` unchanged). The "Top paths" card shows a "Top countries"
line + per-path flags (unknown → "—"). Aggregate, no PII (sole join key is the existing ephemeral
`sid`; country is server-only, not client-settable). New journeys test; suite 35 files / 235 passing.

## [x] T4 — Add render tests for the certificate route + card  ·  risk: med
Done: `test/cert-ui.test.jsx` (4 tests) — `CertifyVerify` verified path (mocked `/api/cohorts?cert=`
→ name + "Verified by Build Young" + correct lookup URL) and not-found path; `CertificateCard` renders
the graduate name + all three actions (Add to LinkedIn / Download / View public page) and renders
nothing without a cert. Tests only — no app source. Suite 35 files / 234 passing.

## [x] T3 — Co-locate tests per feature module  ·  risk: med
Done: split `test/app.test.jsx` (10 tests) into per-feature files — `Landing.test.jsx` (2),
`Enroll.test.jsx` (3), `Legal.test.jsx` (2), `Platform.test.jsx` (3); removed the monolith. Tests
moved verbatim; suite stays 34 files / 230 passing (no coverage lost). Tests only — no app source.

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

## [x] T6 — Create BUILD-YOUNG-ARCHITECTURE.md (living diagrams) + the keep-it-updated rule  ·  risk: med
Done: `BUILD-YOUNG-ARCHITECTURE.md` added at the repo root with two **Mermaid** diagrams + component tables —
(1) the agentic loop (triggers incl. the new issue-triggered `run-loop.yml` Action → durable state →
driver → doer → verifier → ship/pause → live, plus the always-on guards/hooks/MCP/worktrees machinery)
and (2) the app (App.jsx router → screen modules → foundation modules → `api/` serverless endpoints →
KV + Stripe/Resend/Vercel/Anthropic). Module/endpoint names match the repo. The **living-document
rule** is installed in `build-young-app/CLAUDE.md` (any PR changing a module/endpoint/skill/hook/
service or the loop flow updates BUILD-YOUNG-ARCHITECTURE.md in the same PR). Docs only — no app code touched.
