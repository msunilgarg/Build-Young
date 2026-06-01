# Deploying Built Young

The app is a Vite single-page app **plus** serverless functions (`api/`) and a daily cron.
The whole thing runs on **Vercel**. Below is the order to bring it up — you can stop after
Step 1 to test the front end, and wire the backend (email, payments, the news drip) when ready.

> Money in the dashboard is **simulated**. Real money only enters via Stripe at enrollment.

---

## Step 1 — Deploy the app (free, ~2 min)

1. Go to **vercel.com** → sign in with GitHub → **Add New → Project** → import **`msunilgarg/BuiltYoung`**.
2. **Root Directory: `build-young-app`** ← important (the app is nested in the repo).
3. Framework auto-detects as **Vite** (Build `npm run build`, Output `dist`). Leave as-is.
4. **Deploy.** You get a public URL.

What works immediately, with no further config:
- The marketing site, the **enroll demo flow** (no card charged), and the full **money
  simulation** (paycheck → invest → markets → home/car → net worth), plus the **Course hub**.
- Email is **off** by default, so nothing tries to send.

> **Hobby tier** is free and fine for testing. Built Young takes payments, so move to **Vercel
> Pro ($20/mo)** before real, commercial use.

---

## Step 2 — Turn on email (welcome + pre-class market-news drip)

1. Create a **Resend** account, **verify the `builtyoung.com` domain**.
2. Add a Vercel env var: **`RESEND_API_KEY`** = `re_…`.
3. In `src/App.jsx` → `CONFIG`, set **`emailEnabled: true`** (and confirm `contactEmail` /
   `brandDomain`). Commit + redeploy.

Now welcome emails and the weekly drip send for real.

---

## Step 3 — Take real payments (Stripe)

1. Create a **Stripe Payment Link per cohort**. On each link set:
   - **Success URL:** `https://YOURDOMAIN/?enrolled={batchId}`
   - **Metadata:** `batchId = <the batch id>` (e.g. `fall-hs-wed`) ← the webhook reads this.
2. Paste each link into `CONFIG.stripeLinks` (keyed by batch id) in `src/App.jsx`.
3. The enroll flow then sends families to Stripe and returns them via `?enrolled=`.

---

## Step 4 — Persist enrollments (so the drip can email real students)

1. In Vercel → **Storage**, create a **KV** database (Upstash). It auto-adds
   `KV_REST_API_URL` + `KV_REST_API_TOKEN` env vars.
2. In **Stripe → Developers → Webhooks**, add an endpoint:
   - URL: `https://YOURDOMAIN/api/stripe-webhook`
   - Event: **`checkout.session.completed`**
   - Copy the signing secret into the Vercel env var **`STRIPE_WEBHOOK_SECRET`** (`whsec_…`).

> After deploy, send a Stripe **test** webhook and confirm `/api/stripe-webhook` returns 200
> and the enrollment lands in KV. (Vercel's plain Node functions handle the raw request body
> slightly differently than Next.js — verify the signature path once and adjust the raw-body
> read if needed.)

---

## Step 5 — The daily news cron

- `vercel.json` already schedules `/api/cron/market-news` daily (`0 16 * * *`, ~morning PT).
- Set the env var **`CRON_SECRET`** to any random string; the endpoint rejects calls without
  `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends it automatically).
- With Steps 2–4 done, each day it emails the −3 / −2 / −1 pre-class market-news drip to the
  students enrolled for the cohorts whose class is coming up.
- **Pilot shortcut:** before Stripe/KV are live, set `ROSTER_JSON` to a small JSON array of
  `{email,name,batchId}` to test the drip end-to-end.

---

## Step 6 — Activate the weekly content agent

1. Add an **`ANTHROPIC_API_KEY`** repo secret (GitHub → Settings → Secrets and variables → Actions).
2. The workflow is already on `main`. Trigger a test run: **Actions → "Weekly content & link
   integrity" → Run workflow**.
3. It opens a PR each week with link/stat fixes + drafted weekly materials for you to review.
   It never sends anything or merges itself.

---

## Environment variables (summary)

| Var | Where | Needed for |
|-----|-------|-----------|
| `RESEND_API_KEY` | Vercel | Sending email |
| `CRON_SECRET` | Vercel | Securing the daily cron |
| `STRIPE_WEBHOOK_SECRET` | Vercel | Verifying Stripe webhooks |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel (auto from KV) | Enrollment store |
| `ROSTER_JSON` | Vercel (optional) | Pilot roster before Stripe/KV |
| `ANTHROPIC_API_KEY` | GitHub Actions secret | The weekly content agent |

## Editable content (no deploy infra needed)
- **Cohorts / prices / dates / Zoom links:** `BATCHES` in `src/App.jsx`.
- **Weekly class materials:** `materials: []` on each `WEEKS` entry (shown in the Course hub).
- **Market-news content + links:** `MEDIA` in `src/marketMedia.js`.
- **"Why this matters" stats:** `WHY_STATS` in `src/App.jsx` — primary-sourced + dated only.

> Legal: have an attorney review `public/privacy.html`, `public/terms.html`, and the in-app
> `LEGAL` copy before launch. This is financial **education**, not licensed advice.
