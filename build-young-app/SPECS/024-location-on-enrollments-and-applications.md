# Spec: Location on enrollments & scholarship applications

> One feature = one short spec. Decisions go here; the PR implements them.

**Status:** approved
**Owner:** Sunil Garg
**Date:** 2026-07-01

> **Approved 2026-07-01:** granularity **country + US state**; **per-record in the applications list + an
> aggregate card**; **no backfill** (going-forward only).

## Why
Today only anonymous `visited` events carry geography (country + US state, server-stamped from Vercel's geo
headers → "Where visitors come from" / "US visits by state"). The founder wants to know **where each
enrollment and scholarship application comes from** — geographic reach, where demand is, where to market.

## What
### 1. Capture location — server-stamped, spoof-proof (reuse the existing `visited` pattern)
Stamp **`country`** (2-letter) + **`region`** (US state, US only) from Vercel's `x-vercel-ip-*` headers —
server-side, never client-settable, no city/precise location, no IP stored (identical privacy to today's
visit geo).
- **Scholarship application** — stamp on the **`free_application`** event in `addFreeApplication` (the request
  comes from the *applicant's* browser → their location). Also persist it on the stored application record so
  the founder sees it per-applicant.
- **Direct (paid) enrollment** — stamp on the **`enrolled`** event in the `ingest` handler (extend the current
  visited-only stamping), since `enrolled` is fired from the *student's* browser after checkout.
- **Known limitation (called out):** `enrolled` events fired **server-side** — a scholarship *award*
  (`free-approve`) and a *partner* onboard — are triggered by the founder, so their headers are the founder's,
  not the student's. So: **scholarship location lives on the application** (captured above); **partner seats
  are location-less** (founder-entered). We do NOT stamp founder-location onto those.

### 2. Show it
- **Per-record:** show **country · state** on each row of **Students → Free applications** (that list already
  shows name/email/write-up — founder-only).
- **Aggregate:** a small **"Where enrollments & applications come from"** breakdown (by country, with US-state
  drill-down) in the Funnel tab — mirroring the existing visit-geography card, period-scoped like the rest.

### 3. Privacy
Country + US-state only (no city, no IP), server-stamped. The aggregate view is counts-only. The per-applicant
location sits in the founder-only applications list (which is already identified) — consistent with "aggregate
data only" for the *public/analytics* surfaces.

## Open decisions (recommendation in **bold**)
1. **Granularity:** **country + US state** (matches the existing visit geo) — vs. country only, vs. add city
   (city needs a different header + is more identifying → not recommended).
2. **Display:** **per-record in the applications list + an aggregate card** — vs. aggregate only.
3. **Backfill:** none — location is captured going forward (past enrollments/applications have no geo). Confirm
   OK.

## Done when (acceptance)
- [x] `free_application` and (client-fired) `enrolled` events carry server-stamped `country`/`region` via
      `geoFromReq(req)`; a crafted POST can't spoof them (not in `ALLOWED_PROPS` — test asserts client "ZZ" ignored).
- [x] The stored free-application record carries the location (`addEnrollment` country/region); the console
      applications list shows `country (region)` per row.
- [x] A period-scoped "Where enrollments & applications come from" card (`enrollmentGeography`) renders in the Funnel tab.
- [x] Server-fired `enrolled` (scholarship award / partner) is NOT stamped with founder-location (only ingest +
      the applicant's own free-enroll request stamp geo).
- [x] Build + tests green (461) — funnel `enrollmentGeography`; free-enroll geo on event + record + non-US +
      ingest-enrolled; founder-ui card + list location. Docs synced (CLAUDE.md; no arch change — no new endpoint/route).

## Out of scope
- City-level or map visualizations; backfilling past records; per-enrollment location tied to a named student in
  the aggregate (stays counts-only there).

## Risk
Low–med. Additive event props + a display card + one list column. No money/auth change; no new endpoint or
route. Privacy unchanged (country/state, server-stamped, no IP).
