# Build Young — project guide for Claude Code

This file orients you (Claude Code) to the project so you can build new functionality
confidently. Read it fully before making changes.

**Portable engineering rules — apply on top of this project guide (imported so they travel with the
repo, e.g. to CI / the cloud loop):** @../ENGINEERING-PLAYBOOK.md

> **★ Working agreement — how to take EVERY request (do this before touching code).** First classify it:
> **bug/small fix** vs **feature/non-trivial change**.
> - **Bug / small fix** → fix it directly (still build + test + **verify** before shipping, per `/ship`).
> - **Feature / non-trivial / ambiguous / architectural / money- or auth-touching change** → **spec-first.**
>   Write the one-page spec (`SPECS/NNN-name.md` from `_TEMPLATE.md`: what · why · behavior · acceptance ·
>   out-of-scope · risks), **surface its content inline in the conversation for the human to read, and get
>   explicit approval (draft → approved) BEFORE writing any code.** Do NOT implement ahead of the approved
>   spec — clarifying questions are fine, but the build waits for sign-off. This is the spec-first gate
>   (playbook §9); it is **trigger-independent** (applies to a one-line ask just as much as a planned task).
> When unsure which bucket a request is in, **ask.**
>
> **Then, on EVERY shipped change, the standing checks — co-equal with the bug/feature gate, not a separate
> thing you have to remember:**
> - **Living docs stay current (same change).** If the change **adds / removes / moves / renames a module,
>   an `api/` endpoint, a route, a skill, a hook, or an external service — or changes the loop/ship flow**,
>   update **`BUILD-YOUNG-ARCHITECTURE.md`** (+ its Mermaid diagram if structure changed) **and** the relevant
>   `CLAUDE.md` / `POSITIONING.md` notes **in that same change** (detailed rule in the callout below).
> - **Name those docs to the verifier.** A spawned verifier inherits no context — it only checks what its
>   prompt names. So whenever a change touches a module/endpoint/route, the verifier's spawn prompt must
>   include the standing check *"did this touch a module/endpoint/route? is `BUILD-YOUNG-ARCHITECTURE.md` updated?"* —
>   else the doc silently drifts (this bit us: a kit-file rename left the arch doc stale).
>
> *(Why all of this is rule #1: jumping from a quick question straight into a multi-file change skips the
> human's scope/tradeoff decision; and treating doc-currency as "something to remember" rather than a
> standing check is exactly how the architecture doc drifts. Classify → spec-if-needed → build → **doc
> currency + verify** — every time.)*

> **Keep the architecture doc alive (living-document rule).** The repo-root
> [`BUILD-YOUNG-ARCHITECTURE.md`](../BUILD-YOUNG-ARCHITECTURE.md) maps both layers — the agentic loop and the app
> (router → screens → foundation → `api/` → external services). Any PR that **adds, removes, moves,
> or renames a module, an `api/` endpoint, a skill, a hook, or an external service — or changes how
> the loop / ship flow works — must update `BUILD-YOUNG-ARCHITECTURE.md` (and its Mermaid diagrams) in the same
> PR.** Same principle as keeping this guide in sync with the code: the diagram is wrong the moment
> the structure changes without it. **If you change a Mermaid block, also regenerate the rendered
> exports in the same PR — `bash scripts/render-architecture.sh` (writes `docs/architecture/*.png|pdf`).**

> **Shipping any change — use `/ship`** (build → tests → guards → an **independent verifier** sub-agent →
> PR → squash-merge → sync). Verification is part of shipping, not optional: a *direct edit* gets the same
> verifier as a `/run-loop` task, so nothing merges unverified. (Playbook §9; the skill is `.claude/skills/ship`.)

> **Model tiering (cost discipline — cheapen the work, not the rigor).** Spawn the **independent verifier**
> sub-agent (in `/run-loop` and `/ship`) on a **Sonnet-class** model — the Agent tool's `model: "sonnet"` —
> and reserve the session's premium model (Opus/Fable) for **planning, architecture/design, and any
> `risk: high` task**. A Sonnet-class verifier still re-runs build/tests, grades the diff, **and runs every
> standing check** — it's just materially cheaper for the per-task volume. **Floor: don't drop the verifier
> below Sonnet** (a too-weak checker rubber-stamps; reserve Haiku for trivial typo-level checks only). Name
> models by **family alias**, never a dated string (mirrors `scenarioModel`'s family-named Haiku default for
> the in-app scenario agent). Portable rationale: `ENGINEERING-PLAYBOOK.md` §9.

## What this is
**Build Young** is a live, online entrepreneurship program for high schoolers: over 12 weeks
they build a real product with AI, take it live, grow it, and go to market for their first
customers — plus a single-page React marketing site + enrollment flow + a post-enrollment
course dashboard (week stepper + per-week activities). Tagline: *"Raising builders, not consumers."*
Founder: **Sunil Garg** (ex-Microsoft, 20 years in product). LinkedIn:
https://www.linkedin.com/in/msunilgarg

## Tech stack
- **React 18** single-page app, built with **Vite**.
- Charts via **recharts** (lazy-loaded — see "Performance" below).
- Icons via **lucide-react**.
- No router library — navigation is a hand-rolled history stack inside `App` (see "Navigation").
- Email via a serverless function (`api/send-email.js`) using Resend. Off by default.
- Web analytics via **Vercel Web Analytics** (`@vercel/analytics`, cookieless/no-PII) — `<Analytics/>` in `main.jsx`; App reflects each SPA route in the URL via `replaceState` (no new history entry) so screens show as distinct pages with time-on-page.

## Run it
```bash
npm install
npm run dev        # local dev server
npm run build      # production build → dist/
npm run preview    # preview the production build
```

## Project structure
```
build-young-app/
├── index.html            # SEO meta, JSON-LD (EducationalOrganization + Course), noscript fallback
├── src/
│   ├── main.jsx          # entry; mounts <App/> in React.StrictMode
│   ├── App.jsx           # ~375 lines: the ROUTER ONLY — route/history/persistence/hydration + modal
│   │                     #   state. Routing is a data-driven `ROUTES` registry ({key,path,title,desc,el});
│   │                     #   adding a screen = ONE appended entry. Keep it thin; features go in their own file.
│   │   ── SCREENS (one feature = one file; safe for one agent each) ──
│   ├── Landing.jsx       # marketing page (hero, teaser, testimonials, FAQ, careers/schedule modals)
│   ├── About.jsx         # "our story" page (/about): founder essay + "more than money" narrative (split off Landing to cut scroll)
│   ├── Curriculum.jsx    # "how it works" page (/curriculum): 3-act journey + product teasers + "where the work happens" (split off Landing)
│   ├── Faq.jsx           # FAQ page (/faq): full Q&A + ask-a-question form (split off Landing); FAQ_ITEMS lives here (keep in sync w/ index.html JSON-LD)
│   ├── Enroll.jsx        # 3-step enrollment
│   ├── BookCall.jsx      # free intro-call booking
│   ├── Platform.jsx      # student dashboard (overview + per-week course hub + withdrawal + cert card)
│   ├── FounderDashboard.jsx  # hidden ?founder console (funnel analytics + every editor/admin list)
│   ├── auth.jsx          # Login / SetPassword / CheckEmail
│   ├── Certificate.jsx   # certificate UI + public /verify page
│   ├── WhyStrip.jsx      # decision-point social-proof strips (shared by Enroll + BookCall)
│   ├── Legal.jsx         # in-app Privacy/Terms modal
│   ├── Charts.jsx        # recharts wrapper, lazy-loaded (FounderDashboard)
│   │   ── FOUNDATION (shared, dependency-light, HIGH blast radius — see Parallel work protocol) ──
│   ├── theme.js          # C palette, FONTS, fmt, SUNIL_PHOTO
│   ├── ui.jsx            # Card, Mark, Pill, act, Stat, PageBackdrop
│   ├── lib.js            # CONFIG, track, AUTH, sendEmail, CohortsContext, pending-enroll, downloadFile, callBooked
│   ├── courseDates.js    # pure course-calendar + refund math
│   ├── course.js         # WEEKS + ACTS curriculum data
│   ├── courseState.js    # founder-editable HOMEWORK/OBJECTIVES (live bindings + setters)
│   ├── engine.js         # email builders + newState + advance()
│   └── cohorts.js, cert.js, scenarios.js, site.js, marketMedia.js, funnel.js, projectKit.js, founderStory.js  # other SoT data/logic
├── api/
│   └── send-email.js     # serverless email sender (Resend); POST-only, validates input, HTML-escapes body
├── public/
│   ├── privacy.html, terms.html   # standalone legal pages (also rendered in-app as a modal)
│   ├── robots.txt, sitemap.xml, llms.txt, favicon.svg, og-image.png (1200×630 link-preview card —
│   │                     #   GENERATED from scripts/og-image.html via scripts/render-og-image.sh; keep copy in sync with OG meta + POSITIONING)
└── vite.config.js
```

