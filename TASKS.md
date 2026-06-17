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

## [ ] T14 — Make cohort *pace* a per-cohort property (decouple "exercise" from "7-day week")  ·  risk: high
Goal: the course's atomic unit becomes the **3-hour exercise** (12 exercises = 36 hrs, invariant), and a
cohort carries *how fast it delivers them*, so the same curriculum can run as the 12-week flagship OR a
compressed schedule — with **today's behavior reproduced exactly when the new fields are absent/default**.
Acceptance criteria:
- `src/cohorts.js`: each cohort gains optional pace fields (e.g. `weeksTotal`, `sessionsPerWeek` — or an
  explicit session schedule) with **defaults = today's 12 / 2-per-week / 7-day cadence**. No new *cohort*
  added in this task (schema + defaults only).
- `src/courseDates.js`: `coursePosition`, `classMeetingOn`, `nextClass`, `sessionDate`, `checkinDateLabel`,
  and `refundFor` stop hard-coding `12` / `÷12` / `% 7` / "2 sessions" and instead derive from the cohort's
  pace — progression keyed off **exercises delivered**, the end/grad date off the cohort's real schedule.
- **Invariance proof:** all existing cohorts (no pace fields) behave **identically** — every current
  `test/engine.test.js` / `test/schedule.test.js` case stays green unchanged.
