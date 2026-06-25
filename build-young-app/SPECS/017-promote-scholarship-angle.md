# Spec: Promote the scholarship (free-seat) angle — cohort card + FAQ

> One feature = one short spec. Decisions go here; PRs implement them. Follow-up to SPECS/016.

**Status:** approved
**Owner:** Sunil Garg
**Date:** 2026-06-25

> **Approved 2026-06-25** — card badge + FAQ copy as written.
> **Update 2026-06-25 (per founder):** don't use the word "free" in display copy — it reads cheap. The card
> price slot shows **"Fully funded"** (not "Free"), the Enroll flow uses **"scholarship"** wording, and the
> FAQ question is **"Do you offer scholarships?"**. ("Free" stays only on unrelated copy like "free 15-min
> call".) Pinned by a render test asserting the card shows "Fully funded".

## Why
SPECS/016 made $0 cohorts enroll by application, but the public surface barely signals it — a $0 card just
reads "Free · By application," and there's no FAQ about it. The founder wants to **promote the scholarship
angle**: make a free seat read as a *selective, desirable opportunity* (not a cheap giveaway), and answer
"do you offer scholarships?" head-on. Framing per POSITIONING: **selective + by application + warm**, never
cheap, boastful, or an admissions promise.

## What
1. **Cohort card badge (`src/Landing.jsx`).** When `(b.price||0)===0`, render a small **"Scholarship seats"**
   badge (GraduationCap icon, green pill on a `#e7f3ee` background — matching the existing "earn your tuition
   back" box) just under the track pill. The price line keeps reading **"Free" / "By application."** Paid
   cards are unchanged. Badge stays small so the grid's matched-height cards don't break.
2. **FAQ entry (`src/Faq.jsx` `FAQ_ITEMS`).** Add one `{q, a}` (plain text — the renderer has no bold/links),
   placed right after the cost question (#9) so cost/scholarship sit together. Q: *"Do you offer scholarships
   or free seats?"*
3. **JSON-LD sync (`index.html`).** Add the same Q+A to the `FAQPage` schema (same wording/count — the
   standing POSITIONING rule that the FAQ copy and JSON-LD stay in lockstep).

## Proposed copy (for approval)
- **Card badge:** `🎓 Scholarship seats` (GraduationCap icon + "Scholarship seats"), shown only on $0 cohorts.
- **FAQ — Q:** "Do you offer scholarships or free seats?"
- **FAQ — A:** "Sometimes — it depends on funding. When we have sponsorship to cover seats, we open a limited
  number of free scholarship places for that cohort, awarded by application, so it isn't offered every time.
  When it is, you'll see a free cohort on the enrollment page. If cost is a barrier, tell us who you are and
  what you'd build — we read every application ourselves, and selected students get the full program, the
  same classes, dashboard, and support, at no cost."
  - **Framing (per founder):** scholarships are **funding-dependent and limited** — something we do *only when
    we have sponsorship available*, for a limited number of students; **not** a standing per-cohort offer.

## Out of scope
- A separate `scholarship` cohort flag (price===0 is the single signal — no schema change).
- Need-based verification / income docs; a standalone scholarship landing section or page.
- Any change to the SPECS/016 application/approval flow itself.

## Done when (acceptance) — all met
- [x] A $0 cohort card shows the "Scholarship seats" badge (paid cards unchanged); the card still routes to
      the SPECS/016 application flow on click (CTA unchanged).
- [x] The FAQ shows the scholarship Q&A (plain text), and `index.html`'s `FAQPage` JSON-LD carries the same
      entry (count in lockstep + the new Q&A mirrored).
- [x] Copy matches POSITIONING voice (selective/by-application/warm; no "cheap"/"exclusive"/admissions claim).
- [x] Build + 418 tests green — `test/scholarship-badge.test.jsx` (badge on $0 / absent on paid) +
      `test/Faq.test.jsx` (scholarship entry + FAQ↔JSON-LD count parity).

## Risk
Low. Public copy only — no logic/flow change. Positioning-sensitive (founder reviews the exact wording here).
