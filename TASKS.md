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

## [ ] T19 — Refund proration by HOURS (not weeks); keep the 1-week window  ·  risk: high
Goal: the prorated refund is computed from HOURS of the course delivered/remaining (the pace-independent
quantity), not calendar weeks — and the full-refund eligibility window stays "1 week" as today.
Context: each lesson = 3 hrs; 12 lessons = 36 hrs. After T20 `refundFor` prorates by LESSONS (so it's
numerically hours-correct at 3-hr granularity); this task makes the BASIS explicitly hours and fixes the
copy that still says "weeks" so the Terms/emails read correctly at any cadence.
Acceptance criteria:
- `refundFor` expressed in hours: `refund = price × (totalHours − heldHours) / totalHours`, where
  `totalHours = lessonsTotalFor(batch) × HOURS_PER_LESSON` (3) and `heldHours = (lesson−1) × 3`. Flagship
  amounts unchanged ($916 after lesson 1, $833 after lesson 2).
- Eligibility window unchanged: `REFUND_WEEKS = 1` (the first week) — do NOT widen it.
- Copy synced from "weeks not yet held" / "X of 12 weeks" → HOURS wording in `engine.js`
  (`withdrawalEmail`), the in-app `LEGAL` Terms, and `public/terms.html` (all three kept in sync).
- Build + tests green; update `test/engine.test.js` refund/withdrawal-copy assertions to the hours wording.
Files: `src/courseDates.js`, `src/engine.js`, `src/Legal.jsx`, `public/terms.html`, `test/engine.test.js`
Stop-and-ask if: money + attorney-reviewed Terms copy — implement, open a PR, pause for human review. Also
confirm granularity: per-EXERCISE (3-hr blocks) hours vs finer per-SESSION (1.5-hr) hours.

## [ ] T21 — Founder console: create a cohort with ANY lesson schedule (not just weekly-12)  ·  risk: med
Goal: from the founder dashboard's **cohort editor**, the founder can set a cohort's PACE — how its 12
lessons land on the calendar and how each lesson's sittings are scheduled — writing the per-cohort
`lessons` array (T20). So an accelerated/custom-cadence cohort is created from the console, no code and no
hard-coded cohort (**supersedes the old T16**). Blank/default = today's weekly flagship cadence.
Acceptance criteria:
- The cohort editor exposes a **pace control** that produces a valid `lessons` schedule (array, one entry
  per lesson, of that lesson's sitting day-offsets from `start`) via a **founder-friendly** input — e.g.
  lessons-per-week + sittings-per-lesson + weekday(s), or per-lesson date pickers — **not** raw offsets.
  Left blank → the flagship weekly cadence (existing cohorts unchanged).
- Shows a **computed preview**: the resulting end date + the per-lesson dates, so the founder sees the
  schedule they built before saving.
- Saved via the existing founder-gated `PUT /api/funnel`; `sanitizeLessons` (T20, `cohortStore.js`) already
  validates it; it round-trips on reload. The created cohort drives `coursePosition`/`nextClass`/refund via
  the T14/T20 infra.
- Build + tests green; a test covers building an accelerated schedule + round-trip. **VERIFY BY RENDERING**
  the cohort editor (per playbook §9 — UX is verified by viewing, not reading the diff).
Files: `src/FounderDashboard.jsx`, `api/_lib/cohortStore.js` (validation exists), `src/courseDates.js`
(a schedule-builder helper if useful), `test/cohorts-endpoints.test.js` + a FounderDashboard test
Stop-and-ask if: founder-only console + reversible → none expected. Flag if the schedule-builder UX needs a product call.

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

## [x] T15 — Dashboard progress reads "Lesson N of 12"  ·  risk: med
Done (PR #423; merged). Relabeled the student dashboard's position chrome week→lesson — header pill
("Lesson N of 12"), lesson stepper (aria/title), "LESSON N · …" status headings, locked message, the
"Your course, lesson by lesson" heading + helper, and overview chips ("12 lessons · 3 hrs each" + "36 hours
of live building", pace-independent). Pure display relabel — `coursePosition`/gating/`s.week` untouched.
Deferred (still "week", pending a deeper pass): curriculum-arc prose ("Weeks 1–7"), per-lesson instructions
("your Week 2 spec"), prereq tool-timing, and withdrawal copy (T19's lane). Build + 261 tests (Platform +
axe a11y updated); Sonnet-verified. NOTE: this was the last task merged under the old "pause for sign-off"
rule — the loop is now FULL AUTO (see `.claude/skills/run-loop/SKILL.md`).

## [x] T20 — Lesson-based pace model (3-hr lesson, flexible sittings)  ·  risk: high
Done (human-approved the merge; PR #422). Refined T14 to the founder's spec: the unit is the **3-hour
LESSON** (12 = 36 hrs, invariant), and each lesson is delivered as ANY number of live **sittings** (no
hardcoded 2/lesson). A cohort optionally carries `lessons` — one entry per lesson, each a list of that
lesson's sitting day-offsets from `start` (e.g. `[[0,2],[7,9], …]`); `cohortLessons` regenerates the
flagship cadence when absent (byte-identical — every `engine.test.js` case green). `coursePosition` reports
the current lesson (return key still `week` for back-compat); `classMeetingOn`/`nextClass`/`sessionDate`
work across any sitting count; `refundFor` prorates over lessons. Renamed exercise→lesson
(`LESSONS_TOTAL`/`lessonsTotalFor`/`cohortLessons`; old T14 names removed). `cohortStore.sanitizeLessons`
validates the field; `CLAUDE.md` "Program shape" updated; `test/course-pace.test.js` covers a compressed
cadence + a 1-and-3-sitting lesson. Build + 261 tests; Sonnet-verified (invariance traced).

## [x] T14 — Cohort pace as a per-cohort property (exercise as the unit)  ·  risk: high
Done (human-approved the merge — high-risk pause honored; PR #421). The course's atomic unit is now the
**3-hour EXERCISE** (12 = 36 hrs, invariant); a cohort optionally carries a `schedule` (ascending day-offsets
from `start`, one per session) and ALL calendar/progression/refund math derives from `cohortSchedule(batch)`
in `courseDates.js` — `coursePosition` reports the current exercise, `refundFor` prorates over the cohort's
exercise total, and `classMeetingOn`/`nextClass`/`sessionDate`/`checkinDateLabel` follow the schedule. With
no `schedule`, the flagship 12-week / twice-weekly cadence is regenerated EXACTLY (every `engine.test.js`
invariance case unchanged + green). No cohort added (that's T16); `cohortStore.js` sanitizes the field;
`CLAUDE.md` "Program shape" updated. New `test/course-pace.test.js` (10). Build + 260 tests; Sonnet-verified.

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
