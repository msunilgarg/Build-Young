# Spec: 005 — Third-party (marketplace / reseller) enrollment

> One feature = one short spec. Decisions go here; PRs implement them.

**Status:** draft
**Owner:** Sunil Garg
**Date:** 2026-06-18

## What
Let students reach Build Young through a **third-party marketplace or referral partner**
(e.g. Outschool) instead of our own checkout. The partner runs the family-facing signup +
payment; we **accept those students into a cohort** — same dashboard, 12-lesson course, and
certificate — **without** running them through Build Young's Stripe checkout. The partner
settles with us **out-of-band** (invoice / PO / rev-share), reconciled in the founder console.

## Why
Marketplaces already have the audience, trust, and payment rails we're still building. Listing
on one (or taking a referral partner) is a low-friction acquisition channel that fills cohorts
**now**, while our own funnel grows. The constraint that makes this a real feature: a marketplace
owns the family relationship and the money, so we need an enrollment path that does **not** assume
our Stripe checkout, plus a way to count and settle what each partner owes us.

## Users & trigger
- **Partner (marketplace / reseller)** — lists/sells a Build Young cohort seat; sends us the
  enrolled student's details.
- **Enrolled student (+ parent)** — bought through the partner; expects to log in and start.
- **Founder / admin** — adds the partner-sourced student into a cohort, tracks which partner each
  came from, and reconciles seats to invoice (console, `FOUNDER_EMAILS`-gated).

**Trigger:** a sale closes on the partner's platform → the founder receives the student's
name/email + cohort + a partner reference.

## Behavior
Happy path (**MVP = founder-driven, manual**):
1. In the founder console (Cohorts/Students), the founder **adds a partner enrollment**: name,
   email, cohort, **partner** (which 3p), optional **external ref** (the marketplace order id),
   and **payment source = partner / invoice** (no Stripe).
2. This creates the student's enrollment + account exactly like a paid enrollment, but flagged
   `paymentSource:"partner"` + `partner:<id>` + `externalRef`. The student gets the
   **set-password / welcome** email and logs into the **normal** dashboard (same 12 lessons, cert,
   group email).
3. The student is **attributed to that partner** where it matters: the funnel `enrolled` event
   carries `source:"partner:<id>"` (aggregate, no PII); the cohort roster marks partner seats; and
   a **per-partner reconciliation view** lists each partner's seats (count + cohorts + external
   refs) so the founder can invoice/settle.
4. **Withdrawal / refund:** partner enrollments do **not** run our Stripe refund or the flat-75%
   money path — refunds are the **partner's** responsibility per their policy. Withdrawing removes
   course + Resend-audience access and shows partner-refund copy (not the Build Young 75% copy);
   it issues **no** Build Young refund.

**Edge cases:** duplicate email (already enrolled) → block + surface; partner not in the list →
free-text allowed but warn; cohort full → founder override allowed (partner seats may exceed public
seats by agreement); student never sets a password → resend invite.

## Done when (acceptance)
- [ ] Founder can create an enrollment with `paymentSource:"partner"`, a `partner` tag, and an
      optional `externalRef`, into any cohort, **without a Stripe charge** — the student's account +
      dashboard access + cert eligibility are identical to a paid student.
- [ ] The student receives a set-password / welcome email and logs into the normal 12-lesson
      dashboard.
- [ ] The `enrolled` funnel event records the partner source (aggregate, no PII); the console shows
      a **per-partner roster + seat count** for invoice reconciliation.
- [ ] Withdrawing a partner enrollment removes course/audience access but triggers **no** Stripe
      refund and shows partner-refund copy (not the 75% Build Young copy).
- [ ] Build + tests stay green; a render/integration test covers the partner-enroll path **and** the
      suppressed-refund branch.

## Out of scope (this increment)
- **Automated marketplace API / webhook sync** (auto-import from Outschool et al.) — MVP is manual
  founder entry; the data model is built so an API can fill it later.
- A full **partners CRM** (rev-share %, contracts, automated billing) — MVP is a lightweight partner
  tag + reconciliation list; the founder invoices manually.
- Changing the **public enroll/landing** flow — partner families never touch it; our Stripe checkout
  is unchanged.

## Surfaces & sources of truth
- **Copy** (student emails, withdrawal wording, any partner-facing copy) → **POSITIONING.md**
  (us/we voice; no overclaiming).
- **Code conventions/gotchas** → **CLAUDE.md** — enrollment + funnel + Stripe webhook + Resend
  audience are documented there; keep the enrollment **data model** and the funnel **`source`
  allowlist** in sync in the same PR.
- **Touches:** founder console (partner-enroll action + reconciliation view), enrollment data model
  (`paymentSource` / `partner` / `externalRef`), funnel (`source` tag + server allowlist), Platform
  (partner-aware withdrawal), email (reuse set-password / welcome), `api/` (funnel ingest allowlist
  + a founder-only create-enrollment path), Resend audience (add on partner enroll, remove on
  withdraw). **NOT** the public Stripe checkout.

## Risks / open questions
- **Minors + a third party in the middle (highest stakes).** Who captures **parental consent +
  media release** — the partner, or do we re-collect it at first login? Terms need a partner clause;
  **attorney review required** before any partner goes live.
- **Money / settlement.** Invoice/PO + rev-share terms are per-partner and manual for now — confirm
  what each partner owes (gross vs. net of their cut) and how a partner refund claws back. Keep our
  internal numbers off any public surface.
- **Identity / dedupe.** A student could exist both via a partner and direct — define the single
  source of truth for their enrollment and avoid a double Resend add.
- **Refund liability.** Confirm with counsel that disclaiming Build Young refunds for partner seats
  (the partner owns it) is correct in Terms.
- **Open:** do we need a partner-facing self-serve intake (code/link) before the API, or is founder
  entry enough for the first 1–2 partners? *(Recommend: founder entry first.)*
