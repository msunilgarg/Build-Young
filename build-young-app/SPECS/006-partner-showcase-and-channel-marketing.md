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
- **(B) "Partner with us" recruitment page** *(next increment)* — a B2B page pitching marketplaces,
  schools, and youth orgs to **carry** Build Young (you bring students, we run the live cohort; simple
  rev-share), with a contact CTA.

## Why
Two distinct funnels. **Families** already trust a marketplace's reviews + payment rails, so showing
"you can also find us on X" lowers friction and lends **borrowed trust** — cheap social proof at the
decision point. **Partners** are how the channel *scales* — a repeatable "carry us" ask turns one-off
deals (005) into a growth lever. Family-first because it monetizes the partners you're **already**
onboarding; recruitment follows once the model is proven.

## Users & trigger
- **Prospective family** — browsing the site; sees the "where to find us" strip and can choose to
  enroll via a partner they already use/trust.
- **Prospective partner** (marketplace / school / org) — lands on **/partners**, evaluates carrying
  Build Young, and contacts us.
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

### (B) "Partner with us" recruitment page — next increment
5. A **/partners** route (a sub-page like `/about` / `/faq`, added to the `ROUTES` registry):
   value prop (bring us your students, we run the live 12-lesson cohort; simple rev-share), a short
   **how-it-works** (3 steps), what students get, and a **contact CTA** (book a call / email us).
   Copy is founder-editable (site settings) where it makes sense. Linked from the footer.

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
- [ ] **(Increment B)** a **/partners** "Partner with us" page exists (ROUTES registry), with value
      prop + how-it-works + contact CTA, founder-editable copy, linked from the footer.
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
  **only** those fields); a compact **partner strip** section/component on the public site; a new
  **/partners** sub-page (increment B) + footer link; the founder console partners editor (display
  fields + toggle). **NOT** the student dashboard; **NOT** any settlement/cut data on a public surface.

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
