# Build Young — project guide for Claude Code

This file orients you (Claude Code) to the project so you can build new functionality
confidently. Read it fully before making changes.

## What this is

**Build Young** is a live, online money-skills program for teens (ages 13–18), plus a
single-page React marketing site + enrollment flow + an interactive “money simulation”
dashboard students use after enrolling. Tagline: *“Raising builders, not consumers.”*
Founder: **Sunil Garg** (ex-Microsoft, 20 years in product). LinkedIn:
<https://www.linkedin.com/in/msunilgarg>

## Tech stack

- **React 18** single-page app, built with **Vite**.
- Charts via **recharts** (lazy-loaded — see “Performance” below).
- Icons via **lucide-react**.
- No router library — navigation is a hand-rolled history stack inside `App` (see “Navigation”).
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
  Spring 2027). `BATCHES` has 12 entries = 3 seasons × {MS Mon, MS Tue, HS Wed, HS Thu};
  each has a `season` key. Ids look like `fall-hs-wed`. `CONFIG.stripeLinks` auto-derives one
  empty slot per batch id from `BATCHES`. The landing “Upcoming batches” section has a season
  pill selector (Fall shown first) and shows that season’s 4 cards; the enroll dropdown groups
  options by season via `<optgroup>`. To add a season, append to `SEASONS` + 4 `BATCHES` rows.
- **`HeroPreview`** — animated dashboard mock that cycles weeks 5→8→12 on the landing page.
- **`LEGAL` + `LegalModal`** — in-app Privacy/Terms popup (works without separate files).
- **`WHY_STATS` + `WhyStrip`** — the “Why this matters” social-proof stat cards shown on the
  Enroll (step 1) and BookCall pages to fill whitespace at the decision point. Each stat has a
  `url` that links to its PRIMARY source (opens new tab). The standalone pitch-deck version is
  `built-young-why-this-matters.md` in the outputs folder (kept in parallel, not in this repo).
- **`Landing`** — the marketing page (nav, hero, how-it-works, 3-act curriculum, philosophy,
  founder, batches/pricing, footer).
- **`Enroll`** — 3-step enrollment (checkout-style step 1, payment, confirmation).
- **`BookCall`** — free 15-min call booking (two-column: scheduler + “what you’ll get from me”).
- **`Platform`** + panels (`WeekPanel`, `PortfolioPanel`, markets) — the post-enrollment dashboard.
- **`App`** (default export) — owns routing, history/scroll, the nav lock, persistence,
  and the legal modal.

## Navigation (important — don’t replace with a router casually)

`App` keeps `route` (“home” | “enroll” | “call” | “app”) and a `history` stack of
`{route, scroll}` entries.

- `nav(to)` pushes current route+scroll, then navigates (new page starts at top).
- `goBack()` pops and **restores the previous scroll position**.
- `goHome()` clears history.
- A **single-flight `navLock` ref** wraps these via `guard(fn)` so rapid double-clicks
  can’t desync the stack or double-submit enrollment. Keep this guarantee if you refactor.

## Performance (keep this win)

recharts (~344 KB, ~110 KB gzip) is **only** used in the dashboard, so it’s split out via
`const Charts = React.lazy(() => import("./Charts.jsx"))` and wrapped in `<React.Suspense>`.
This keeps the landing-page initial JS ~90 KB gzip. Don’t statically import recharts into
App.jsx — that would undo it. `npm run build` (Vite) preserves this split automatically.

- **Refund policy (in code):** full refund before the cohort starts (state flag `started:false`, flips true on first `doAdvance`); prorated refund through the first **`REFUND_WEEKS`** (= **2**) course weeks; non-refundable after (shown explicitly once that window passes). Eligibility is the single helper **`canWithdrawNow(s)`** (gates the Cancel/Withdraw button AND `doWithdraw` itself) — change `REFUND_WEEKS` to move the window; copy uses `REFUND_WEEKS`/`REFUND_WEEKS+1` so it follows. **Proration basis = "sessions not yet held"** (matches the Terms): `week` increments on each advance (attending session 1 → "Week 2"), so sessions held = `week−1` and `refund = refundFor(batch, started, week) = price × (12 − (week−1)) / 12`. Don't reintroduce `price×(12−week)/12` — that's the old off-by-one that under-refunded one session and overstated attendance. Logic lives in `Platform` + `withdrawalEmail`; Terms copy in `LEGAL` (in-app) and `public/terms.html` must stay in sync.