## Parallel work protocol (multi-agent / fan-out)
The app is split so independent features live in their own files (see Project structure). To let
several agents/sessions work at once **without colliding**, follow these four rules — they target the
only four ways parallel work breaks:

> **When to fan out (the decision rule):** the default is **sequential** (one task at a time). Fan out to
> parallel sub-agents **only when ALL hold:** (1) ≥2 tasks on **disjoint files**, (2) **no foundation
> change** mid-flight (do a needed one first, serially, then branch), (3) **no ordering dependency**
> between them, (4) the **contract is pinnable** up front. Any miss → stay sequential. Borderline → ask
> the human. The human can override either way. (Diagram: `BUILD-YOUNG-ARCHITECTURE.md` → "Parallel fan-out".)

1. **One feature = one file = one agent (no shared files).** Assign each agent a DISJOINT set of files
   from the map above. If a task spans two feature files, give the whole vertical slice to ONE agent
   rather than splitting it. `App.jsx` (the router) is orchestrator-owned — don't grow features into it;
   adding a screen is one appended entry in its data-driven `ROUTES` registry (append-only = low-conflict).
2. **Freeze the foundation during a parallel run — THE #1 rule.** The FOUNDATION modules
   (theme/ui/lib/courseDates/course/courseState/engine/funnel/cohorts/cert/scenarios/site/marketMedia)
   are imported by everything, so a change there silently breaks every other agent's branch. During
   fan-out they are an **additive-only public API**: add an export; never change a signature, rename, or
   alter behavior. If a foundation change is genuinely needed, do it FIRST, serially, merge to main,
   THEN branch the parallel agents off the updated main.
3. **Contract-first.** Before fan-out, pin the seams in the task spec — prop shapes, event names,
   function signatures, data contracts — and have each agent code TO that contract; agents never invent a
   shared interface mid-flight. Any logic/data used by 2+ features goes in a dependency-free foundation
   module (single source of truth, like `funnel.js`/`courseDates.js`), never duplicated.
4. **Integration order.** Each agent works on its own `claude/<feature>` branch (direct pushes to main
   are denied by settings), **rebases on latest `origin/main` BEFORE opening its PR**, and PRs merge
   **one at a time** (squash). After each merge, the next agent rebases. Keep each PR to its owned files
   so review + revert stay clean.

