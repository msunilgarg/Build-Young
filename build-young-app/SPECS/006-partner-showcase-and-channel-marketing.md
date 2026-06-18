# Spec: 006 — Partner showcase + channel marketing

> One feature = one short spec. Decisions go here; PRs implement them.
> **Depends on** `005-third-party-enrollment.md` (the partners registry). This is the **public**
> marketing layer for that channel; 005 is the back-office mechanics.

**Status:** approved — scope locked (2026-06-18): **both** surfaces, **family-first** sequence
**Owner:** Sunil Garg
**Date:** 2026-06-18

## What
Two **public** marketing surfaces for the partner channel, both founder-editable and driven by the
005 partners registry:
- **(A) Family-facing "Where to find us" strip** *(ship first)* — a compact logos/links section that
  shows the marketplaces/partners where families can find + enroll in Build Young (e.g. "Also on
  Outschool"), each linking to **our listing** on that platform.
- **(B) "Partner with us" interest capture** *(next increment)* — a simple **modal** (mirroring the
  existing **Careers / "Teach with us"** modal), opened from a nav + footer link, that captures a
  prospective partner's **org/name + email** (+ optional note) and emails it to the founder. The short
  pitch lives in the modal; **no dedicated marketing sub-page** — keep it lightweight like Careers.

## Why
Two distinct funnels. **Families** already trust a marketplace's reviews + payment rails, so showing
"you can also find us on X" lowers friction and lends **borrowed trust** — cheap social proof at the
decision point. **Partners** are how the channel *scales* — a repeatable "carry us" ask turns one-off
deals (005) into a growth lever. Family-first because it monetizes the partners you're **already**
onboarding; recruitment follows once the model is proven.

## Users & trigger
- **Prospective family** — browsing the site; sees the "where to find us" strip and can choose to
  enroll via a partner they already use/trust.
- **Prospective partner** (marketplace / school / org) — opens the **"Partner with us"** modal,
  reads the short pitch, and leaves their org + email so we can reach out.
- **Founder / admin** — toggles which partners are **featured** publicly + edits their display
  fields + the recruitment copy (console, `FOUNDER_EMAILS`-gated).

## Behavior
### (A) Family "Where to find us" strip — ship first
1. The 005 partner record gains **public display fields**: `displayName`, `logo` (image),
   `publicUrl` (our listing on that platform), short `blurb`, and a **`featureOnSite`** toggle.
2. The public site renders a **compact** "Where to find us" / "Our partners" strip — logos for
   **only** `featureOnSite` partners, each linking to its `publicUrl` (`target="_blank"
   rel="noopener noreferrer"`). A broken/missing logo falls back to the partner name (text). If **no**
   partners are featured, the whole section is **hidden** (no empty shell).
3. Placement is compact (a small strip near the batches section or the footer) — it must **not**
   inflate the lean landing (the `landing-lean` guard still passes) or upstage our own enroll path.
4. The featured-partner **display fields are read publicly** (folded into `GET /api/cohorts` like site
   settings). **Only** display fields go public — `cut %` / settlement / `externalRef` **never** leave
   the founder-gated surface.

### (B) "Partner with us" interest modal — next increment
5. A **"Partner with us" modal** — a direct mirror of `CareersModal` (the "Teach with us" modal):
   a **nav + footer link** opens it; inside is a short pitch (bring us your students, we run the live
   12-lesson cohort; simple rev-share) + a small form — **org/name + email (required)** + an optional
   note. Submitting POSTs to **`/api/funnel?resource=partner-lead`** → `addPartnerLead` (an interestStore
   mirror of `addTutorInterest`): stores it in KV + **emails the founder** (best-effort, key-gated). The
   founder reads inquiries in the console as a **"Partner inquiries"** list (mirror of Tutor applications,
   `GET ?resource=partner-lead`). **No new route / sub-page** — keep it as light as Careers.

**Edge cases:** a partner with `featureOnSite` off → in 005 back-office but not shown publicly; a
marketplace whose ToS forbids off-platform linking → leave it un-featured (founder vets each); no
featured partners → section/strip hidden; logo fails to load → text-name fallback.

## Done when (acceptance)
- [ ] The 005 partner record gains public display fields (`displayName`, `logo`, `publicUrl`, `blurb`,
      `featureOnSite`); the founder edits + toggles them in the console.
- [ ] A public **"Where to find us"** partner strip renders **only** featured partners (logos link out,
      `rel="noopener noreferrer"`, new tab), is **compact**, and is **hidden when none** are featured;
      the `landing-lean` guard still passes.
- [ ] **Only display fields are public** — `cut %` / settlement / `externalRef` are never in the public
      `GET /api/cohorts` payload (a test asserts the public payload omits them).
- [ ] **(Increment B)** a **"Partner with us" modal** (mirror of `CareersModal`) opens from a nav +
      footer link, captures org/name + email (+ optional note) → `POST /api/funnel?resource=partner-lead`
      (stored in KV + founder emailed, key-gated); the founder sees inquiries in the console
      (`GET ?resource=partner-lead`). **No new route.**
- [ ] Copy follows **POSITIONING.md** (us/we voice, honest, no overclaiming); **no** flag/emoji glyphs
      for content; links are labeled + AA-contrast; a render test pins the visible strings (and that the
      strip is absent when no partners are featured).
- [ ] Build + tests stay green.

## Out of scope (this increment)
- **Automated marketplace listing / review sync or import** — display fields are founder-entered.
- A **paid partner directory**, partner logins, or partner-facing dashboards.
- Any change to **005's** enrollment / settlement mechanics, or to the student dashboard.

## Surfaces & sources of truth
- **Copy** (strip heading, recruitment-page pitch, CTAs) → **POSITIONING.md** (us/we; no overclaiming;
  honest framing of what a partner gets).
- **Code conventions/gotchas** → **CLAUDE.md** — keep the landing **lean** (compact strip / sub-page,
  not new hero bulk; the `landing-lean` guard enforces), **no emoji-for-content**, add a screen as one
  appended entry in the **`ROUTES`** registry, `target="_blank"` carries `rel="noopener noreferrer"`.
- **Touches:** the **partners registry** (005) + public display fields + `featureOnSite`; `GET
  /api/cohorts` (fold **featured-partner display fields** into the public payload, like settings — and
  **only** those fields); a compact **partner strip** section/component on the public site; a **"Partner
  with us" modal** (mirror of `CareersModal`) + a nav/footer link + `addPartnerLead`/`listPartnerLeads`
  in `interestStore.js` + `GET`/`POST /api/funnel?resource=partner-lead` + a "Partner inquiries" console
  list; the founder console partners editor (display fields + toggle). **NOT** the student dashboard;
  **NOT** any settlement/cut data on a public surface; **NOT** a new route/sub-page.

## Risks / open questions
- **Marketplace ToS.** Some platforms restrict off-platform linking or how you represent the listing —
  the `featureOnSite` toggle is per-partner and the founder **vets each** before turning it on.
- **Public-data hygiene (important).** The partners store holds **money** data (cut %, settlement). The
  public read must expose **only** display fields — enforce with a server allowlist + a test, the same
  way funnel ingest is allowlisted. A leak here is a real problem.
- **Don't dilute the funnel entry.** Keep the family strip compact and subordinate to our own enroll
  CTA; put the recruitment pitch on **/partners**, not the landing (lean-landing guard).
- **Placement (open).** Family strip near the **batches** section vs. the **footer** — recommend a slim
  strip just below batches (high-intent context) or in the footer; confirm on first render.
- **Honesty.** Only feature partners that genuinely carry us; "where to find us" must be true and current.