## Auth & server state (`CONFIG.authEnabled`, off by default)

Real accounts + cross-device dashboard, built on the existing KV store (`api/_lib/kv.js` — Upstash/Vercel KV over REST) and Node's built-in `crypto` — **no new npm deps, no new vendor.**

- **Gated by `CONFIG.authEnabled`.** **False (default):** the original self-contained demo — no login, sim state in `localStorage` via `window.storage`. **True:** the dashboard requires login and the sim state lives server-side (`/api/state`, keyed by the session email), so it follows the student across devices. Existing tests run in demo mode, so they're unaffected; keep that branch working.
- **Core:** `api/_lib/auth.js` — scrypt password hashing (per-user salt, constant-time verify); **stateless** HMAC-signed session in an HttpOnly/Secure/SameSite=Lax cookie (`AUTH_SECRET` signs it; logout clears it); user records + one-time set-password tokens (random 256-bit, KV-stored with TTL, consumed via GETDEL).
- **No passwords on the enroll form.** Account creation is server-side: the **Stripe webhook** (`api/stripe-webhook.js`), after a verified payment, provisions the user record and emails a `?setpw=<token>` link (`api/_lib/sendSetPassword.js` → Resend). The SPA reads `?setpw=` → **SetPassword** screen → sets the hash + signs in. Returning students use the **Login** screen (`?enrolled=` return → **CheckEmail** screen). All three auth screens + the client (`AUTH`, `postJson`) live in `App.jsx`.
- **Endpoints:** `api/auth/{set-password,login,logout,me,request-reset}.js` + `api/state.js`. Login/reset give **generic, non-enumerating** errors and are rate-limited (`api/_lib/rateLimit.js`). Reset always returns 200.
- **Serves minors:** stores only what enrollment already collects (email, name, cohort) + a password hash; no password is ever logged or returned. Get counsel's eyes on auth/data handling alongside the other minors-related items.
- **Env when enabling:** `KV_REST_API_URL`+`KV_REST_API_TOKEN` (or the Upstash pair), `AUTH_SECRET`, `PUBLIC_BASE_URL`. Tested via an in-memory KV fake (`test/auth-endpoints.test.js`) + crypto-core (`test/auth.test.js`) + UI (`test/auth-ui.test.jsx`).

## Business & legal setup (do first — not legal advice; consult professionals)

These precede the technical go-live items below and some gate them (e.g. Stripe wants a
business bank account). Founder is in Washington State (Sammamish area). A short paid consult
with a WA small-business attorney + a CPA is the recommended way to settle all of this at once.

1. **Entity:** not legally required to start, but forming an **LLC** is the common choice —
   it shields personal assets (matters more here because the business takes family payments,
   makes refund promises, and works with minors). WA LLC = modest one-time filing + small
   annual report; no lawyer strictly needed to file. Alternatives: sole proprietor (zero setup,
   no liability shield — fine for testing only); S/C-corp (overkill unless raising investment).
1. **Insurance:** ask about general liability + professional liability (E&O) coverage — standard
   for a business serving minors.
1. **Working with minors:** parental-consent / liability-waiver language at enrollment, and any
   background-check norms for live instruction. This is the highest-stakes area — get an
   attorney’s eyes on it (more than the entity choice itself).
1. **Refund policy review:** have counsel confirm the full→prorated(Act 1)→non-refundable
   wording in Terms and the enroll/dashboard copy.
1. **Tax:** tuition is taxable income; confirm with a CPA whether WA B&O / sales tax applies to
   an online educational service, and set up a business bank account + bookkeeping.
1. **Business banking:** open a business account so Stripe payouts, expenses, and taxes are
   separate from personal — needed before wiring real payments below.

## Go-live checklist (all user-side; values live in `CONFIG` + `BATCHES`)

1. **Domain/email:** set `CONFIG.brandDomain`, `CONFIG.contactEmail`. Verify the domain in
   Resend, set `RESEND_API_KEY` as a host env var, then flip `CONFIG.emailEnabled = true`.
1. **Scheduling:** set `CONFIG.calendlyUrl` (BookCall switches to it automatically).
1. **Payments:** create Stripe Payment Links and fill `CONFIG.stripeLinks` per batch id.
   The enroll flow round-trips via `?enrolled=<batchId>`.