**Parallelize the work, not the rigor.** Each parallel agent runs the **full loop** on its slice — its
own self-check (build/tests/guards) **and an independent verifier** (a fresh sub-agent grading the diff vs
the task's acceptance criteria), with the **FAIL → fix → re-verify** retry — and **only a PASS'd PR joins
the one-at-a-time merge queue.** Fan-out spreads the *doing*; it never skips verification. (Same rigor as
the sequential loop — see `BUILD-YOUNG-ARCHITECTURE.md` → "Parallel fan-out".)

**Stay in your lane:** an agent that finds it needs a file it doesn't own STOPS and surfaces it to the
orchestrator instead of editing across the boundary — cross-boundary edits are exactly how silent
conflicts happen. (The `App.jsx` router is now **data-driven**: routing is a `ROUTES` registry, so adding
a screen is an append-only one-entry change — low-conflict for parallel agents, no longer a serialized
orchestrator-only step.)

## Code map (what each piece does — now spread across the feature files above)
The pieces below moved out of `App.jsx` into the files in Project structure (e.g. `Landing`, `Platform`,
`FounderDashboard`); this remains the guide to what each one does and where its logic lives.
Top-to-bottom, the major pieces:
- **`C`** — color palette object. NOTE: some names are historical/misleading. `C.emerald`
  is actually brand BLUE (#0067b8), `C.gold` is PURPLE, `C.sky` is teal. Trust the hex,
  not the name. `C.turq` (#0a7d85) and `C.green` (#178045) were darkened to pass WCAG AA.
- **`CONFIG`** — single place for go-live wiring (domain, email, Calendly, Stripe links).
- **`FONTS`** — the global `<style>` string (CSS keyframes, `.btn`, `.tab`, `:focus-visible`,
  responsive media queries like `.enroll-grid` and `.nav-talk`).
- **`Mark`** — the logo (three ascending blocks + teal spark).
- **`act(fn)`** — accessibility helper: makes a non-button element keyboard-operable
  (role=button, tabIndex, Enter/Space). Use it on any clickable `<span>`/`<div>`.
- **`SEASONS` + `BATCHES`** — cohorts run in 3 seasonal intakes (Fall 2026, Winter 2027,
  Spring 2027). ONE combined **"Builders"** track (high school; no MS/HS split). `BATCHES` has 6
  entries = 3 seasons × 2 cohorts on alternating day-pairs (**Mon & Wed**, **Tue & Thu**); each
  meets **twice a week (~3 hrs)** over the 12-week course. `track` is `"Builders"` for all. Ids
  look like `fall-mw` / `fall-tt`. `CHECKINS` (= **0** — no separate check-in) lives in cohorts.js too (imported by
  App.jsx + funnel.js). The cohort catalog is **KV-backed + live-editable in the founder dashboard** (code `BATCHES` = seed/fallback; public read at `/api/cohorts`; each cohort carries its own `stripeLink`; clients hydrate via `CohortsContext`; a per-row **Duplicate** action — SPECS/018, pure `duplicateCohort(src, existingIds)` in `cohorts.js` — clones a cohort with a fresh unique id + cleared per-instance fields (`start`/`stripeLink`/`groupEmail`/`groupAudienceId`/`recordings`/`manualLesson`) as a fast starting point for a new one). **Per-cohort group email:** each cohort has a `groupEmail` (display address, shown on the student Dashboard + editable in the founder cohort editor; auto-derived as `<id>@<brand-domain>` when blank, via `groupEmailFor`/`normalize` in `cohortStore.js`, so existing cohorts always have one) and a `groupAudienceId` — a **Resend audience** (broadcast list) auto-created on cohort save (`saveCatalog` → `api/_lib/resendAudience.js`). Students are auto-**added** to the audience on enrollment and **removed** on refund/cancel via the Stripe webhook (`checkout.session.completed` → `addContact`; `charge.refunded` → `removeEnrollment` + `removeContact`). **Failed payments** (`payment_intent.payment_failed` / `charge.failed` / `checkout.session.async_payment_failed`) are recorded + emailed to the founder via `api/_lib/paymentIssueStore.js` (KV `payments:failed`, idempotent per attempt, key-gated/best-effort — visibility ONLY: no charge/refund/enrollment change; the founder follows up in Stripe). Stripe must be subscribed to those three events for them to arrive (go-live step). All Resend calls are key-gated + best-effort (no `RESEND_API_KEY` → no-op). NOTE: Resend is send-only — an audience is a founder→cohort broadcast list, NOT a peer inbound alias. The landing
  “Upcoming batches” section shows that season’s 2 cards; the enroll dropdown groups options by
  season via `<optgroup>`. To add a season, append to `SEASONS` + 2 `BATCHES` rows. **Season lists must derive from `catalogSeasons(liveBatches)`, NOT the hardcoded `SEASONS`** — that's how a founder-created catalog-only season (e.g. a "summer" cohort) shows up everywhere it should: the landing tabs, the enroll dropdown, AND the founder console **Segment** selector. (We shipped the console selector still on `SEASONS` and it dropped Summer 2026 — same class of bug as the landing tabs. Any NEW season-listing surface uses `catalogSeasons`; `funnel.segments()` likewise unions the event-present seasons with the predefined ones so exports never drop a real season.)
- **`HeroPreview`** — animated dashboard mock on the landing page; cycles the three acts: Build (Wk2) → Grow (Wk8) → Capstone (Wk12, a certificate + "presenting live").
- **`LEGAL` + `LegalModal`** — in-app Privacy/Terms popup (works without separate files).
- **`WHY_STATS` + `WhyStrip`** — the "Why this matters" social-proof stat cards shown on the
  Enroll (step 1) and BookCall pages to fill whitespace at the decision point. Each stat has a
  `url` that links to its PRIMARY source (opens new tab). The standalone pitch-deck version is
  `built-young-why-this-matters.md` in the outputs folder (kept in parallel, not in this repo).
- **`Landing`** — the lean marketing page / funnel entry (nav, hero, a condensed 3-act overview, a
  short "more than money" teaser, batches/pricing, an FAQ teaser, footer). The long-form blocks now
  live on their own routes (`/about`, `/curriculum`, `/faq`) linked via teasers, so the landing scrolls
  ~60% less than before (T13). Keep it short — don't grow long-form content back onto it.
- **`About`** — the `/about` "our story" page: the full founder essay ("Why this exists") + the
  "More than money" narrative + compound-growth graphic, moved off the landing page so the funnel
  entry scrolls less (T13). Linked from the landing teaser; ends with an enroll/talk CTA. Content
  is verbatim (no trim) — POSITIONING.md voice + the canonical mission paragraph unchanged.
- **`Curriculum`** — the `/curriculum` "how it works" page: the 3-act journey (with `ProductTeaser`
  mocks + expandable week-by-week cards from `WEEKS`/`ACTS`) + "Where the work happens", moved off
  the landing. Linked from the landing's condensed 3-act overview ("See the full 12 weeks") + the
  hero's "See the 12 weeks". Ends with an enroll/talk CTA. Content verbatim.
- **`Faq`** — the `/faq` page: the full Q&A (`FAQ_ITEMS`, now the single source of truth here — keep
  in sync with the FAQPage JSON-LD in `index.html`) + the "ask a question" form, moved off the
  landing. Linked from the landing's FAQ teaser.
- **`Enroll`** — 3-step enrollment (checkout-style step 1, payment, confirmation).
- **`BookCall`** — free 15-min call booking (two-column: scheduler + "what you'll get from me").
- **`Platform`** + panels (`CoursePanel`, `WeekPanel`) — the post-enrollment dashboard (Overview /
  Course progress / Dashboard tabs). NOTE: the old finance/markets/portfolio simulation engine
  (`advance(prev,macro)` income/market/net-worth math, `PortfolioPanel`, `BuyCard`, `RISK_PRESETS`,
  `ASSETS`, the `api/_lib/marketSchedule.js` + `/api/market-event` server modules) was **fully
  removed** — the program is pure entrepreneurship now, no money simulation. `advance(prev)` is now
  just week progression (week++ / `started` / `done` at Week 12).
- **`App`** (default export) — owns routing, history/scroll, the nav lock, persistence,
  and the legal modal.

## Navigation (important — don't replace with a router casually)
`App` keeps `route` ("home" | "enroll" | "call" | "app") and a `history` stack of
`{route, scroll}` entries.
- `nav(to)` pushes current route+scroll, then navigates (new page starts at top).
- `goBack()` pops and **restores the previous scroll position**.
- `goHome()` clears history.
- A **single-flight `navLock` ref** wraps these via `guard(fn)` so rapid double-clicks
  can't desync the stack or double-submit enrollment. Keep this guarantee if you refactor.

## Performance (keep this win)
recharts (~344 KB, ~110 KB gzip) is **only** used in the dashboard, so it's split out via
`const Charts = React.lazy(() => import("./Charts.jsx"))` and wrapped in `<React.Suspense>`.
This keeps the landing-page initial JS ~90 KB gzip. Don't statically import recharts into
App.jsx — that would undo it. `npm run build` (Vite) preserves this split automatically.

- **Refund policy (in code):** full refund before the cohort starts (state flag `started:false`, flips true on first `doAdvance`); prorated refund through the first **`REFUND_WEEKS`** (= **1**) course week; non-refundable after (shown explicitly once that window passes). Eligibility is the single helper **`canWithdrawNow(s)`** (gates the Cancel/Withdraw button AND `doWithdraw` itself) — change `REFUND_WEEKS` to move the window; copy uses `REFUND_WEEKS`/`REFUND_WEEKS+1` so it follows. **Proration basis = "weeks not yet held"** (matches the Terms): the sim advances by WEEK (a 12-week course; the program runs **24 sessions** = two a week, but refunds prorate by week). `week` increments on each advance (attending the first week → "Week 2"), so weeks held = `week−1` and `refund = refundFor(batch, started, week) = price × (12 − (week−1)) / 12`. Don't reintroduce `price×(12−week)/12` — that's the old off-by-one that under-refunded one week and overstated attendance. NOTE: refund copy refers to "the first week" (`REFUND_WINDOW`), NOT "Act 1" — after the build-first flip, Act 1 is the 7-week build-and-launch arc (Weeks 1–7). Logic lives in `Platform` + `withdrawalEmail`; Terms copy in `LEGAL` (in-app) and `public/terms.html` must stay in sync.
- **Finance/money simulation — REMOVED:** the program no longer has any income/markets/net-worth
  simulation. The entire engine is gone: `INCOME`/`STEADY_INCOME`/`PAY`/`TAX_RATE`/`LIVING`/
  `FINANCE_FIRST_WEEK`, `incomeFor`, `netWorth`/`holdingsTotal`, `takeSpree`/`investInstead`,
  `RISK_PRESETS`/`ASSETS`, the dollar constants (`HOME`/`CAR`/`EMERGENCY`/`SPREE`/`INSURANCE`/
  `ALT_BUY`/`PE_BUY`/`HUSTLE_*`), the `PortfolioPanel`/`BuyCard` UI, the Portfolio/Markets tabs, and
  the server market modules (`api/_lib/marketSchedule.js`, `api/market-event.js`). Don't reintroduce
  them — the dashboard is just the course (week stepper + per-week build/capstone activities).
- **Program shape (12 weeks; NO check-in):** the program is **12 weeks flat** — finishing the **Week 12 capstone** graduates the student (`doAdvance` sets `done:true` at week 12; cert mints on `done===true`). There is **no separate follow-up check-in** (removed). **Pace is a per-cohort property (T14/T20):** the
invariant unit is the **3-hour LESSON** (12 lessons = 36 hrs); each lesson is delivered as one or more
live **sittings** (flagship = two 90-min sittings/week; sittings-per-lesson is NOT fixed). A cohort
optionally carries a `lessons` schedule — one entry per lesson, each a list of that lesson's sitting
day-offsets from `start` (e.g. `[[0,2],[7,9], …]`) — so the *same* 12-lesson course runs at the flagship
cadence (the default when `lessons` is absent, reproducing the historical 12-week/twice-weekly behavior
exactly) **or** an accelerated one (more lessons/week → fewer calendar weeks). All calendar/progression/
refund math derives from `cohortLessons(batch)` in `courseDates.js`; `coursePosition` reports the current
**lesson** (1–12; the return key is still named `week` for back-compat), and `refundFor` prorates over the
cohort's lesson total. Dashboard shows "Lesson N of 12" (T15). The 12-week flagship stays the headline. **Manual progress override (T18):** a founder can set a cohort's `manualLesson` (1–12 = on that lesson, 13 = graduated, 0/absent = AUTO) from the cohort editor; the dashboard reads **`effectivePosition(batch)`** (the override when set, else the calendar `coursePosition`), so progression/graduation/cert + the refund "lessons held" basis follow it — cohorts with no override are unchanged. The simulated-portfolio prize was removed; in its place is a **real-world "First-year builder prize"** — per cohort, the FIRST student to land a **real, arms-length paying customer within a year of enrolling** gets tuition refunded, contingent on (a) payment-receipt proof + founder verification and (b) a parent-consented ~2-min video. Surfaced on the landing pricing, the **Terms** ("First-year builder prize" in `LEGAL` + `public/terms.html`), and the **showcase capture** (capstone collects an optional `videoLink` + `claimingPrize` flag → founder console "Student showcase"). Contest involving minors + likeness → keep the attorney-review + media-release flag in Terms. `CHECKINS` (cohorts.js) is **0**; the check-in phase, `checkin_completed` event, and `checkinCurve` are dormant (kept generic for analytics, never reached). The former prize copy is gone from the landing pricing, the dashboard capstone, and the Terms. The daily cron (`api/cron/market-news.js`) is now **class-reminders only** — a "prepare for next week" email 2 days before each weekly class (`dueReminders` in `api/_lib/schedule.js`, homework from `api/_lib/homeworkStore.js`); the old market-news drip + server schedule were removed. `src/marketMedia.js` now holds just `WEEK_TITLES` + `WEEK_PREP` (dependency-free course copy shared by the app + cron).

## Founder funnel analytics (hidden `?founder` route, account-gated)

A connected acquisition→engagement funnel for the founder/investors. **All stage definitions and
conversion/curve/revenue math live in ONE place — `src/funnel.js`** (dependency-free; imported by
`App.jsx`, the read endpoint, and tests so they can't drift).

- **Ordered stages (the linear spine):** `visited` → `enroll_started` → `enrolled` →
  `class_started` → `graduated`. Non-spine signals feed their own charts: `call_booked` (parallel
  "Talk to Sunil" assist path — enrollments split call→enroll vs. direct via a `fromCall` prop), and
  the progression curves `week_advanced` (weeks 2–12) + `checkin_completed` (dormant — `CHECKINS` is 0, no separate check-in).
  `withdrawn` is the exit branch, tagged with a `refundTier` (`full`/`prorated`/`none`).
- **`track(event, props)`** (App.jsx): fire-and-forget `sendBeacon`/fetch to `/api/funnel` (POST), no-op in
  tests, never throws. Fired at each stage — `visited` (once/session), `enroll_started`
  (startEnroll), `call_booked` (BookCall), `enrolled` (finishEnroll + the `?enrolled=` Stripe
  return), `class_started`/`week_advanced`/`graduated`/`checkin_completed` (doAdvance), `withdrawn`
  (doWithdraw). **Aggregate-only — NO PII** (season, track, batch id, week/check-in, refund tier,
  cents; a server allowlist drops anything else).
- **Conversion rates:** each consecutive pair (`enroll_started/visited`, `enrolled/enroll_started`,
  `class_started/enrolled`, `graduated/class_started`) plus overall `enrolled/visited` — via
  `conversionRate(numer, denom)` (0 when denom is 0). `summarize(events, filter)` →
  `{counts, steps, overall, calls, weekCurve, checkinCurve, withdrawals, revenue}`.
- **Segmentation:** `segments(events)` → per-season (Fall/Winter/Spring) and per-track (one combined
  `Builders` track now). Meaningful from `enrolled` onward (top-of-funnel events carry no cohort → excluded under a
  filter).
- **Revenue:** `summarize().revenue` = enrolled `priceCents` − withdrawn `refundCents` (gross/refunded/net). **`revenueBySource(events)`** slices it by channel — `direct` vs `partner:<id>` vs `free` (scholarship, $0) — where partner seats are counted at **net** (their `enrolled` event carries net cents + the `source` tag, fired by `partner-onboard`); the slices sum to the topline. Shown as a "Revenue by source" card in the console (`free` → "Scholarship (funded · $0)").
- **Scholarship funnel + journey (SPECS/020):** the scholarship channel is followable end-to-end. The journey events (`class_started`/`week_advanced`/`graduated`, fired in `Platform.jsx`) now carry **`source`** (`free`/`partner`/`direct`, from `s.paymentSource`) so the lifecycle segments by channel. `summarize(events, {source:"free"})` returns a **parallel spine** `SCHOLARSHIP_STAGES` = **Applied** (`free_application`) → **Awarded** (`enrolled{source:free}`) → **Class started** → **Graduated** (each source-filtered except the application, which is inherently scholarship) — giving the **applied→awarded selection rate**. The console exposes it via a **"Scholarship" Segment** button (next to All/seasons) that slices the funnel + the week/graduation curves to `source:free`. The default (paid) funnel + `STAGES` are unchanged.
- **Admin = founder, by account (not a URL token):** access is gated by the logged-in **session** —
  a user whose email is in the allowlist = env **`FOUNDER_EMAILS`** (permanent bootstrap) ∪ the KV set
  the console edits (`loadFounderEmails`/`requireFounder` in `api/_lib/auth.js`; `/api/auth/me` returns
  `isFounder`). The Platform header shows an **Admin** entry for founders; the hidden `?founder` route
  renders `FounderDashboard`. **Adding a new admin auto-onboards them (SPECS/015):** saving the admin
  allowlist (`PUT ?resource=founders`) diffs against the prior list and, for each newly-added email,
  **provisions the account (`putUser`) + emails an admin-flavored `sendSetPasswordEmail` invite** — so a
  new admin gets a set-password link directly instead of hunting for "Forgot password?". An account that
  already has a password is elevated silently; the env bootstrap admins are never emailed; a send failure
  is best-effort (reported in the response's `inviteFailed`, the save still succeeds). Requires email
  (Resend) configured — else the invite can't send and the new admin must use "Forgot password?".
- **One endpoint, method-routed (Hobby 12-function cap):** **`POST /api/funnel`** = public event
  ingest (`funnel:events` KV list, capped); **`GET`** = founder-only funnel read (or `?resource=partners`
  for the full partners registry); **`PUT`** = founder saves the cohort catalog (default), the **admin
  allowlist** (`?resource=founders`), the **site settings** (`?resource=settings`), or the **partners
  registry** (`?resource=partners`); **`DELETE`** = founder resets a test account. All non-POST
  methods require a founder session (403 otherwise). The dashboard folds in the **funnel** +
  **traffic/engagement** + a **site-settings editor** + a **cohort editor** + an **admin editor** +
  **account reset** + a read-only **system status**. Charts reuse the lazy `Charts.jsx`
  (`kind="funnel"` bars + `kind="countline"` curves).
- **Traffic & engagement ("before enrollment" picture):** two extra anonymous events feed it —
  `visited` carries a referrer `source` (host or "direct"; hostname only, never a full URL),
  `screen_view {screen, ms}` (per-route dwell, fired on each route change + on tab hide/close) and
  `exit {screen}` (last screen before leaving). `engagement(events)` in `src/funnel.js` →
  `{sources, screens (views + avgMs), exits (count + pct), exitTotal}`; the console renders it as
  three cards under the drop-off. Explains the Visited → Enroll-started leak.
- **Founder-editable site settings (NEW):** the runtime, non-secret public values — **booking link
  (Calendly), contact email, LinkedIn URL, the shared Stripe link, the showcase toggle, the
  founder photo, and the `starterRepoUrl` (the student starter template repo, SPECS/009)** — are now editable live from the console (no redeploy),
  alongside cohorts/Stripe links. Defaults are single-sourced in **`src/site.js`** (`SITE_DEFAULTS`,
  imported by `CONFIG` and the server store); stored in KV (`settings:site` via
  `api/_lib/settingsStore.js`); read publicly folded into **`GET /api/cohorts`** (`{batches, checkins,
  settings}`) and saved via `PUT /api/funnel?resource=settings`. The client hydrates by
  `Object.assign(CONFIG, settings)` on load + a re-render. **Field types:** a `SETTINGS_FIELDS` entry
  is a text input by default, `type:"boolean"` a checkbox, or `type:"image"` an upload control
  (`ImageSettingField`) that resizes the pick to a ~360px square JPEG data URI client-side. The
  **founder photo** (`founderPhoto`) is consumed on the landing + `/about` cards as
  `CONFIG.founderPhoto || SUNIL_PHOTO` (empty = the bundled `theme.js` default); because it ships
  publicly and is inlined on the page, `sanitizeSettings` only accepts a `data:image/…` URI or
  http(s) URL and caps it at ~300 KB (else `""`). **Secrets/deploy toggles stay env-only**
  (`emailEnabled`/`authEnabled`/`RESEND_API_KEY`/`AUTH_SECRET`/KV); the console shows them read-only
  in **System status**. So: every founder go-live config a web console *can* own is in the console;
  only host secrets remain on the host.
- **Partners registry (third-party enrollment — SPECS/005 + 006):** marketplaces/resellers (e.g. Outschool) that bring students, stored in KV (`partners:list` via `api/_lib/partnerStore.js`), founder-edited in the console (Settings → Partners). Each partner has a **`cutPct`** (commission, a 0..1 fraction — **founder-only, NEVER public**) plus public display fields (`displayName`/`logo`/`publicUrl`/`blurb`) and a **`featureOnSite`** toggle. Saved via founder-gated `PUT /api/funnel?resource=partners`; the founder reads full records via `GET /api/funnel?resource=partners`. The PUBLIC read (`GET /api/cohorts` → `partners`) exposes **only `publicPartners()`** — featured partners' display fields, a hard allowlist so `cutPct`/settlement can never leak. **Partner enrollments (T27):** the founder manually creates one via founder-gated `POST /api/funnel?resource=partner-enroll` — an **inert** create that stores a PENDING record in the enrollment store (`api/_lib/store.js`: `paymentSource:"partner"` + `partner` + `externalRef` + snapshotted `priceCents`/`cutPct` + `onboarded:false`) and **sends nothing** (no email/access/audience, not counted as `enrolled`); price/cut are snapshotted server-side. Founder lists them via `GET ?resource=partner-enrollments` (console → Students → Partner enrollments). **Start onboarding (T28):** an explicit founder action — `POST /api/funnel?resource=partner-onboard` — ACTIVATES a pending seat exactly like a direct enrollment: it provisions the account (`putUser`) + sends the **same** `sendSetPasswordEmail` welcome (no partner/source wording — student-experience parity), adds to the cohort Resend audience, flips `onboarded:true`, and fires the `enrolled` funnel event at **net** (`priceCents = price × (1 − cut%)`) tagged `source:"partner:<id>"`. Re-runnable (re-sends the invite until a password exists). **Settlement (T30):** each partner record carries a founder-only `payments` ledger (`{date, amountCents, note}`, never public); `funnel.settlementSummary(partners, enrollments)` computes per-partner seats/gross/cut/**net owed**/received/**outstanding** (only ONBOARDED seats owe, net per the seat's snapshotted cut); the console **Settings → Partner settlement** view shows it + records a dated payment (appends to `payments`, saved via `PUT ?resource=partners` — bookkeeping only, no money moves), and the funnel **JSON export** carries it (`toDataRoom(events, { settlement })`). **Withdrawal (T31):** partner students **don't self-withdraw** — the dashboard hides the withdraw control + all refund copy for `s.paymentSource==="partner"` (threaded from the user record via `/api/auth/me` → `newState`; onboarding stamps `paymentSource:"partner"` on the user). The founder removes a partner student via founder-gated `POST /api/funnel?resource=partner-remove` (drops the enrollment → no longer owed in settlement, removes the Resend contact + account/state, issues **no** Stripe refund — partner refunds are the partner's policy). Direct students' self-withdraw + flat-75% flow is unchanged. **Public "Where to find us" strip (006-A / T32):** the featured-partner public display fields (`GET /api/cohorts` → `partners`) are threaded to `Landing` (App state → prop, like `testimonials`) and rendered as a compact strip below the batches section — logos link to each partner's `publicUrl` (`target="_blank" rel="noopener noreferrer"`, text-name fallback), hidden entirely when none are featured (lean-landing guard intact). **"Partner with us" modal (006-B / T33):** a nav + footer link opens a `PartnerModal` (mirror of `CareersModal`) — org/name + email (+ optional note) → public `POST /api/funnel?resource=partner-lead` → `addPartnerLead` (interestStore: store in KV + email the team, key-gated); the founder reads them in the console (Students → **Partner inquiries**, `GET ?resource=partner-lead`). No new route.
- **Free / scholarship seats by application (SPECS/016):** a **$0 cohort** (`price:0`) doesn't checkout via Stripe — it enrolls by **application**. `Enroll.jsx` (on `price===0`) shows "Free — by application", collects a **required write-up** (≥300 chars), and submits to public, rate-limited **`POST /api/funnel?resource=free-enroll`** → an **inert PENDING** record (`store.js`: `paymentSource:"free"` + `writeup` + `priceCents:0` + `onboarded:false`) — no account/email/audience/`enrolled` event; it **notifies the founder** (with the write-up) + emails the applicant a confirmation (best-effort). The founder reviews in the console (**Students → Free applications**, `FreeApplicationsAdmin`, `GET ?resource=free-enrollments`) and **Approves** (`POST ?resource=free-approve`) — which runs the **same onboarding as Stripe/partner at $0** (provision `putUser` w/ `paymentSource:"free"`, `sendSetPasswordEmail`, Resend audience, `enrolled` event with `priceCents:0, source:"free"`), or **Declines** (`POST ?resource=free-remove`, silent). Free students, like partner students, **don't self-withdraw** — `Platform.jsx` hides the withdraw/refund UI for `s.paymentSource==="partner" || "free"` (`noSelfWithdraw`). Landing cards + Enroll show **"Free" / "By application"** when `price===0`. The approve/list/remove handlers mirror `onboardPartnerEnrollment`/`removePartnerEnrollment` (a 3-way Stripe/partner/free onboarding duplication — a future shared-helper refactor, deliberately not bundled since it touches the Stripe money path).
- **Exports:** "Download CSV/JSON" → `toCSV(events)` / `toDataRoom(events)` for an investor data room.
- **Env to enable:** `FOUNDER_EMAILS` (comma-separated admin emails) + `AUTH_SECRET` + the KV vars
  auth already uses. Tests: `test/funnel.test.js`
  (full lifecycle + aggregate counts/conversions/segments/revenue) and `test/founder-ui.test.jsx`
  (route gating).

## Business & legal setup (do first — not legal advice; consult professionals)
These precede the technical go-live items below and some gate them (e.g. Stripe wants a
business bank account). Founder is in Washington State (Sammamish area). A short paid consult
with a WA small-business attorney + a CPA is the recommended way to settle all of this at once.

> **Concrete step-by-step + official links + current fees: [`BUSINESS.md`](./BUSINESS.md).**
1. **Entity:** not legally required to start, but forming an **LLC** is the common choice —
   it shields personal assets (matters more here because the business takes family payments,
   makes refund promises, and works with minors). WA LLC = modest one-time filing + small
   annual report; no lawyer strictly needed to file. Alternatives: sole proprietor (zero setup,
   no liability shield — fine for testing only); S/C-corp (overkill unless raising investment).
2. **Insurance:** ask about general liability + professional liability (E&O) coverage — standard
   for a business serving minors.
3. **Working with minors:** parental-consent / liability-waiver language at enrollment, and any
   background-check norms for live instruction. This is the highest-stakes area — get an
   attorney's eyes on it (more than the entity choice itself).
4. **Refund policy review:** have counsel confirm the full→prorated(Act 1)→non-refundable
   wording in Terms and the enroll/dashboard copy.
5. **Tax:** tuition is taxable income; confirm with a CPA whether WA B&O / sales tax applies to
   an online educational service, and set up a business bank account + bookkeeping.
6. **Business banking:** open a business account so Stripe payouts, expenses, and taxes are
   separate from personal — needed before wiring real payments below.

## Go-live checklist (all user-side; values live in `CONFIG` + `BATCHES`)
1. **Domain/email:** set `CONFIG.brandDomain`, `CONFIG.contactEmail`. Verify the domain in
   Resend, set `RESEND_API_KEY` as a host env var, then flip `CONFIG.emailEnabled = true`.
2. **Scheduling:** set the booking link in the **founder console → Site settings** (or
   `CONFIG.calendlyUrl` as the code default) — BookCall switches to it automatically.
3. **Payments:** create Stripe Payment Links and paste each into its cohort’s `stripeLink` (live-editable in the founder dashboard, or in `cohorts.js`).
   The enroll flow round-trips via `?enrolled=<batchId>`.
4. **Cohorts:** update `BATCHES` (dates, real Zoom links, seats, prices).
5. **Legal:** have an attorney review `public/privacy.html`, `public/terms.html`, and the
   in-app `LEGAL` copy before launch (they're solid drafts, marked as such).
6. **SEO:** after deploy, submit to Google Search Console + Bing. The site is an SPA — for
   non-JS crawlers, add a prerender step (e.g. react-snap / vite-plugin-prerender).

## Quality bars to maintain (we held these — please keep them green)
- **Accessibility:** WCAG AA. Clickable non-buttons use `act()`. Color pairs pass AA
  contrast. `:focus-visible` outlines are global. (We verified 0 serious/critical via axe-core.)
- **Security:** no `eval`/`innerHTML`/`dangerouslySetInnerHTML`; `target="_blank"` links carry
  `rel="noopener noreferrer"`; the email function is POST-only, validates fields, HTML-escapes
  the body, and keeps the API key server-side only.
- **Performance:** landing initial JS budget ~120 KB gzip (currently ~90 KB).
- **Concurrency:** the `navLock` + functional `setState(prev => …)` updaters prevent
  double-click/lost-update races. Preserve both patterns.

## Testing
The prior session used standalone **jsdom** harnesses (functional, navigation, legal,
scroll-restore, accessibility via axe-core, performance budget, and concurrency). Those
scripts lived in a scratch workspace and are **not** in this repo. Recommended: set up
**Vitest + @testing-library/react** (and optionally jest-axe) and port these as real tests:
1. Full lifecycle: landing → book call → enroll (3 steps) → dashboard → 18 advances to graduation.
2. Navigation: Back returns to the *previous* page (e.g. Call → enroll-directly → Enroll →
   Back lands on Call); Enroll step2 → Back → step1.
3. Legal: Privacy/Terms open in-app and close; no broken `.html` links.
4. Scroll: forward nav tops the new page; Back restores prior scroll.
5. A11y: jest-axe reports 0 serious/critical on landing + enroll.
6. Perf: built `dist/assets` initial JS (excluding the lazy recharts chunk) stays under budget.
7. Concurrency: triple-click forward/Back = one transition; triple-click enroll commit =
   one enrollment; rapid double "advance" applies BOTH weeks (no lost update).

Note: jsdom can't catch *visual* issues (animation continuity, alignment, color, spacing,
mobile wrapping). Those need a real browser / human eyes — the founder reviews screenshots.

## House style (from the build so far)

> **Copy & messaging are governed by [`POSITIONING.md`](./POSITIONING.md)** — the source of truth
> for voice, the claims we make/avoid, and canonical phrasings. Some notes below predate this week's
> narrative pass; **where they conflict, POSITIONING.md wins.** Key changes since: the brand voice is
> **"us/we"** (the founder's name appears **only in the bio**, not in CTAs/operational copy); CTAs say
> **"Talk to us"** (never "Talk to Sunil"/"…first"); **Act 2 is "learn how to grow it,"** not "grow it
> into a business"/"1→100"; we **don't claim customers/income/scale achieved in the 12 weeks** (real
> traction is the long game — the builder prize is "within a year"); we **build with AI, we don't teach
> coding**; and **`WHY_STATS` is now builder-era quotes** (Karpathy/Altman/Huang), not survey stats.

- **Tagline / mission:** "**Raising builders, not consumers.**" This is the canonical line —
  it appears as the hero headline, in the footer, and in the SEO/JSON-LD. The full mission
  paragraph lives in the "More than money" section: *"Raising builders, not consumers. AI just
  collapsed the barrier to building — what once took a team and a budget, a motivated teenager
  can now do alone. So the edge isn't a credential; it's taste — knowing what's worth making —
  and starting early. We teach it by letting them live it: they build, they ship, then they learn to
  grow what they've made."*
  It is BUILD-LED, and the KEY ARGUMENT is causal: **AI collapsed the barrier to entry** (teams/
  budgets/permission no longer needed) → therefore **the edge is starting early** (ties to the
  brand name *Build Young*). Keep that "always mattered, but the barrier just dropped, so start
  young" chain — don't water it down to a generic "building matters in an AI world." Money-savvy
  is how you grow/protect what you build, not the headline. Keep all instances in sync. Tone is
  confident and forward, never fearful.
- **Voice (updated — see POSITIONING.md):** the brand speaks as **"us/we."** The founder's name
  (Sunil Garg) appears **only in the bio/identity** (founder note card + photo + story + signature,
  the Book-a-call identity, the certificate, the LinkedIn link, the JSON-LD founder entity) — NOT in
  CTAs or operational copy. First person is fine **inside** the founder story. CTAs say **"Talk to us"**
  (an option, never "first"). Keep it warm and grounded — avoid overclaiming/boastful phrasing.
- **Founder's note positioning (the "Why this exists" card in `Landing`):** after Sunil's
  personal story, the note now carries the product's positioning narrative — keep these three
  beats intact and consistent on future edits: (1) **free content goes unwatched** — banks/
  nonprofits have libraries of material, but a video doesn't make a teen show up; (2) **the
  paid live classes are investing-only** — they teach stock-picking (the flashy 10%), not the
  part that shapes a life; (3) **Build Young is the answer**: live + small-group + a standing
  weekly time (turns "available" into "done"), a financial foundation (paycheck, taxes, budget,
  big purchases, investing) and then the part almost no class does — **actually building
  something of your own, with AI as a tool, that people would pay for** — across **one continuous
  simulation** (12 weeks, ending with a capstone) where decisions compound and mistakes are safe.
  Closes on "money is a skill you practice" → "raising builders, not consumers." Renders as
  sibling `<p>`s sharing the founder paragraph's style.
- **The Agentic Engineering Process (SPECS/008) — the named through-line:** the build method the course teaches (and that Build Young is itself built with) is **Spec → Build → Check → Ship**, surfaced as `AgenticProcessPrimer` (Platform.jsx) — full card rendered directly at the head of Lesson 2 (where the method kicks in), a compact reminder strip at the head of Act 2 (Lesson 8) and Act 3 (Lesson 11). Steps: **Spec** (write the "done-when" first), **Build** (one slice), **Check** (the Lesson-2–6/8 "Check my work" independent-AI review, SPECS/008 T39/T40), **Ship** (Lesson 7 Go Live). Copy is POSITIONING-voiced (build with AI, not coding; us/we). Deferred follow-ons: a per-student project-brief doc + a "how Build Young is built" showcase. **The Check step (T39 → removed in SPECS/014):** an in-app `reviewAgent` (`POST /api/funnel?resource=review`, founder-toggleable) once graded the build server-side against `s.shape.accept[key]`; **that whole server agent + its console editor + ops are gone** — the Check is now a handoff to the student's OWN Claude. **Client (T40 → SPECS/013):** the student-facing Check is now **step ④ of `BuildLayer`** — a **handoff** that copies a prompt telling the student's OWN Claude to run a fresh **independent verifier agent** against `SPECS/<feature>.md`'s acceptance criteria (the way Build Young itself is verified). The old in-app "Check my work" card (paste-what-you-built → POST `reviewAgent` → verdict) was **removed**, and **SPECS/014 deleted the now-orphaned server `reviewAgent` + `ReviewAgentEditor` console + `reviewAgentEnabled`/`reviewModel` ops** entirely. The criteria are written as **step ② (`s.shape.accept[key]`, per-feature)**. **Framing (T41):** Lesson 7 `GoLiveChecklist` names itself the **"Ship"** step of the loop (copy only — checklist mechanics unchanged), and Lesson 11 capstone-prep (`REFLECT_WEEKS[11].intro`) tells the build story as Spec → Build → Check → Ship. **Project kit (SPECS/009 — in progress):** `src/projectKit.js` (foundation, pure) is the **single source of `AGENTIC_STEPS`** (imported by `AgenticProcessPrimer`) and `buildProjectKit({build, shape})` compiles `s.build`+`s.shape` → the student's **`CLAUDE.md` + a `SPECS/` folder (one spec per feature + an overview, SPECS/011) + `PITCH.md` + `PLAYBOOK.md`** (the docs their build-AI reads every session, with guardrails baked in) — the deterministic base. **`PITCH.md` is the student's living positioning (SPECS/019, renamed from `POSITIONING.md`): who it's for, the one promise, **why us vs. the alternative** (`s.build.edge`), the press release, the honest true-vs-goal line, and the product's **voice** (`s.build.voice` — how it talks; students set their own, not Build Young's "we/us"). Written in Week 1 (`BuildPlan`/`PitchFields`) and **editable on EVERY build week** via a collapsible "✎ Your pitch" panel in `BuildLayer` — it flows into the regenerated `PITCH.md` on each ③ build, so positioning gets the same write→refine treatment as specs. **Kit UI (T43 → SPECS/013; rendered as step ③ "Build it with Claude Code" inside `BuildLayer` on EVERY build week, `ProjectKitPanel({s, week})`):** it renders ONE **"Set up & build with Claude Code"** button (copies a prompt that writes all the files AND builds this feature) + a single current-week file download as fallback (no per-file grid, no preview); always reflects the live spec (re-generatable). T42/T43 done. **Create-your-repo (T44):** a `repo` item in `PREREQS` explains in plain English what a repo is + (when set) a one-click **"Use this template"** link to the founder's starter template repo — driven by a new founder-editable site setting **`starterRepoUrl`** (`src/site.js`; hidden when blank). Rendered via a generic `configLink` field on prereq items. (Fixed: `prereqWeek`'s regex now matches `"Lesson N"` — previously `/week N/` matched nothing, so the per-lesson Pre-req tab showed a "come in Week Infinity" artifact instead of the tool checklist.) **Optional AI polish (T45 → removed in SPECS/014):** an optional `kitAgent` (`POST /api/funnel?resource=kit`) once sharpened the kit files behind a **"Polish with AI"** button; **that server agent + its `KitAgentEditor` console + `kitAgentEnabled`/`kitModel` ops are gone** — the kit is now purely the deterministic `buildProjectKit`. **Spec 009 (T42–T44) shipped** — Path C (GitHub auto-commit for minors) stays deferred to a consent/auth phase.
- **Founder story (SPECS/010) — the college angle's artifact:** `src/founderStory.js` (foundation, pure) `buildFounderStory({build, shape, reflect})` compiles the student's capstone reflection (`s.reflect[11]`) + build into an honest, application-ready one-pager (essays / activities list / interviews / portfolio) + a "How to use this" helper; ships a worked `FOUNDER_STORY_EXAMPLE`. **`FounderStoryPanel`** (Platform.jsx) renders it at **Lesson 11 = DRAFT** (with the reflection + the sample `ExampleCard`) and **Lesson 12 = FINAL** for the presentation (`final` prop) — copy/download, re-generatable, never gates progression. **NO admissions-outcome language** anywhere (POSITIONING guardrail — evidence + a real story, not "gets you in"); a test asserts banned phrases absent. The college angle itself is a **sanctioned secondary, parent-facing** angle in POSITIONING.md. Deferred follow-ons: a public portfolio page (minors → consent) + optional AI polish.
- **Curriculum structure (WEEKS) — BUILD-FIRST, THREE acts, 12 weeks (7/3/2):** founder's outline:
  **Act 1 · 0→1 (Weeks 1–7)** — find a problem → then **each build week WRITE that week's feature spec
  and BUILD it** (SPECS/011 build-per-week): **Wk2 core product · Wk3 accounts & data · Wk4 payments ·
  Wk5 production-ready · Wk6 polish & iterate** → **Wk7 Go Live**;
  **Act 2 · 1→100 (Weeks 8–10)** — **The Funnel** (Wk8: spec a connected funnel + tracking via
  `BuildLayer`, PLUS list the funnel steps you track via `FunnelStages` → `s.funnelStages`) →
  **Metrics & Scaling** (Wk9: NO prompt — `FunnelScenarios` renders several PRACTICE funnels built
  from `s.funnelStages`, each shaped to a different story; the student writes a read per funnel and
  reveals the system's answer, saved to `s.reflect[9].notes`. The 4 built-ins are seeded/local; a
  **"Simulate more advanced scenarios"** button calls the **agent** — `POST /api/funnel?resource=scenarios`
  → `api/_lib/scenarioAgent.js` → Claude (via `fetch`, **`ANTHROPIC_API_KEY`** stays a host env var) —
  to generate fresh, harder funnels from the student's own metrics; output is run through
  `sanitizeScenarios` (one count per stage + a short read) so a bad model reply can't reach the UI, and
  it falls back to a local generator when the agent is off or no key is set. **On/off + which model are
  founder-configurable** in the dashboard (`ScenarioAgentEditor` → private ops settings `settings:ops`:
  `scenarioAgentEnabled` + `scenarioModel`; `saveOps` merges so it won't clobber `notifyEmail`). Default
  model is **`claude-haiku-4-5`** (cheap, per-student volume); options Haiku/Sonnet/Opus. A day-before
  cron can reuse `generateScenarios()` to pre-make per-student funnels once auth+KV+key are live. Tests:
  `scenarioAgent.test.js` + `settings-store.test.js`.)
  → **Product-Led Growth** (Wk10: a guided discussion with
  thought-provoking topics, NO prompt — `ReflectionPanel` from `REFLECT_WEEKS[10]`, saved to
  `s.reflect[10]`); **Act 3 · Manage (Week 11, ONE combined money week) + Capstone (Week 12)**.
  **One spec per build week (SPECS/011) — a 4-step loop run in the student's OWN Claude (SPECS/012 → 013):**
  every build week, `BuildLayer` shows the SAME four steps — two inputs the student types, two handoffs into
  their own Claude — each box = heading + a file-mapping badge + its one control:
  **① Write your spec** (`s.shape[key]`) → **② Write your acceptance criteria** (`s.shape.accept[key]`,
  per-feature) → **③ Build it with Claude Code** (`ProjectKitPanel`, on EVERY build week) → **④ Check your
  work — with an independent agent**. **③** is the single "into your Claude" path: one **"Set up & build with
  Claude Code"** button copies a prompt that writes/refreshes all the project docs (`buildProjectKit` → CLAUDE.md
  + the `SPECS/` folder, one file per feature with its acceptance criteria + an overview index + PITCH.md
  + PLAYBOOK.md) **and** builds this lesson's feature (`SPECS/<feature>.md`); a single current-week download is
  the fallback (no per-file grid, no preview). **④** copies a handoff telling the student's Claude to run a
  **fresh, independent verifier agent** (read `SPECS/<feature>.md`'s acceptance criteria + the real build →
  PASS/GAPS) — the way Build Young itself is verified; there is **no in-app review** (the student's Claude can
  see their code; our app deliberately can't touch a minor's repo). `s.shape` holds one field per feature —
  `product`(Wk2)/`accounts`(Wk3)/`payments`(Wk4)/`production`(Wk5)/`polish`(Wk6)/`funnel`(Wk8) — plus
  **`accept`**, an object of **per-feature** acceptance criteria (`accept[key]`, each folded into that feature's
  own `SPECS/<feature>.md` — SPECS/012 reversed SPECS/011's single global `acceptance`). `BUILD_LAYERS` (keyed by
  weeks **2, 3, 4, 5, 6, 8**; `BUILD_WEEKS` = that set) drives `BuildLayer`. **The whole plan is ONE object —
  `s.shape`**: every build week reads/writes its own `s.shape[key]` + `s.shape.accept[key]` (single source of
  truth). **Lesson 2 is the first build week:** the `AgenticProcessPrimer` (method intro, rendered directly) →
  the core-product `BuildLayer` (the 4 steps). **There is NO standalone product-vision panel** (SPECS/012 removed
  it + the `success` field — product metrics are their own lesson, Wk9). **SPECS/014** then deleted the
  orphaned server `reviewAgent` + `kitAgent` + their `ReviewAgentEditor`/`KitAgentEditor` consoles + ops +
  the kit's "Polish with AI" button (the only student AI agent left is the Wk-9 `scenarioAgent`). **Week 8** (`funnel`) is specced in-week against a worked
  `SHAPE_EXAMPLE.funnel` sample that mirrors Build Young's real connected funnel. **Week 7
  "Go Live" is NOT a prompt — it's an editable CHECKLIST** (`GoLiveChecklist` + `GO_LIVE_DEFAULT`,
  ticks/edits saved in `s.golive`): grouped items each with a "how to do it", student adds/edits/
  removes per project. Lesson 2 also shows the build
  pre-reqs. Each Act-2 week prepends plain-English `GlossaryCard`s (Wk8: `FUNNEL_PRIMER` +
  `METRICS_PRIMER`; Wk9: `METRICS_PRIMER`; Wk10: `PLG_PRIMER`). `SHAPE_EXAMPLE`
  is the worked Build-Young spec (`product`/`accounts`/`payments`/`production`/`polish`/`funnel`, each with an `accept[key]` "Done when…" sample). (`WEEK_INFRA`/`InfraBuildPlan`/`MAKE_PRINCIPLES`/
  `PrinciplesCard` are now unused/legacy.) **No finance weeks:** Act 3 is **Week 11 "Get Your First
  Customers"** (go-to-market, `action:"build"`) + the **Week 12 capstone** (`action:"capstone"`) — there
  are NO money/investing/markets weeks (all that was removed). Every week is `action:"build"` except
  Week 12. `WEEK_TITLES` (`marketMedia.js`) stays in sync with `WEEKS`. 12 weeks; 180 tests pass.
