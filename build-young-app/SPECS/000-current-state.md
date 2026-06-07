# Spec: Build Young — Current State (baseline)

> Reverse-engineered from the app as built. This is the **baseline**; future specs are deltas
> against it. Copy/claims are governed by `POSITIONING.md`; code conventions by `CLAUDE.md`.

**Status:** shipped
**Owner:** Sunil Garg
**Date:** 2026-06-07

## What it is
A single-page React app (Vite, deployed on Vercel) that is the entire Build Young business:
a marketing site + enrollment + a post-enrollment student dashboard + a founder console.
One combined high-school track ("Builders"), 12 weeks, live on Zoom.

## Users & roles
- **Prospective family** (parent + teen) — browses, books a call, enrolls, pays.
- **Enrolled student** — logs in, works through the 12-week dashboard, graduates with a certificate.
- **Founder / admin** — gated by email allowlist (`FOUNDER_EMAILS`); sees the console.

## Core flows
1. **Discover** → landing (hero, 3-act curriculum, "where the work happens," mission, founder note, batches/pricing, FAQ).
2. **Book a call** (optional) → free 15-min, via Calendly link or built-in slot picker.
3. **Enroll** → 3 steps: details + eligibility (parent confirms high-school) → payment → confirmation. Full cohort → capture interest for the next one. Wrong schedule/timezone → schedule-request modal.
4. **Pay** → Stripe Payment Link (shared link or per-cohort); returns via `?enrolled=<batchId>`.
5. **Account** (if `authEnabled`) → Stripe webhook provisions the user + emails a set-password link → student sets password → dashboard. Returning students log in.
6. **Dashboard** → Overview / Course progress / Dashboard tabs; 12-week stepper; per-week activities; advance week by week.
7. **Capstone (Wk 12)** → graduate → certificate (downloadable, LinkedIn) → optional showcase submission.
8. **Withdraw/refund** → self-serve within the window (full before start; prorated through week 1; none after).

## Feature inventory
- **Marketing landing** — testimonials (founder-gated), 3-act curriculum with expandable weeks, dashboard-exercise cards, founder bio, batches with season selector, FAQ (visible + schema), legal modal.
- **Enrollment** — eligibility gate, cohort dropdown grouped by season, demo checkout or Stripe link, interest capture, schedule requests, cost note (Claude Pro etc.).
- **Student dashboard** — week stepper; activities: `BuildLayer` (spec field + copy-to-AI prompt), `GoLiveChecklist`, `FunnelStages`, `FunnelScenarios` (incl. AI agent), `ReflectionPanel`; build plan; per-week homework/prep; certificate; withdrawal.
- **Founder console** (`?founder` / `/admin`) — funnel analytics + conversions + segments + revenue; traffic/engagement (sources, countries, screens, exits, hesitations); cohort editor; site-settings editor; admin allowlist; account reset; certificates; build plans; interest / tutor / schedule lists; showcase; homework editor; scenario-agent config; system status; CSV/JSON exports.
- **Auth** — scrypt hashing, stateless HMAC cookie, set-password tokens, rate-limited login/reset (off by default via `authEnabled`).
- **Email** (Resend, off by default) — welcome, set-password, class reminders, withdrawal confirmation; per-cohort Resend audience (add on enroll, remove on refund).
- **Cron** — daily; sends "prepare for next week" reminders 2 days before each weekly class.

## Curriculum (12 weeks, 3 acts)
- **Act 1 · 0 → 1 · Build & launch (Wk 1–7)** — find a problem → spec → build in layers (core / accounts / payments / production) → Go Live. **Achieved.**
- **Act 2 · Learn how to grow it (Wk 8–10)** — funnel → metrics & scaling → product-led growth. **Skill, not a scale promise.**
- **Act 3 · Capstone (Wk 11–12)** — prepare, then present what they built; parents welcome.

## Pricing & refunds
- **$999** tuition. Full refund before the cohort starts; prorated through the first week; non-refundable after.
- **Builder prize:** first student per cohort to land a real paying customer **within a year** → tuition back (payment proof + parent-approved video).
- **Extra costs:** Claude Pro (~$20/mo) for the build weeks; domain optional (~$10–20/yr); everything else free.

## Integrations & infra
Vercel (host + cron + analytics) · Stripe Payment Links + webhook (no Stripe API key) · Resend (email + audiences) · Upstash/Vercel KV (users, state, cohorts, funnel, interest) · Claude API (Week-9 scenario agent) · Vercel Web Analytics.

## Config flags (go-live toggles, in `CONFIG` / env)
`emailEnabled`, `authEnabled`, `brandDomain`, `contactEmail`, booking link, Stripe link(s); env: `RESEND_API_KEY`, `AUTH_SECRET`, KV vars, `FOUNDER_EMAILS`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `ANTHROPIC_API_KEY`, `PUBLIC_BASE_URL`.

## Data stored (serves minors — keep minimal)
Enrolling adult email, student first name/display name, selected cohort, payment confirmation, password hash, sim/course state, aggregate funnel events (NO PII). No full card numbers (Stripe-handled).

## Analytics events (aggregate, no PII)
`visited`, `enroll_started`, `call_booked`, `enrolled`, `class_started`, `week_advanced`, `graduated`, `withdrawn`, `screen_view`, `exit`, `schedule_requested`, `hesitation`. (`checkin_completed` dormant.)

## Non-goals / explicitly removed
- **No money/markets/net-worth simulation** (the old finance engine was fully removed — don't reintroduce).
- **No separate post-course check-in** (program is 12 weeks flat).
- **Not** financial/investment advice; **not** a coding class (build with AI).

## Known go-live / open items
Business/legal (LLC, insurance, minors consent, refund + contest review) · verify domain in Resend + flip email on · wire real Stripe links + webhook · real Zoom links + cohort dates · attorney review of Terms/Privacy · submit to Search Console + Bing.
