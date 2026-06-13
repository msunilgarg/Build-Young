# Build Young — website

A live, hands-on entrepreneurship program for high schoolers — over 12 weeks they build a real product with AI, take it live, and learn to grow it. This repo is the marketing site, enrollment flow, founder-call booking, and the post-enrollment course dashboard, in one React app.

> **Status:** This runs end-to-end in "demo mode" out of the box (no real money, bookings, or emails). Flip on the real services below to go live. Nothing here charges a card or sends email until you connect your own accounts.

---

## Run it locally

```bash
npm install
npm run dev      # local dev server, hot reload
npm run build    # production build → ./dist
npm run preview  # preview the production build
```

Requires Node 18+.

## Deploy (no backend needed)

The build output (`./dist`) is a static site. Easiest paths:

- **Vercel** — `npm i -g vercel && vercel` (or connect the Git repo in the dashboard). Framework preset: **Vite**.
- **Netlify** — drag the `dist` folder to <https://app.netlify.com/drop>, or connect the repo (build command `npm run build`, publish dir `dist`).
- **Cloudflare Pages / GitHub Pages / S3** — serve the contents of `dist`.

Point your domain (e.g. `build-young.com`) at the host per its DNS instructions.

---

## Go-live checklist

Everything below is what *only you* can set up. Code defaults live in `src/lib.js` → `CONFIG`; the
runtime, non-secret values (booking link, contact email, and the cohorts/Stripe links) are
**live-editable in the hidden founder console** without a redeploy.

### 1. Payments — Stripe (hosted Payment Links)
1. Create a Stripe account and finish business verification.
2. Create one **Payment Link** per cohort (Products → Payment Links) at the cohort price (currently **$999** per seat). There's **one combined high-school track ("Builders")** — no separate middle-school tier.
3. For each link, set the **success URL** to: `https://YOURDOMAIN/?enrolled=BATCHID`
   where `BATCHID` is a cohort id from `src/cohorts.js` — e.g. `fall-mw` (Mon & Wed) or `fall-tt` (Tue & Thu); ids follow `<season>-<daypair>`.
   (On return, the app reads the name/email captured before checkout and opens the dashboard.)
4. Paste each link into its cohort's `stripeLink` — **live-editable in the founder console** (Cohort editor), or as the code default in `src/cohorts.js`. Empty = demo checkout stays on.

### 2. The founder call — Calendly (or Cal.com)
1. Create a free 15-minute event (consistent 5:00 PM PT slots, your available days).
2. Paste the event URL into `CONFIG.calendlyUrl`. Empty = the demo slot picker stays on.

### 3. Email — Resend (function included)
A serverless function is already included at `api/send-email.js` (Vercel-style). To turn on real delivery:
1. Create a **Resend** account (resend.com) and verify your domain `build-young.com` (add the SPF/DKIM records they give you).
2. In your host's settings, add an environment variable: `RESEND_API_KEY = re_xxxxxxxx`.
3. In `src/lib.js` → `CONFIG`, set `emailEnabled: true`.