1. **Cohorts:** update `BATCHES` (dates, real Zoom links, seats, prices).
1. **Accounts/login (optional, off by default):** to require login + sync the dashboard across
   devices, provision a KV store (`KV_REST_API_URL`/`KV_REST_API_TOKEN`, or the Upstash pair),
   set `AUTH_SECRET` (a long random string — signs session cookies) and `PUBLIC_BASE_URL` (for
   the set-password links), then flip `CONFIG.authEnabled = true`. Stripe must be wired first:
   real enrollments are what provision accounts. See **Auth** below.
1. **Legal:** have an attorney review `public/privacy.html`, `public/terms.html`, and the
   in-app `LEGAL` copy before launch (they’re solid drafts, marked as such).
1. **SEO:** after deploy, submit to Google Search Console + Bing. The site is an SPA — for
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
1. Navigation: Back returns to the *previous* page (e.g. Call → enroll-directly → Enroll →
   Back lands on Call); Enroll step2 → Back → step1.
1. Legal: Privacy/Terms open in-app and close; no broken `.html` links.
1. Scroll: forward nav tops the new page; Back restores prior scroll.
1. A11y: jest-axe reports 0 serious/critical on landing + enroll.
1. Perf: built `dist/assets` initial JS (excluding the lazy recharts chunk) stays under budget.
1. Concurrency: triple-click forward/Back = one transition; triple-click enroll commit =
   one enrollment; rapid double “advance” applies BOTH weeks (no lost update).

Note: jsdom can’t catch *visual* issues (animation continuity, alignment, color, spacing,
mobile wrapping). Those need a real browser / human eyes — the founder reviews screenshots.

## House style (from the build so far)

- **Tagline / mission:** “**Raising builders, not consumers.**” This is the canonical line —
  it appears as the hero headline, in the footer, and in the SEO/JSON-LD. The full mission
  paragraph lives in the “More than money” section: *“Raising builders, not consumers. How
  money works — the thing that matters most in real life — isn’t on any test. We teach it by
  letting our kids live it, so in a world changing faster than any classroom can keep up,
  their future rests on what they can build, not just what they were credentialed to do.”*
  If you reword it, keep all instances in sync. Tone is confident and forward, never fearful;
  the AI/credential shift is implied, never stated outright.
- Tone is first-person from Sunil where the parent is deciding (”…taught by me”, “I’ll
  answer anything”). CTAs say “Talk to Sunil”, not “the founder”.
- Microsoft is framed as **ex-Microsoft** in short credential tags.
- Keep the design calm and credible (no gimmicky floating widgets). Centered section headers.
- **Typography:** display/headings/wordmark use **Space Grotesk** (`.disp` class); body uses
  **Inter** (`.flp`). Both load from Google Fonts — a `<link>` in `index.html` (and the
  standalone head) plus an `@import` at the top of the `FONTS` string; system-font fallbacks
  follow. Keep all three font sources in sync if you change the families.
- **Color accents (teen energy, used sparingly):** two gradient-text classes in `FONTS` —
  `.grad` (blue→teal→green, ties to the logo blocks) and `.grad-warm` (blue→purple→pink).
  Apply them to a SINGLE key word only (e.g. “Young” in the wordmark, “builders,” in the hero
  headline, “three acts” / “money” in section titles), never whole sentences — restraint is
  what keeps it credible rather than cheap. The SVG dashboard-mock wordmark uses an equivalent
  `<linearGradient id="bygrad">` fill. Gradient text keeps its real text content underneath
  (transparent fill only), so screen readers and axe are unaffected — preserve that.
- Always note money is **simulated** — no real funds. The site is **financial education,
  not licensed financial advice.**
- **Statistics integrity:** every stat in `WHY_STATS` (and any new claim) must link to its
  PRIMARY source, be dated, and be current. When editing: re-open each link, confirm the number
  and year, and check for a newer edition before shipping. Update the number AND its `url`
  together. Don’t reuse the undated “73% want to learn more” figure that floats around the web
  — it traces to a 2021 Greenlight survey; the dated JA/Citizens (2024) figures we use are
  fresher and primary-sourced. Survey numbers refresh annually, so re-verify before any raise.