- Microsoft is framed as **ex-Microsoft** in short credential tags.
- Keep the design calm and credible (no gimmicky floating widgets). Centered section headers.
- **Optimize for less scrolling — always.** Every screen (marketing + app) should get the visitor to the
  point with the *least* vertical travel: key value and the next action (enroll / talk to us / the primary
  CTA) reachable fast, ideally within the first viewport or a short scroll. *Why:* scrolling is friction
  and the funnel leaks at exactly the "before they act" stage (see the Visited → Enroll-started drop-off) —
  every extra screen-height is a chance to lose someone, especially on mobile. So when you add or edit UI,
  **default to compact:** tighten section padding and vertical gaps, avoid stacked near-empty sections and
  oversized hero whitespace, consolidate adjacent cards/steps, lift the CTA up, and prefer a denser-but-
  still-calm layout over a tall airy one. Treat "could this be shorter / fit in less height?" as a standing
  question on any layout change — don't let pages grow taller without a reason. (This is the on-page sibling
  of the diagram "compact, no large empty regions" rule.)
  - **Landing page — keep it lean (enforced).** The marketing landing (`Landing.jsx`, the funnel entry) was
    cut ~60% (T13) by moving long-form blocks to their own routes — the founder essay/"more than money" →
    `/about` (`About.jsx`), the 3-act "how it works" + "where the work happens" → `/curriculum`
    (`Curriculum.jsx`), the full FAQ → `/faq` (`Faq.jsx`) — each linked from a short teaser. **Don't grow
    long-form content back onto the landing**; if a new block is substantial, put it on a sub-page and
    teaser-link it. A guard enforces this: **`test/landing-lean.test.jsx`** fails (and the `landing-lean` CI
    check blocks the merge) if the landing re-inflates past its content-volume ceiling. (jsdom has no layout
    engine, so the guard proxies rendered height via text-volume + node count, calibrated to the measured
    ≤5,579px @ 390px = 50% of the pre-T13 baseline; re-measure with a headless browser if you raise it.)
