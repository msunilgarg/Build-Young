# Build Young — SEO & discoverability checklist

A short, honest playbook for getting found in search. Updated **2026-06-11**.

> **The big lesson (2026-06-11):** the site wasn't ranking low — it was **invisible**. Vercel
> **Deployment Protection → "Require Log In"** was ON, so the production site returned **403 to
> everyone not logged into the Vercel team — including Googlebot**. `robots.txt` returned 403, so no
> crawler could read a single page. Symptom: `site:build-young.com` returned nothing.
> **Fix:** Vercel → Project → Settings → **Deployment Protection** → turn **Require Log In OFF** for
> production (or scope it to *Only Preview Deployments* so staging stays private). Verify by opening
> `https://www.build-young.com/robots.txt` in an **incognito** window — it must show text (HTTP 200).
> **Keep production public.** Secrets stay in env vars and the admin console is gated separately, so a
> public marketing site exposes nothing sensitive.

## One-time setup (Google Search Console)
1. **Property verified** for `build-young.com` (done).
2. **Confirm crawlable:** URL Inspection → `https://www.build-young.com/` → it should say *"URL is on
   Google / Page is indexed."* (Confirmed 2026-06-11.)
3. **Submit the sitemap:** Search Console → **Sitemaps** → enter `sitemap.xml` → Submit. Status should
   reach "Success" in a day or two.
4. **Request indexing for the key pages** (don't wait for Google to find them): URL Inspection →
   enter each → **Test Live URL** → **Request Indexing**:
   - `https://www.build-young.com/`
   - `https://www.build-young.com/enroll`
   - `https://www.build-young.com/book-call`
5. **Pick a primary host:** Vercel → Domains — make the apex `build-young.com` **301-redirect to
   `www.build-young.com`** (the canonical) so Google consolidates signals on one host.

## What's already wired in the code (don't undo)
- `public/robots.txt` allows all major search + AI crawlers; `index.html` has `index, follow`, a
  canonical to `www`, Open Graph/Twitter cards, and a `sitemap` link.
- Structured data (JSON-LD): `EducationalOrganization` + `Course` + `FAQPage` (FAQ is eligible for
  rich results — confirmed "1 valid item" in Search Console).
- Per-route `<title>`/description (App.jsx `ROUTES` registry) so each screen reads as its own page.
- `public/llms.txt` + a `<noscript>` block give non-JS crawlers/AI agents readable content.

## Target queries
- **Winnable now (brand + long-tail):** "Build Young", "Build Young high school", "hands-on AI for high
  schoolers", "AI program for high school students", "high schoolers build a product with AI",
  "teen build an app with AI course".
- **Long game (broad head terms):** "hands-on AI for students", "AI for students", "entrepreneurship
  for teens" — high competition; a new niche site won't rank page 1 here for months, if at all. Don't
  measure success by these.

## Levers that actually move ranking (months, not days)
- **Content** — a resources/blog targeting the long-tail queries above (one solid page per intent).
- **Backlinks** — the school flyer, local/edu directories, the founder's LinkedIn + any press, partner
  links. Authority is what lets a small site climb for competitive terms.
- **On-page** — keep titles/H1s aligned to the query intent; the visible hero stays the brand tagline
  ("Raising builders, not consumers") — SEO phrasing lives in `<title>`/meta, not the H1.

## Monitor weekly (Search Console)
- **Performance** report — which queries bring impressions, your **average position**, clicks. This is
  the real scoreboard (not a single manual search).
- **Pages** (Coverage) — pages moving into "Indexed"; investigate anything "Crawled — not indexed" or
  "Discovered — not indexed."
- After publishing new pages, **Request Indexing** to speed up pickup.

## Realistic timeline
Indexing: days → ~2-3 weeks. Brand/long-tail visibility: weeks. Competitive head terms: months of
content + links. Use the flyer/direct channels for enrollments while SEO compounds.
