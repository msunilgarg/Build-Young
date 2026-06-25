# Spec: $0 / free-cohort enrollment by application (founder-approved)

> One feature = one short spec. Decisions go here; PRs implement them.

**Status:** shipped
**Owner:** Sunil Garg
**Date:** 2026-06-25

> **Approved 2026-06-25** — all 7 recommendations as written (free = $0 cohort; write-up required, ~300-char
> min; approve = full onboarding at $0; silent decline; hide withdraw/refund for free students; send an
> "application received" email; framed as a selective scholarship/by-application seat).

## Why
We want to offer **$0 (free) seats** without cheapening the program. Instead of "anyone clicks → free,"
an applicant **enrolls and submits a write-up** ("why we should consider you for this promotion"). The
**founder reviews and approves** in the console; approval triggers the **same onboarding we already run for
Stripe and partner enrollments**. The write-up + manual approval is the scarcity mechanism — it signals
selectivity, not a giveaway.

## How it works
**Free = a cohort priced `0`.** A cohort's `price` already drives the path; when `price === 0` the enroll
flow routes to **application** instead of Stripe (no Stripe link, no payment). Paid cohorts are unchanged.

### Applicant flow (public)
- In `Enroll.jsx`, when the selected cohort's `price === 0`: show **"Free — by application"** (not "$0"),
  collect the usual fields (name, email, eligibility) **plus a required write-up** (a textarea with a clear
  prompt; min length enforced), and the CTA becomes **"Submit application"** — no Stripe step.
- Submit → public, rate-limited **`POST /api/funnel?resource=free-enroll`** → stores a **PENDING** record
  (`paymentSource:"free"`, `priceCents:0`, `writeup`, `onboarded:false`) via `addEnrollment` — **inert**,
  exactly like a partner pending seat: no account, no email-to-student, no audience, no `enrolled` event.
