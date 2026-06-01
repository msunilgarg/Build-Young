# Built Young — project guide for Claude Code

This file orients you (Claude Code) to the project so you can build new functionality
confidently. Read it fully before making changes.

## What this is
**Built Young** is a live, online money-skills program for teens (ages 13–18), plus a
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

## Run it
```bash
npm install
npm run dev        # local dev server
npm run build      # production build → dist/
npm run preview    # preview the production build
```

## Project structure
```
built-young-app/
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
  Spring 2027). `BATCHES` has 12 entries = 3 seasons × {MS Mon, MS Tue, HS Wed, HS Thu};
  each has a `season` key. Ids look like `fall-hs-wed`. `CONFIG.stripeLinks` auto-derives one
  empty slot per batch id from `BATCHES`. The landing "Upcoming batches" section has a season
  pill selector (Fall shown first) and shows that season's 4 cards; the enroll dropdown groups
  options by season via `<optgroup>`. To add a season, append to `SEASONS` + 4 `BATCHES` rows.
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

- **Refund policy (in code):** full refund before the cohort starts (state flag `started:false`, flips true on first `doAdvance`); prorated refund through Act 1 (weeks 1–3) = `price×(12−week)/12`; non-refundable after Act 1 (shown explicitly to the student once Week 3 passes). Logic lives in `Platform` (`notStarted`, `canWithdraw`, `refund`) and the Terms copy in `LEGAL`.
- **Tuition prize:** each cohort, the student with the **highest simulated portfolio value** at the end of the 12-week course wins their **tuition refunded**. Criterion is deliberately *highest value* (the real-world objective) — we welcome diverse investing beliefs, not a diversification gate. Surfaced in three places that must stay in sync: the landing **pricing** intro ("Win your tuition back"), the dashboard **capstone** ("your entry"), and the **Terms** "Tuition prize" section in `LEGAL`. The winner is **instructor-confirmed** (the app has no server-side cross-student comparison). It's a contest involving minors → keep the attorney-review flag in the Terms copy. **Anti-gaming (layer 1 — done):** the market schedule (`FLAT_MACRO`/`MACRO`/`CHECKIN_MACRO`/`marketEventFor` + the `MEDIA` map) now lives **server-only** in `api/_lib/marketSchedule.js` and NO LONGER ships in the client bundle, so students can't read future events from devtools. The client learns the **single current** event by fetching `/api/market-event` (server-only schedule lookup; never the full array); offline/demo/tests fall back to a **non-revealing placeholder** ("Markets are moving", neutral effects) so the demo still runs without leaking the schedule. Per-student randomization is intentionally NOT used — a fair cohort prize requires everyone face the same market. **Remaining gap (layer 2):** the simulation state still lives in client localStorage and is user-editable, so true tamper-proof scoring needs **server-authoritative state + auth** (a separate follow-up). The schedule modules `src/marketMedia.js` (client-safe builders/metadata) and `api/_lib/marketSchedule.js` (server-only schedule) MUST stay separate — never import the latter from anything under `src/`.

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
2. **Scheduling:** set `CONFIG.calendlyUrl` (BookCall switches to it automatically).
3. **Payments:** create Stripe Payment Links and fill `CONFIG.stripeLinks` per batch id.
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
  paragraph lives in the "More than money" section: *"Raising builders, not consumers. How
  money works — the thing that matters most in real life — isn't on any test. We teach it by
  letting our kids live it, so in a world changing faster than any classroom can keep up,
  their future rests on what they can build, not just what they were credentialed to do."*
  If you reword it, keep all instances in sync. Tone is confident and forward, never fearful;
  the AI/credential shift is implied, never stated outright.
- Tone is first-person from Sunil where the parent is deciding ("…taught by me", "I'll
  answer anything"). CTAs say "Talk to Sunil", not "the founder".
- **Founder's note positioning (the "Why this exists" card in `Landing`):** after Sunil's
  personal story, the note now carries the product's positioning narrative — keep these three
  beats intact and consistent on future edits: (1) **free content goes unwatched** — banks/
  nonprofits have libraries of material, but a video doesn't make a teen show up; (2) **the
  paid live classes are investing-only** — they teach stock-picking (the flashy 10%), not the
  part that shapes a life; (3) **Built Young is the answer**: live + small-group + a standing
  weekly time (turns "available" into "done"), the **whole** financial picture (paycheck, taxes,
  budget, credit, big purchase, portfolio — not investing trivia), and **one continuous
  simulation** carried across 12 weeks + 6 monthly check-ins where decisions compound and
  mistakes are safe. Closes on "money is a skill you practice, not a subject you study" →
  "raising builders, not consumers." It renders as separate sibling `<p>`s sharing the founder
  paragraph's style (`color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12`).
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
