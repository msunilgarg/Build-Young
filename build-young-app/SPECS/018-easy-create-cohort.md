# Spec: Make it easy to create a new cohort

> One feature = one short spec. Decisions go here; PRs implement them.

**Status:** approved
**Owner:** Sunil Garg
**Date:** 2026-06-25

> **Approved 2026-06-25 — scoped to DUPLICATE only.** The founder chose just the per-cohort "Duplicate"
> button (the fastest path for the common "same as last season, new dates" case), append + reuse the
> existing Save, defaults unchanged. The guided "New cohort" quick-add form is **deferred** (kept in the
> "What" section below as a possible follow-up, not built now).

## Why
Creating a cohort today = click "+ Add", then hand-fill ~13 scattered fields at the bottom of the list:
invent a unique `id`, hand-type the `day` label ("Mondays & Wednesdays · 5:00–6:30 PM PT"), set the date,
paste a Stripe link, etc. It's slow and error-prone (a typo'd `day` or a duplicate `id` ships to the public
card). Most new cohorts are also just "same as last season, new dates." Make creation fast + hard to get wrong.

## What — two additions to the console Cohort editor (`CohortEditor`, FounderDashboard.jsx)
### 1. A guided "New cohort" quick-add (at the TOP of the editor)
A compact form that composes a complete, valid cohort from a few structured inputs:
- **Type:** **Paid** (default) | **Scholarship** (free, by application). Scholarship → `price: 0`, no Stripe.
- **Season** (text, defaults to a sensible value), **Track** (default "Builders").
- **Days:** preset chips — **Mon & Wed** / **Tue & Thu** / **Custom** — compose the days half of the label.
- **Time:** start–end (e.g. 5:00–6:30 PM) + **timezone** dropdown → together with Days, auto-compose the
  single `day` string (reusing the existing `setDay` format so nothing downstream changes).
- **Start date** (picker), **Seats** (default 10), **Price** (default 999; hidden when Scholarship).
- **Auto `id`:** generated from season + day-pattern (e.g. `fall-mw`), **uniqueness-checked** against
  existing ids (suffix `-2`, `-3`… if taken); shown + editable.
- **Create cohort →** appends a fully-formed row (with `groupEmail` derived from the id) to the editor list;
  the founder reviews it inline and clicks the **existing Save** to persist. **No new endpoint** — it reuses
  the current PUT + `sanitizeCatalog`. Inline note: "Paid cohorts — add your Stripe Payment Link after creating."

### 2. A "Duplicate" button per cohort row
One click clones an existing cohort as a starting point: copies every field, assigns a **fresh unique id**,
and **clears `start` + `stripeLink`** (each cohort needs its own). The founder just sets the new date. This is
the fastest path for a recurring cohort.

## Open decisions (please confirm — recommendation in **bold**)
1. **Scope:** **both** the guided quick-add *and* Duplicate (they cover the two real workflows: brand-new vs.
   repeat) — vs. just one.
2. **Create behavior:** **append the row + reuse the existing Save button** (one save path, no new endpoint) —
   vs. a dedicated "create" that saves immediately.
3. **Defaults:** Track "Builders", Seats 10, Price 999, timezone PT — confirm these.

## Done when (acceptance) — DUPLICATE scope (all met)
- [x] Each cohort row has a **Duplicate** action; clicking it inserts a clone right below the source with a
      **fresh unique id** and **cleared per-instance fields** (`start`, `stripeLink`, `groupEmail` → re-derives
      from the new id) plus dropped `groupAudienceId`/`recordings`/`manualLesson` (these must never be shared).
- [x] The clone keeps the reusable shape (season, track, day/time, seats, price, blurb, pace, zoom) so the
      founder typically only sets a new start date (+ a Stripe link for paid) and clicks the existing Save.
- [x] The fresh id is always unique (dedupes against existing ids, suffixing `-copy`, `-copy-2`, …).
- [x] The clone logic is a **pure helper** (`duplicateCohort(src, existingIds)` in `src/cohorts.js`), unit-
      tested: unique id, cleared start/stripeLink/groupEmail, dropped audience/recordings/manualLesson, and
      that price (incl. a $0 scholarship) is preserved.
- [x] Build + tests green; docs synced (CLAUDE.md cohort-editor note).

## Out of scope
- Generating the Stripe Payment Link (that's created Stripe-side; the founder pastes it after).
- Bulk/seasonal batch creation, auto-scheduling future seasons, capacity/waitlist logic.
- Any change to the public site, the enrollment flow, or the save endpoint.

## Risk
Low. Founder-console only; it just composes a cohort object that flows through the existing
`sanitizeCatalog` + PUT — no public, money, or auth surface changes.