- The founder is **notified** of the new application (with the write-up), reusing the `interestStore`
  notify pattern (`sendEmail` to `ops.notifyEmail`, `replyTo` = applicant). The applicant sees a
  confirmation screen + (decision #6) an optional "application received — we'll review and email you if
  selected" email.

### Founder flow (console)
- A **"Free applications"** list under Students (mirror of "Partner enrollments") shows each applicant's
  name/email/cohort **and their write-up**, newest first, via founder-gated **`GET ?resource=free-enrollments`**.
- **Approve** → founder-gated **`POST ?resource=free-approve`** → runs onboarding (below) and flips
  `onboarded:true`.
- **Decline** → founder-gated **`POST ?resource=free-remove`** → drops the pending record (decision #4).

### Approval → onboarding (reuses the proven path)
`free-approve` mirrors `onboardPartnerEnrollment` (funnel.js) at **$0**: ensure the enrollment record →
add to the cohort **Resend audience** (`addContact`) → **provision account** (`putUser`, with
`paymentSource:"free"`) → **send the set-password welcome** (`sendSetPasswordEmail`; re-sends until a
password exists, silent if one already does) → fire the **`enrolled`** funnel event with
`priceCents:0, source:"free"`. Re-runnable/idempotent like partner-onboard.

## Changes
- **`api/_lib/store.js`:** `addEnrollment` accepts `paymentSource:"free"` + a capped `writeup` field; add a
  `listFreeEnrollments(batchIds)` (or generalize `listPartnerEnrollments` to a source filter).
- **`api/funnel.js`:** three new resources — public `free-enroll` (rate-limited, validates the cohort exists
  AND `price===0`, stores pending, notifies founder) + founder-gated `free-enrollments` (GET list),
  `free-approve` (onboard), `free-remove` (decline). Wire into the POST/GET dispatch.
- **`src/Enroll.jsx`:** `price===0` branch — "Free — by application", write-up field, submit-application path
  (no Stripe), and a tailored confirmation screen.
- **`src/Landing.jsx` (batch cards) + cohort price display:** render **"Free"** when `price===0`.
- **`src/FounderDashboard.jsx`:** the "Free applications" list + Approve/Decline actions (mirror the partner
  enrollments UI).
- **`src/Platform.jsx` + `api/auth/me.js`:** treat `paymentSource==="free"` like `"partner"` for **hiding
  withdraw/refund** copy (they paid nothing) — `me.js` already returns `paymentSource`.
- **Tests:** mirror `partner-onboard`/enroll tests — pending create, founder-gated approve runs onboarding
  (account + email + audience + `enrolled` at $0/source:"free"), decline drops it, non-founder 403, public
  submit requires a write-up + a $0 cohort.
- **Docs:** CLAUDE.md (enrollment flows / paymentSource), architecture if endpoints are listed.

## Open decisions (please confirm — recommendation in **bold**)
1. **Free = a cohort with `price:0`** (enrolling routes to the application flow). **Yes** — vs. a scholarship
   seat on a *paid* cohort (more complex; would defer).
2. **Write-up:** required, with prompt *"In a few sentences, tell us why you want this seat and what you'd
   build."* and a **min length (~300 chars)** + a max cap. Confirm the prompt + minimum.
3. **Approve = full onboarding** (account + set-password email + audience + `enrolled` event), at $0 —
   **as you specified.**
4. **Decline:** **drop the pending record silently** (founder can email manually) — vs. auto-send a polite
   decline email (out of scope for v1).
5. **Free students' dashboard hides withdraw/refund** (nothing was paid), same as partner — **Yes.**
6. **Send the applicant a "application received" confirmation email** on submit — **Yes** (sets expectations).
7. **Public-copy framing:** present it as a **selective "scholarship / sponsored seat, by application"**
   (premium, not "free for everyone"). Confirm the label you want shown.

## Done when (acceptance) — all met
- [x] Enrolling in a `price:0` cohort shows "Free — by application", requires a write-up, and submits to
      `free-enroll` (no Stripe) → a PENDING `paymentSource:"free"` record + founder notified with the write-up.
- [x] The console (`FreeApplicationsAdmin`) lists free applications with their write-ups; **Approve** runs the
      full onboarding at $0 (account provisioned, set-password email sent, added to the audience, `enrolled`
      event with `priceCents:0, source:"free"`) and marks it onboarded; **Decline** drops it.
- [x] Free students get the dashboard with withdraw/refund copy hidden (`noSelfWithdraw` covers partner+free).
- [x] Paid-cohort enrollment (Stripe) is unchanged; revenue math treats free seats as $0 (`source:"free"`).
- [x] Public `free-enroll` is rate-limited and rejects a missing/short write-up or a non-free cohort; the
      approve/decline/list endpoints are founder-gated (403 otherwise). — `test/free-enroll.test.js` (7 tests).
- [x] The founder can **create a free cohort from the console** — the cohort editor's numeric **Price ($)**
      field accepts `0` (preserved by `sanitizeCatalog`, pinned in `cohort-store.test.js`), with an inline
      hint that 0 = free/by-application; no Stripe link needed.
- [x] Build + 414 tests green (incl. the `node --check` api guard); docs synced (CLAUDE.md + architecture).

## Out of scope
- Seat-limit/capacity enforcement for free seats (founder controls via approvals); waitlists.
- A decline email / templated rejection; scholarship seats on *paid* cohorts; partial/blind review workflows.
- Extracting the now 3-way-duplicated onboarding (Stripe/partner/free) into one shared helper — tempting,
  but it touches the Stripe money path; note as a follow-up refactor, don't bundle it here.

## Risk
Med. Adds a public write endpoint (rate-limited, validated to $0 cohorts) and an approval that provisions an
account + sends email — but it reuses the partner-onboard path (same trust model) at $0, so no money moves.
Auth/onboarding-adjacent → spec-first + review before merge.
