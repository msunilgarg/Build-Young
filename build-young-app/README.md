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

Everything below is what *only you* can set up. Each item maps to a value in `src/App.jsx` → `CONFIG` (near the top).

### 1. Payments — Stripe (no backend required)
1. Create a Stripe account and finish business verification.
2. Create one **Payment Link** per cohort (Products → Payment Links) at the right price ($599 MS / $799 HS).
3. For each link, set the **success URL** to: `https://YOURDOMAIN/?enrolled=BATCHID`
   where `BATCHID` is one of `ms-mon`, `ms-tue`, `hs-wed`, `hs-thu`.
   (On return, the app reads the name/email captured before checkout and opens the dashboard.)
4. Paste each link into `CONFIG.stripeLinks`. Empty = demo checkout stays on.

### 2. The founder call — Calendly (or Cal.com)
1. Create a free 15-minute event (consistent 5:00 PM PT slots, your available days).
2. Paste the event URL into `CONFIG.calendlyUrl`. Empty = the demo slot picker stays on.

### 3. Email — Resend (function included)
A serverless function is already included at `api/send-email.js` (Vercel-style). To turn on real delivery:
1. Create a **Resend** account (resend.com) and verify your domain `build-young.com` (add the SPF/DKIM records they give you).
2. In your host's settings, add an environment variable: `RESEND_API_KEY = re_xxxxxxxx`.
3. In `src/App.jsx` → `CONFIG`, set `emailEnabled: true`.

That's it — the welcome email fires on enrollment and a recap email fires each time a student advances a week/check-in. Until you enable it, the app shows the "email sent" confirmation but doesn't deliver (and Stripe's own receipt still covers payment confirmation).
*On Netlify instead of Vercel:* move `api/send-email.js` to `netlify/functions/send-email.js`, adjust the handler signature to Netlify's format, and set `CONFIG.emailEndpoint` to `/.netlify/functions/send-email`.

### 3b. Daily market-news scheduler (server-side cron)
Before each weekly class with a live market event (Weeks 3–12), a 3-email drip goes out on the **real calendar days** −3 / −2 / −1 (breaking news → analysis → research challenge). This is driven by a daily Vercel Cron, not by the in-app click.

- **Endpoint:** `api/cron/market-news.js`. **Schedule:** `vercel.json` runs it daily at `0 16 * * *` (16:00 UTC ≈ morning PT).
- **What it does:** computes which cohorts have a class 3/2/1 days out today (`api/_lib/schedule.js`), then sends the matching media email to every enrolled student of those cohorts. Content is single-sourced from `src/marketMedia.js` (same source the app uses).
- **Required env vars:**
  - `RESEND_API_KEY` — same key as the email function. Missing ⇒ the cron is a graceful no-op (sends nothing).
  - `CRON_SECRET` — a random secret. Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`; the endpoint 401s on any other/missing value. **Set this before deploying** or the cron stays locked (401).
  - `ROSTER_JSON` — the enrollment roster (see next bullet).
- **Roster gap (important):** the app has **no server-side enrollment store** yet — enrollment round-trips through Stripe + the browser. `api/_lib/roster.js` defines the `getRoster(batchId)` interface the scheduler depends on, with a placeholder that reads `ROSTER_JSON` (a JSON array like `[{"email":"a@x.com","name":"Avery Lee","batchId":"fall-hs-wed"}]`). **For real cohorts, wire `getRoster()` to a durable store** — recommended: a Stripe `checkout.session.completed` webhook that persists `{email, name, batchId}` to a database (serverless memory won't survive). Until then the scheduler runs end-to-end but only emails whoever is in `ROSTER_JSON`.

### 4. Video — Zoom
Replace the placeholder Zoom links in the `BATCHES` array (`src/App.jsx`) with your real recurring meeting links.

### 5. Cohort details
In `BATCHES`, set real start dates, days/times, prices, and seat counts.

### 6. Legal (do not skip — this serves teens)
- `public/privacy.html` and `public/terms.html` are **drafts**. Have a privacy attorney review and finalize them, then set the `[DATE]` placeholders.
- The program serves **high schoolers** (all 13+), which keeps you outside COPPA (the US under-13 rule). Keep enrollment adult-completed and don't collect data from under-13s.
- Don't sell/share student data and don't use it to train AI (both are stated in the policy).

### 7. Domain & brand
Set `CONFIG.brandDomain` and `CONFIG.contactEmail`. Add a real `og-image.png` (1200×630) to `public/` for nice link previews (referenced in `index.html`).

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
Student progress is saved in the browser via `localStorage` (see the shim in `index.html`). It's per-device and great for a prototype/first cohort. If you later want students' progress to follow them across devices, that's the "Tier 2" step: real accounts + a database.

## Project layout
```
index.html          meta, favicon, localStorage storage shim
src/main.jsx        mounts the app
src/App.jsx         the entire site + simulation (CONFIG block near the top)
src/marketMedia.js  dependency-free market-event schedule + media content (shared w/ cron)
src/cohorts.js      dependency-free cohort catalog (SEASONS + BATCHES), shared w/ cron
api/send-email.js   serverless email sender (Resend)
api/cron/market-news.js   daily cron: sends the pre-class media drip on real dates
api/_lib/           shared server helpers: sendEmail (Resend), schedule (date math), roster
vercel.json         Vercel Cron schedule for the market-news scheduler
public/favicon.svg  the Build Young mark
public/og-image.png social/link-preview image
public/robots.txt   crawler permissions (search + AI bots)
public/sitemap.xml  page list for search engines
public/llms.txt     curated summary for AI agents
public/privacy.html, terms.html   legal drafts
```
