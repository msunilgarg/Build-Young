# Spec: 005 — Third-party (marketplace / reseller) enrollment

> One feature = one short spec. Decisions go here; PRs implement them.

**Status:** approved — MVP scope locked (2026-06-18): manual founder entry · per-partner **cut %** · per-partner **settlement tracking**
**Owner:** Sunil Garg
**Date:** 2026-06-18

## What
Let students reach Build Young through a **third-party marketplace or referral partner**
(e.g. Outschool) instead of our own checkout. The partner runs the family-facing signup +
payment; we **accept those students into a cohort** — same dashboard, 12-lesson course, and
certificate — **without** running them through Build Young's Stripe checkout. The **founder
enters every enrollment manually** (no partner-facing intake or API).

Each **partner** is configured once with a **cut %** (their commission). We **track settlement
per partner** — what they owe us (net of their cut) vs. what they've paid — so the founder can
see, and chase, the outstanding balance. *(Convention: `cut %` = the partner's commission, so
**Build Young's net per seat = cohort price × (1 − cut%)**.)*

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
0. **Configure partners (once each):** the founder adds a **partner** in the console —
   `{ id, name, cut % }` (cut % = the partner's commission). Editable later; the cut % at the time
   a seat is recorded is **snapshotted** onto the enrollment (so changing it later doesn't silently
   restate past settlements).
1. In the founder console (Cohorts/Students), the founder **adds a partner enrollment**: name,
   email, cohort, **partner** (pick from the configured list), optional **external ref** (the
   marketplace order id), and **payment source = partner / invoice** (no Stripe).
2. This creates the student's enrollment + account exactly like a paid enrollment, but flagged
   `paymentSource:"partner"` + `partner:<id>` + `externalRef`, and **snapshots the seat's price +
   the partner's cut %** for settlement. The student gets the **set-password / welcome** email and
   logs into the **normal** dashboard (same 12 lessons, cert, group email).
3. The student is **attributed to that partner** where it matters: the funnel `enrolled` event
   carries `source:"partner:<id>"` + the seat's **net** cents (price × (1 − cut%)), aggregate/no-PII;
   the cohort roster marks partner seats. **Partner revenue is counted in the funnel `revenue`
   total at net**, and revenue (+ the funnel) is **sliceable by source** — direct vs. each partner —
   so the founder/investors see the channel mix without losing the topline.
4. **Settlement (per partner):** the console shows, per partner — **seats**, **gross** (Σ list
   price), **partner cut** (Σ price × cut%), **net owed to Build Young** (gross − cut), **received**,
   and **outstanding balance** (net owed − received). The founder **manually settles payouts** —
   records a payment received (date + amount + optional note) as a dated ledger entry; the balance
   updates. This ledger is kept **for accounting** and is included in the CSV/JSON export. We never
   move money — settling is a bookkeeping record, not a transfer.
5. **Withdrawal / refund:** partner enrollments do **not** run our Stripe refund or the flat-75%
   money path — refunds are the **partner's** responsibility per their policy. Withdrawing removes
   course + Resend-audience access and shows partner-refund copy (not the Build Young 75% copy);
   it issues **no** Build Young refund, and the seat is **excluded from / credited back** in the
   partner's settlement totals.

**Edge cases:** duplicate email (already enrolled) → block + surface; partner not in the list →
free-text allowed but warn; cohort full → founder override allowed (partner seats may exceed public
seats by agreement); student never sets a password → resend invite.

## Done when (acceptance)
- [ ] Founder can create an enrollment with `paymentSource:"partner"`, a `partner` tag, and an
      optional `externalRef`, into any cohort, **without a Stripe charge** — the student's account +
      dashboard access + cert eligibility are identical to a paid student.
- [ ] The student receives a set-password / welcome email and logs into the normal 12-lesson
      dashboard.
- [ ] Founder can **configure partners** (`id`, `name`, `cut %`); the cut % + the seat price are
      **snapshotted** on each enrollment so net-owed = `Σ price × (1 − cut%)` is stable even if the
      cohort price or the partner's cut % changes later.
- [ ] The `enrolled` funnel event records the partner source + net cents (aggregate, no PII).
- [ ] Partner enrollments are **counted in the funnel `revenue` total at net** (price × (1 − cut%));
      revenue + the funnel are **sliceable by source** (direct vs. each partner).
- [ ] The console shows a **per-partner settlement view** — seats, gross, partner cut, **net owed**,
      **received**, **outstanding balance** — and the founder can **manually settle payouts** (record
      a dated payment received); the outstanding balance updates. Withdrawn partner seats are not
      counted as owed.
- [ ] The settlement ledger (dated received payments per partner) is included in the **accounting
      export** (CSV / JSON data room).
- [ ] Withdrawing a partner enrollment removes course/audience access but triggers **no** Stripe
      refund and shows partner-refund copy (not the 75% Build Young copy).
- [ ] Build + tests stay green; a render/integration test covers the partner-enroll path, the
      settlement math (net owed / outstanding after a recorded payment), **and** the suppressed-refund
      branch.

## Out of scope (this increment)
- **Automated marketplace API / webhook sync** (auto-import from Outschool et al.) — MVP is manual
  founder entry; the data model is built so an API can fill it later.
- **Processing partner payouts / generating invoices.** We **track** settlement (what's owed,
  recording payments received) — we do **not** move money, auto-invoice, or integrate accounting.
- A partner-facing **self-serve intake** (code/link) or partner login — founder entry only.
- Changing the **public enroll/landing** flow — partner families never touch it; our Stripe checkout
  is unchanged.

## Surfaces & sources of truth
- **Copy** (student emails, withdrawal wording, any partner-facing copy) → **POSITIONING.md**
  (us/we voice; no overclaiming).
- **Code conventions/gotchas** → **CLAUDE.md** — enrollment + funnel + Stripe webhook + Resend
  audience are documented there; keep the enrollment **data model** and the funnel **`source`
  allowlist** in sync in the same PR.
- **Touches:** founder console (partner **config** editor + partner-enroll action + **settlement**
  view with record-payment), a **partners + settlement store** (KV, founder-gated `PUT`, like the
  cohort catalog / site settings), enrollment data model (`paymentSource` / `partner` / `externalRef`
  + snapshotted `priceCents` + `cutPct`), funnel (`source` tag + **per-source revenue segmentation** +
  net cents through the server allowlist), accounting **export** (CSV/JSON includes the settlement
  ledger), Platform (partner-aware withdrawal), email (reuse set-password / welcome), `api/` (funnel
  ingest allowlist + a founder-only create-enrollment path), Resend audience (add on partner enroll,
  remove on withdraw). **NOT** the public Stripe checkout.

## Risks / open questions
- **Minors + a third party in the middle (highest stakes).** Who captures **parental consent +
  media release** — the partner, or do we re-collect it at first login? Terms need a partner clause;
  **attorney review required** before any partner goes live.
- **Settlement direction (assumption to confirm per deal).** We model `cut %` as the partner's
  commission → Build Young net = `price × (1 − cut%)`. If a partner instead pays us a flat per-seat
  rate, or net-of-their-own-fees differently, that deal needs a different field — revisit if a real
  contract doesn't fit the % model. Keep settlement numbers **off any public surface** (founder-only).
- **Resolved — funnel revenue.** Partner seats **count at net** (price × (1 − cut%)) in the funnel
  `revenue` total, and revenue + the funnel are **sliceable by source** (direct vs. each partner). The
  per-partner settlement view stays the source of truth for what each partner owes vs. has paid.
- **Identity / dedupe.** A student could exist both via a partner and direct — define the single
  source of truth for their enrollment and avoid a double Resend add.
- **Refund liability.** Confirm with counsel that disclaiming Build Young refunds for partner seats
  (the partner owns it) is correct in Terms.
- **Resolved (this increment):** manual founder entry only — no partner self-serve intake/API, no
  payout processing; we track settlement and record received payments by hand.