- New unit tests cover the pace math at a compressed cadence (e.g. 3 exercises/week → exercise N on the
  right calendar day; correct end/grad date; refund prorates over the cohort's own total).
- Curriculum content, per-exercise activities, and the certificate are untouched (already exercise-indexed).
Files: `src/courseDates.js`, `src/cohorts.js`, `api/_lib/cohortStore.js` (normalize/carry the new fields),
`test/engine.test.js`, new `test/course-pace.test.js`
Stop-and-ask if: (a) **delivery shape** — confirm an exercise is delivered as two 90-min sessions (current
model, the default) vs one 3-hr session; (b) **refund "first week" window** — confirm it means the first 7
calendar days (student-friendly, default) vs the first exercise. Both diverge once exercises come fast — get
the human's call at the PR pause before dependent tasks build on the model.

## [ ] T15 — Dashboard progress + "next class" become pace-truthful  ·  risk: med
Goal: the student dashboard reports progress as **"Exercise N of 12"** (pace-agnostic) and shows the next
live session from the cohort's **real schedule**, so an accelerated cohort isn't mislabeled "Week N of 12".
Acceptance criteria:
- Progress indicator/pill is exercise-based (reads `coursePosition`); for a flagship 12-week cohort it still
  reads naturally (exercise 6 ≈ week 6) — i.e. flagship UX visibly unchanged.
- The "next class" banner + pre-start countdown derive from the cohort schedule (real end date, next session
  could be sooner than +7 days), not `start + (week−1)×7`.
- The 3-act journey, per-exercise activities, withdrawal, and cert card render unchanged.
Files: `src/Platform.jsx`, `src/courseDates.js` (consume only — no new behavior), `test/Platform.test.jsx`
Stop-and-ask if: the change is outward-facing visual — pause for a screenshot sign-off before merge (per the
T12/T13 pattern).

## [ ] T16 — Add the 4-week intensive cohort + honest cohort cards  ·  risk: med
Goal: a real intensive cohort exists and the enroll surfaces tell the truth about pace, with the **flagship
12-week messaging kept as the headline** (the intensive is an *alternate schedule*, not a rebrand).
Acceptance criteria:
- `src/cohorts.js`: one intensive `BATCHES` row using T14's pace fields (12 exercises over ~4 weeks; price
  per the founder's call — default same `$999`).
- Landing "Upcoming batches" card + enroll dropdown show, for the intensive: a computed **end date**, the
  **meeting pattern**, and **hours/week**, plus one line tying them together ("the same 36-hour, 12-exercise
  course — choose your pace"). Flagship cards/copy unchanged.
- `landing-lean` guard stays green (no long-form added); a11y preserved.
Files: `src/cohorts.js`, `src/Landing.jsx`, `src/Enroll.jsx`, relevant tests
Stop-and-ask if: outward-facing copy/visual — pause for sign-off; confirm the intensive's price + exact dates.

## [ ] T17 — Founder schedule, class reminders & funnel curve follow the cohort pace  ·  risk: med
Goal: the founder/ops surfaces and analytics work for any pace, not just weekly.
Acceptance criteria:
- Founder console teaching-schedule view ("what am I teaching today/next") computes from the cohort's real
  schedule (handles several sessions/week), not the `%7` day-pair.
- The cron "prepare for next session" reminder fires per the actual schedule (multiple per week).
- The funnel progression curve becomes **exercise 2→12** (still 12 points) so intensive and standard cohorts
  stay comparable on one chart.
Files: `src/FounderDashboard.jsx`, `api/_lib/schedule.js`, `api/cron/market-news.js`, `src/funnel.js`,
`api/funnel.js`, `test/schedule.test.js`, `test/funnel.test.js`

## [ ] T18 — Make class/exercise completion manually controllable from the admin dashboard  ·  risk: high
Goal: the founder can mark a cohort's progress (which exercises are complete) by hand from the founder
console, instead of completion being computed *only* from the calendar — so a class that runs ahead/behind
its schedule reflects reality (and an intensive isn't at the mercy of date math).
Acceptance criteria:
- A per-cohort, founder-editable **"completed through exercise N"** value, persisted in KV (mirroring the
  cohort catalog / site settings pattern) and saved via the founder-gated `PUT /api/funnel`.
- A control in the **founder console** (e.g. in the teaching-schedule or cohort editor) to bump/set it —
  "mark this class complete" / set the current exercise — with clear current-vs-scheduled context.
- `coursePosition` (or a thin wrapper the dashboard consumes) treats the **manual value as authoritative
  when set**, and **falls back to the calendar-derived position when unset** — so existing cohorts with no
  manual value behave exactly as today (T14's calendar default). Graduation/cert minting and the refund
  "exercises held" basis follow the effective (manual-or-calendar) position consistently.
- Aggregate/no-PII preserved; build + tests green; a test covers manual-overrides-calendar + unset-falls-back.
Files: `src/courseDates.js` (effective-position helper), `src/Platform.jsx` (consume it),
`src/FounderDashboard.jsx` (the control), `api/_lib/cohortStore.js` (or a small completion store),
`api/funnel.js` (persist), `src/funnel.js`, relevant tests
Stop-and-ask if: this changes how graduation/cert + the refund window are determined (money/behavioral) —
implement, open a PR, and pause for human review. Confirm whether manual completion should also drive the
student-visible "next class"/reminders or only the progress/done-state.

---
<!-- Completed tasks are checked off and moved below this line by the loop, newest first. -->
## Done

## [x] T13 — Halve every page's scroll height (≥50%) and keep it there — without trimming content  ·  risk: high
Done (landing — three founder-approved increments, each merged after a screenshot review). Applied the
House-style "optimize for less scrolling" rule **structurally**: relocated the landing's long-form blocks
to dedicated, crawlable routes — **nothing trimmed, all copy verbatim** — leaving a lean funnel entry.
- **/about** (`About.jsx`, #396): founder "Why this exists" essay + "More than money" narrative + compound
  graphic. **/curriculum** (`Curriculum.jsx`, #397): 3-act "how it works" + product teasers + week cards +
  "where the work happens". **/faq** (`Faq.jsx`, #397): full Q&A + ask form. The landing keeps short
  teasers (+ the canonical mission paragraph) linking through; the data-driven `ROUTES` registry got one
  appended entry per page.
- **Result:** landing 390px **11,157 → 4,501px (−59.7%)**; 768px −54.6%; 1280px −54.2% — **≥50% on every
  width.** POSITIONING voice/claims unchanged; a11y preserved (`act()` teasers, `aria-expanded`, Back/Home,
  recharts still lazy).
- **Locked in (the "maintain it always" half):** `test/landing-lean.test.jsx` + a `landing-lean` CI check
  fail any PR that moves long-form content back onto the landing. jsdom has no layout engine, so the guard
  is a **deterministic content-volume proxy** (heavy blocks absent + a text-volume/node ceiling) calibrated
  to the measured **≤5,579px @ 390px** (50% of the pre-T13 baseline); raise the ceiling only with a fresh
  headless-browser px measurement. Build + 249 tests green; each increment independently Sonnet-verified.
- **Follow-on screens** (`Enroll.jsx`, `BookCall.jsx`, `Platform.jsx`) — apply the same lens; promote to
  their own tasks when ready.

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