- **Typography:** display/headings/wordmark use **Space Grotesk** (`.disp` class); body uses
  **Inter** (`.flp`). Both load from Google Fonts — a `<link>` in `index.html` (and the
  standalone head) plus an `@import` at the top of the `FONTS` string; system-font fallbacks
  follow. Keep all three font sources in sync if you change the families.
- **Color accents (teen energy, used sparingly):** two gradient-text classes in `FONTS` —
  `.grad` (blue→teal→green, ties to the logo blocks) and `.grad-warm` (blue→purple→pink).
  Apply them to a SINGLE key word only (e.g. "Young" in the wordmark, "builders," in the hero
  headline, "three acts" / "money" in section titles), never whole sentences — restraint is
  what keeps it credible rather than cheap. The SVG dashboard-mock wordmark uses an equivalent
  `<linearGradient id="bygrad">` fill. Gradient text keeps its real text content underneath
  (transparent fill only), so screen readers and axe are unaffected — preserve that.
- **No flag/emoji glyphs for meaningful UI content** (labels, data). They render inconsistently
  across platforms — a flag emoji (`🇺🇸`) falls back to the bare country letters on Windows/Chrome,
  which also *duplicates* an adjacent code (we shipped "US US visits by state" this way). Use plain
  text / 2-letter codes (the founder geography shows `US`, `WA`, …) or a tested inline-SVG icon
  (`lucide-react`/`lucide-static`), never raw emoji for content. Decorative emoji are fine only where a
  degraded fallback is harmless.
- The site is **entrepreneurship education** — it teaches teens to build and sell a real product.
  It is **not** financial/investment advice, and there is no money simulation.
- **Statistics integrity:** every stat in `WHY_STATS` (and any new claim) must link to its
  PRIMARY source, be dated, and be current. When editing: re-open each link, confirm the number
  and year, and check for a newer edition before shipping. Update the number AND its `url`
  together. Don't reuse the undated "73% want to learn more" figure that floats around the web
  — it traces to a 2021 Greenlight survey; the dated JA/Citizens (2024) figures we use are
  fresher and primary-sourced. Survey numbers refresh annually, so re-verify before any raise.