That's it — the welcome email fires on enrollment and a recap email fires each time a student advances a week. Until you enable it, the app shows the "email sent" confirmation but doesn't deliver (and Stripe's own receipt still covers payment confirmation).
*On Netlify instead of Vercel:* move `api/send-email.js` to `netlify/functions/send-email.js`, adjust the handler signature to Netlify's format, and set `CONFIG.emailEndpoint` to `/.netlify/functions/send-email`.

### 3b. Daily class-reminder cron (server-side)
Two days before each weekly class (Weeks 1–12), every enrolled student gets a "prepare for next week" heads-up. This is driven by a daily Vercel Cron, not by an in-app click. (The old market-news drip and its simulated market events were removed — the program is pure entrepreneurship now.)

- **Endpoint:** `api/cron/market-news.js`. **Schedule:** `vercel.json` runs it daily at `0 16 * * *` (16:00 UTC ≈ morning PT).
- **What it does:** `dueReminders(today)` (`api/_lib/schedule.js`) computes which cohorts have a class in `REMINDER_OFFSET` (= 2) days, then emails each enrolled student of those cohorts. What to prepare comes from the founder-editable homework (`api/_lib/homeworkStore.js`, defaulting to `WEEK_PREP` in `src/marketMedia.js`); week titles come from `WEEK_TITLES`.
- **Required env vars:**
  - `RESEND_API_KEY` — same key as the email function. Missing ⇒ the cron is a graceful no-op (sends nothing).
  - `CRON_SECRET` — a random secret. Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`; the endpoint 401s on any other/missing value. **Set this before deploying** or the cron stays locked (401).
  - `ROSTER_JSON` — optional pilot/testing fallback roster (see next bullet).
- **Roster:** `api/_lib/roster.js` resolves `getRoster(batchId)` from the **durable enrollment store** (`api/_lib/store.js`), which the **Stripe webhook** (`api/stripe-webhook.js`) writes on `checkout.session.completed` (and clears on `charge.refunded`). If the store is empty it falls back to the `ROSTER_JSON` env var — a JSON array like `[{"email":"a@x.com","name":"Avery Lee","batchId":"fall-mw"}]` — handy for a pilot cohort before real checkouts. Returns `[]` (never throws) when neither has data, so a missing roster is a graceful no-op.

### 4. Video — Zoom
Replace the placeholder Zoom links in the `BATCHES` array (`src/cohorts.js`) with your real recurring meeting links (or edit them live in the founder console's Cohort editor).

### 5. Cohort details
In `BATCHES` (`src/cohorts.js`), set real start dates, days/times, prices, and seat counts — or edit them live in the founder console. `SEASONS` groups cohorts into seasonal intakes (Fall/Winter/Spring).

### 6. Legal (do not skip — this serves teens)
- `public/privacy.html` and `public/terms.html` are **drafts**. Have a privacy attorney review and finalize them, then set the `[DATE]` placeholders.
- The program serves **high schoolers** (all 13+), which keeps you outside COPPA (the US under-13 rule). Keep enrollment adult-completed and don't collect data from under-13s.
- Don't sell/share student data and don't use it to train AI (both are stated in the policy).

### 7. Domain & brand
Set `CONFIG.brandDomain` and `CONFIG.contactEmail`. The `og-image.png` (1200×630) social/link-preview card in `public/` (referenced by `index.html`'s OG/Twitter meta) is **generated** from `scripts/og-image.html` — edit that and run `bash scripts/render-og-image.sh` to regenerate it. Keep its copy consistent with the OG meta + `POSITIONING.md`.

### 8. Search engines & AI agents (discoverability)
This is wired up:
- `index.html` has full SEO meta (title, description, robots, canonical), Open Graph + Twitter cards, and **JSON-LD structured data** (`EducationalOrganization` + `Course`) so search engines and AI assistants can read structured facts about the program.
- `public/robots.txt` explicitly **allows** all major search and AI crawlers (Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot, Applebot, etc.) and points to the sitemap.
- `public/sitemap.xml` lists the pages.
- `public/llms.txt` gives AI agents a clean, curated summary of Build Young.
- A `<noscript>` block in `index.html` exposes the core pitch, pricing, and contact as plain HTML.

**Important caveat — this is a JavaScript app.** Modern Googlebot renders JavaScript, so it will index the full site. But some crawlers and AI agents don't run JS well; they rely on the static `<noscript>`, meta, JSON-LD, and `llms.txt` (all of which are now present). For the *strongest* coverage, pre-render the pages to static HTML so the full content is visible without JS:
- Easiest: add a prerender step (e.g. `vite-plugin-prerender` or `npx react-snap` after build), or
- Host on a platform with prerendering/SSR.
This is optional polish — out of the box the site is already discoverable and AI-readable via the static metadata above.

**After you deploy:** submit your domain to **Google Search Console** and **Bing Webmaster Tools**, and submit `https://build-young.com/sitemap.xml` in each. Update every `build-young.com` URL in `index.html`, `robots.txt`, `sitemap.xml`, and `llms.txt` if your final domain differs.

---

## How persistence works
Once accounts + KV are enabled, student progress is **server-authoritative**: each student's course
state lives in Vercel KV keyed by their signed-in email (`api/state.js`), so progress follows them
across devices. Without a backend, the app still runs in demo mode with browser-local state. The live
cohort catalog + founder-editable site settings are also KV-backed (`api/cohorts.js`).

## Project layout
The app was split so each feature lives in its own file; `App.jsx` is now the router only. See
[`build-young-app/CLAUDE.md`](./CLAUDE.md) for the full module map and
[`../BUILD-YOUNG-ARCHITECTURE.md`](../BUILD-YOUNG-ARCHITECTURE.md) for diagrams.
```
index.html            meta, favicon, SEO/JSON-LD, storage shim
src/main.jsx          mounts <App/>
src/App.jsx           ROUTER ONLY — route/history/scroll, persistence, modal state
src/  (screens)       Landing · Enroll · BookCall · Platform · FounderDashboard ·
                      auth · Certificate · WhyStrip · Legal · Charts (lazy recharts)
src/  (foundation)    theme · ui · lib (CONFIG) · course/courseDates/courseState/engine ·
                      funnel · cohorts · cert · scenarios · site · marketMedia
api/funnel.js         method-routed: POST event ingest · GET founder read · PUT save · DELETE reset
api/cohorts.js        public catalog + site settings (KV-backed)
api/state.js          per-student course state (KV, account-gated)
api/auth/*            login · logout · me · request-reset · set-password
api/send-email.js     serverless email sender (Resend)
api/stripe-webhook.js enrollment lifecycle (checkout.session.completed / charge.refunded)
api/cron/market-news.js  daily cron: class reminders 2 days before each weekly class
api/_lib/             shared server helpers: kv · auth · stores · schedule · resendAudience · scenarioAgent
vercel.json           Vercel Cron schedule + SPA rewrites
public/               favicon.svg · og-image.png · robots.txt · sitemap.xml · llms.txt · privacy.html · terms.html
```
