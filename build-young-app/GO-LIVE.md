# Build Young — Go-Live Checklist

Legend: `[x]` done · `[ ]` pending. Everything outside §0 is account/config/legal —
done in Vercel / Stripe / Resend / the founder console, not in code.

## 0. Code — DONE ✅
All features merged to `main`; no code work pending. (Entrepreneurship reposition,
capstone Act 3 "Make your parents proud", "high school" copy, per-cohort + shared
Stripe Payment Link, Resend per-cohort group audiences, funnel geography, refund →
auto-remove from cohort group.) Flags: `emailEnabled`/`authEnabled` on, `brandDomain`
set, `previewAllWeeks` is founder-only (students always lock by progress).

## 1. Deploy
- [ ] Deploy `main` to Production on Vercel (the live site must serve the latest build).
- [ ] Settings → Build & Deployment → **Ignored Build Step = "Only build production"**
      (so only `main` deploys; saves the 100/day deploy budget).

## 2. Vercel environment variables  (Settings → Environment Variables → Production)
You generate (any long random string):
- [ ] `AUTH_SECRET` — `openssl rand -hex 32`
- [ ] `CRON_SECRET` — `openssl rand -hex 32`
Simple values:
- [ ] `PUBLIC_BASE_URL` = `https://build-young.com`
- [ ] `FOUNDER_EMAILS` = your founder email(s), comma-separated
From a service:
- [ ] `RESEND_API_KEY` — resend.com (and **verify the build-young.com domain** in Resend)
- [ ] `KV_REST_API_URL` + `KV_REST_API_TOKEN` — Vercel KV / Upstash (the store)
- [ ] `STRIPE_WEBHOOK_SECRET` — the **Live** webhook endpoint's signing secret (`whsec_…`)
- [ ] *(optional)* `ANTHROPIC_API_KEY` — console.anthropic.com (Week-9 funnel agent)

## 3. Stripe  (Live mode)
- [ ] One **$999 Payment Link (Live)** → founder console → Site settings →
      **"Shared Stripe Payment Link."** (Differently-priced cohorts get their own link in
      the cohort editor, which overrides the shared one.)
- [ ] **Webhook** `https://build-young.com/api/stripe-webhook`, scope "Your account",
      events **`checkout.session.completed`** + **`charge.refunded`**.
- [ ] Put that endpoint's Live `whsec_…` into `STRIPE_WEBHOOK_SECRET` (§2).
- [ ] On a SHARED link, do **NOT** set metadata `batchId` (it would misfile every payment
      into one cohort). The app passes the cohort via `client_reference_id` automatically.

## 4. Founder console  (after deploy; log in with a `FOUNDER_EMAILS` account)
- [ ] Cohorts: real **dates, Zoom links, seats, prices**.
- [ ] Site settings: shared Stripe link (§3) + **Calendly** booking link (blank = demo scheduler).

## 5. Verify it actually works (~2 min)
- [ ] **Incognito** browser → build-young.com loads the marketing page (NOT a Vercel login
      wall — if it is, disable **Deployment Protection**).
- [ ] Founder console → **System status**: Email / Accounts / KV all **live (green)**.
- [ ] **One test enrollment** end-to-end: enroll → Stripe → return → set-password email →
      log in → dashboard → shows in the founder console under the **correct cohort**.
- [ ] *(optional)* Refund that test payment → student drops from the cohort group.

## 6. Business / legal — the real gate before taking money  (consult professionals)
- [ ] **LLC** formed (WA).
- [ ] **Insurance** (general liability + professional/E&O).
- [ ] **Minors**: parental-consent / liability-waiver language reviewed by counsel.
- [ ] **Attorney review** of `public/privacy.html`, `public/terms.html`, and the in-app
      `LEGAL` copy (incl. the builder-prize/minors clauses + the earnings language).
- [ ] **CPA**: tuition is taxable; WA B&O / sales-tax check; business bank account + bookkeeping.

## 7. Search / SEO  (post-launch)
In code already: `sitemap.xml`, `robots.txt`, `llms.txt`, JSON-LD (Organization + Course + FAQ),
canonical (www), per-route `<title>`/description, and a prerender step (`postbuild` → `scripts/prerender.mjs`).
- [x] **Verify the domain in Google Search Console.** Add a **Domain** property for `build-young.com`,
      then put the `google-site-verification=…` value as a **TXT** record on the root in
      Vercel → Domains → DNS (Name blank, Type TXT). *(Or a **URL-prefix** property for
      `https://www.build-young.com`, verified by dropping Google's HTML file into `public/`.)*
- [x] **Submit the sitemap**: Search Console → Sitemaps → `https://www.build-young.com/sitemap.xml`
      (expect Status **Success**, 3 pages).
- [ ] *(optional)* **Bing**: Webmaster Tools → **Import from Google Search Console** (mirrors verify + sitemap).
- [ ] After a few days, check **Indexing → Pages** for the homepage; URL-inspect → **Request indexing** to nudge it.

---
*Launch aid, not legal advice. Architecture/notes live in `CLAUDE.md`.*
