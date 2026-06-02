# Build Young — project guide for Claude Code

This file orients you (Claude Code) to the project so you can build new functionality
confidently. Read it fully before making changes.

## What this is
**Build Young** is a live, online money-skills program for teens (ages 13–18), plus a
single-page React marketing site + enrollment flow + an interactive "money simulation"
dashboard students use after enrolling. Tagline: *"Raising builders, not consumers."*
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
│   ├── App.jsx           # ~1600 lines: the ENTIRE app lives here (see "Code map")
│   └── Charts.jsx        # recharts wrapper, lazy-loaded by App.jsx
├── api/
│   └── send-email.js     # serverless email sender (Resend); POST-only, validates input, HTML-escapes body
├── public/
│   ├── privacy.html, terms.html   # standalone legal pages (also rendered in-app as a modal)
│   ├── robots.txt, sitemap.xml, llms.txt, favicon.svg, og-image.png
└── vite.config.js
```

## Code map (everything is in `src/App.jsx`)
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
  Spring 2027). ONE combined **"Builders"** track (ages 13–18; no MS/HS split). `BATCHES` has 6
  entries = 3 seasons × 2 cohorts on alternating day-pairs (**Mon & Wed**, **Tue & Thu**); each
  meets **twice a week (~3 hrs)** over the 12-week course. `track` is `"Builders"` for all. Ids
  look like `fall-mw` / `fall-tt`. `CHECKINS` (= **1**) lives in cohorts.js too (imported by
  App.jsx + funnel.js). The cohort catalog is **KV-backed + live-editable in the founder dashboard** (code `BATCHES` = seed/fallback; public read at `/api/cohorts`; each cohort carries its own `stripeLink`; clients hydrate via `CohortsContext`). The landing
  “Upcoming batches” section shows that season’s 2 cards; the enroll dropdown groups options by
  season via `<optgroup>`. To add a season, append to `SEASONS` + 2 `BATCHES` rows.
- **`HeroPreview`** — animated dashboard mock that cycles weeks 5→8→12 on the landing page.
- **`LEGAL` + `LegalModal`** — in-app Privacy/Terms popup (works without separate files).
- **`WHY_STATS` + `WhyStrip`** — the "Why this matters" social-proof stat cards shown on the
  Enroll (step 1) and BookCall pages to fill whitespace at the decision point. Each stat has a
  `url` that links to its PRIMARY source (opens new tab). The standalone pitch-deck version is
  `built-young-why-this-matters.md` in the outputs folder (kept in parallel, not in this repo).
- **`Landing`** — the marketing page (nav, hero, how-it-works, 3-act curriculum, philosophy,
  founder, batches/pricing, footer).
- **`Enroll`** — 3-step enrollment (checkout-style step 1, payment, confirmation).
- **`BookCall`** — free 15-min call booking (two-column: scheduler + "what you'll get from me").
- **`Platform`** + panels (`WeekPanel`, `PortfolioPanel`, markets) — the post-enrollment dashboard.
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

- **Refund policy (in code):** full refund before the cohort starts (state flag `started:false`, flips true on first `doAdvance`); prorated refund through the first **`REFUND_WEEKS`** (= **1**) course week; non-refundable after (shown explicitly once that window passes). Eligibility is the single helper **`canWithdrawNow(s)`** (gates the Cancel/Withdraw button AND `doWithdraw` itself) — change `REFUND_WEEKS` to move the window; copy uses `REFUND_WEEKS`/`REFUND_WEEKS+1` so it follows. **Proration basis = "sessions not yet held"** (matches the Terms): `week` increments on each advance (attending session 1 → "Week 2"), so sessions held = `week−1` and `refund = refundFor(batch, started, week) = price × (12 − (week−1)) / 12`. Don't reintroduce `price×(12−week)/12` — that's the old off-by-one that under-refunded one session and overstated attendance. NOTE: refund copy refers to "the first 2 weeks", NOT "Act 1" — after the build-first flip, Act 1 is the 6-week build arc. Logic lives in `Platform` + `withdrawalEmail`; Terms copy in `LEGAL` (in-app) and `public/terms.html` must stay in sync.
- **Income model (BUILD-EARNED, not a paycheck):** income comes from the student's *build*, not employment. `INCOME[]` in `App.jsx` is the per-course-week revenue curve — **$0 in the early build weeks**, ramping to a steady `STEADY_INCOME` (= `PAY` = **$10,000**) once the build lands customers (≈week 6) and through the finance act + check-ins. `incomeFor(phase, week)` is the single source; `advance()` uses it. **There is NO employer 401(k) match** (self-employed builder — `advance` adds only the student's own retirement set-aside, no match). **Taxes stay** (15%, framed as self-employment/business tax). **Living costs** (`LIVING`) apply only once independent (finance act, week ≥ `FINANCE_FIRST_WEEK`=7). Other dollar constants (`HOME`/`CAR`/`EMERGENCY`/`SPREE`/`INSURANCE`/`ALT_BUY`/`PE_BUY`) unchanged. All income/cost COPY derives from these; the batch-sim harness imports them. Tests assert relationships, not literals.
- **Tuition prize:** each cohort, the student with the **highest simulated portfolio value at the final (6th) monthly check-in** — i.e. the close of the full program (12 weeks + 6 check-ins) — wins their **tuition refunded**. Criterion is deliberately *highest value* (the real-world objective) — we welcome diverse investing beliefs, not a diversification gate. Surfaced in three places that must stay in sync: the landing **pricing** intro ("Win your tuition back"), the dashboard **capstone** ("you're in the running"), and the **Terms** "Tuition prize" section in `LEGAL`. The winner is **instructor-confirmed** (the app has no server-side cross-student comparison). It's a contest involving minors → keep the attorney-review flag in the Terms copy. **Anti-gaming (layer 1 — done):** the market schedule (`FLAT_MACRO`/`MACRO`/`CHECKIN_MACRO`/`marketEventFor` + the `MEDIA` map) now lives **server-only** in `api/_lib/marketSchedule.js` and NO LONGER ships in the client bundle, so students can't read future events from devtools. The client learns the **single current** event by fetching `/api/market-event` (server-only schedule lookup; never the full array); offline/demo/tests fall back to a **non-revealing placeholder** ("Markets are moving", neutral effects) so the demo still runs without leaking the schedule. Per-student randomization is intentionally NOT used — a fair cohort prize requires everyone face the same market. **Remaining gap (layer 2):** the simulation state still lives in client localStorage and is user-editable, so true tamper-proof scoring needs **server-authoritative state + auth** (a separate follow-up). The schedule modules `src/marketMedia.js` (client-safe builders/metadata) and `api/_lib/marketSchedule.js` (server-only schedule) MUST stay separate — never import the latter from anything under `src/`.

## Founder funnel analytics (hidden `?founder` route, account-gated)

A connected acquisition→engagement funnel for the founder/investors. **All stage definitions and
conversion/curve/revenue math live in ONE place — `src/funnel.js`** (dependency-free; imported by
`App.jsx`, the read endpoint, and tests so they can't drift).

- **Ordered stages (the linear spine):** `visited` → `enroll_started` → `enrolled` →
  `class_started` → `graduated`. Non-spine signals feed their own charts: `call_booked` (parallel
  "Talk to Sunil" assist path — enrollments split call→enroll vs. direct via a `fromCall` prop), and
  the progression curves `week_advanced` (weeks 2–12) + `checkin_completed` (the post-grad check-in — `CHECKINS`, currently 1).
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
- **Revenue:** `summarize().revenue` = enrolled `priceCents` − withdrawn `refundCents` (gross/refunded/net).
- **Admin = founder, by account (not a URL token):** access is gated by the logged-in **session** —
  a user whose email is in the **`FOUNDER_EMAILS`** allowlist (`isFounderEmail`/`requireFounder` in
  `api/_lib/auth.js`; `/api/auth/me` returns `isFounder`). The Platform header shows an **Admin**
  entry for founders; the hidden `?founder` route renders `FounderDashboard`.
- **One endpoint, method-routed (Hobby 12-function cap):** **`POST /api/funnel`** = public event
  ingest (`funnel:events` KV list, capped); **`GET`** = founder-only funnel read; **`PUT`** = founder
  saves the cohort catalog (default), the **admin allowlist** (`?resource=founders`), or the **site
  settings** (`?resource=settings`); **`DELETE`** = founder resets a test account. All non-POST
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
  (Calendly), contact email, LinkedIn URL** — are now editable live from the console (no redeploy),
  alongside cohorts/Stripe links. Defaults are single-sourced in **`src/site.js`** (`SITE_DEFAULTS`,
  imported by `CONFIG` and the server store); stored in KV (`settings:site` via
  `api/_lib/settingsStore.js`); read publicly folded into **`GET /api/cohorts`** (`{batches, checkins,
  settings}`) and saved via `PUT /api/funnel?resource=settings`. The client hydrates by
  `Object.assign(CONFIG, settings)` on load + a re-render. **Secrets/deploy toggles stay env-only**
  (`emailEnabled`/`authEnabled`/`RESEND_API_KEY`/`AUTH_SECRET`/KV); the console shows them read-only
  in **System status**. So: every founder go-live config a web console *can* own is in the console;
  only host secrets remain on the host.
- **Exports:** "Download CSV/JSON" → `toCSV(events)` / `toDataRoom(events)` for an investor data room.
- **Env to enable:** `FOUNDER_EMAILS` (comma-separated admin emails) + `AUTH_SECRET` + the KV vars
  auth already uses. Tests: `test/funnel.test.js`
  (full lifecycle + aggregate counts/conversions/segments/revenue) and `test/founder-ui.test.jsx`
  (route gating).

## Business & legal setup (do first — not legal advice; consult professionals)
These precede the technical go-live items below and some gate them (e.g. Stripe wants a
business bank account). Founder is in Washington State (Sammamish area). A short paid consult
with a WA small-business attorney + a CPA is the recommended way to settle all of this at once.
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
- **Tagline / mission:** "**Raising builders, not consumers.**" This is the canonical line —
  it appears as the hero headline, in the footer, and in the SEO/JSON-LD. The full mission
  paragraph lives in the "More than money" section: *"Raising builders, not consumers. Building
  something people value has always mattered — but AI just collapsed the barrier to entry: what
  used to take a team, a budget, and years of permission, a motivated teenager can now do alone.
  When the cost of building falls to almost nothing, the edge isn't talent or a credential — it's
  starting early, while everyone else is still waiting to be ready. We teach it by letting them
  live it — they build, they earn, then they learn to grow and protect what they've made —
  because their future rests on what they can make, not just what they were credentialed to do."*
  It is BUILD-LED, and the KEY ARGUMENT is causal: **AI collapsed the barrier to entry** (teams/
  budgets/permission no longer needed) → therefore **the edge is starting early** (ties to the
  brand name *Build Young*). Keep that "always mattered, but the barrier just dropped, so start
  young" chain — don't water it down to a generic "building matters in an AI world." Money-savvy
  is how you grow/protect what you build, not the headline. Keep all instances in sync. Tone is
  confident and forward, never fearful.
- Tone is first-person from Sunil where the parent is deciding ("…taught by me", "ask me
  about…"). CTAs say "Talk to Sunil", not "the founder". Keep it warm and grounded — avoid
  overclaiming/boastful phrasing (e.g. don't promise to "answer anything").
- **Founder's note positioning (the "Why this exists" card in `Landing`):** after Sunil's
  personal story, the note now carries the product's positioning narrative — keep these three
  beats intact and consistent on future edits: (1) **free content goes unwatched** — banks/
  nonprofits have libraries of material, but a video doesn't make a teen show up; (2) **the
  paid live classes are investing-only** — they teach stock-picking (the flashy 10%), not the
  part that shapes a life; (3) **Build Young is the answer**: live + small-group + a standing
  weekly time (turns "available" into "done"), a financial foundation (paycheck, taxes, budget,
  big purchases, investing) and then the part almost no class does — **actually building
  something of your own, with AI as a tool, that people would pay for** — across **one continuous
  simulation** (12 weeks + 6 monthly check-ins) where decisions compound and mistakes are safe.
  Closes on "money is a skill you practice" → "raising builders, not consumers." Renders as
  sibling `<p>`s sharing the founder paragraph's style.
- **Curriculum structure (WEEKS) — BUILD-FIRST, two acts, 12 weeks:** the order is flipped so
  the narrative is causal: **Act 1 "Build Something People Want" (Weeks 1–6)** — the student
  creates something people pay for; *that* is what starts their income — then **Act 2 "Manage
  What You've Earned" (Weeks 7–12)** — business finances, investing, big purchases, budgeting,
  capstone. Markets only run once there's a portfolio: `MACRO` events fire **Weeks 8–12**
  (`MARKET_FIRST_WEEK`=8 in `marketSchedule.js`; `MEDIA_WEEKS`={8,12} in `schedule.js`); weeks
  1–7 are flat. Build weeks use `action:"build"` + `comingSoon:true` with a placeholder panel —
  **real build-lesson content is pending Sunil's outline.** Retired finance topics (Credit,
  Portfolio Review, Active Investing, Beyond Stocks) are **parked** on the budget week
  (`parked:[]`, shown as "More money topics — coming soon"); their old `WeekPanel` branches
  remain unrouted. `WEEK_TITLES` in `marketMedia.js` must stay in sync with `WEEKS` titles.
  Still 12 weeks → no ripple to pricing/refund math, but the income engine + market-start week
  DID change (see Income model above), so the harness, schedule, and ~40 tests were updated.
- Microsoft is framed as **ex-Microsoft** in short credential tags.
- Keep the design calm and credible (no gimmicky floating widgets). Centered section headers.
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
- Always note money is **simulated** — no real funds. The site is **financial education,
  not licensed financial advice.**
- **Statistics integrity:** every stat in `WHY_STATS` (and any new claim) must link to its
  PRIMARY source, be dated, and be current. When editing: re-open each link, confirm the number
  and year, and check for a newer edition before shipping. Update the number AND its `url`
  together. Don't reuse the undated "73% want to learn more" figure that floats around the web
  — it traces to a 2021 Greenlight survey; the dated JA/Citizens (2024) figures we use are
  fresher and primary-sourced. Survey numbers refresh annually, so re-verify before any raise.
