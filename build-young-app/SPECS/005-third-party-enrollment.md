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

> **Student-experience parity (hard requirement).** Once onboarded, a partner student's experience is
> **identical to a direct enrollment** — the **same** onboarding/welcome/set-password email **text**,
> the same dashboard, course, class reminders, certificate, and group email. **No** "partner" / source
> / settlement / cut wording ever reaches the student; partner attribution lives **only** in the
> founder console + the aggregate funnel, and the student can't tell how they were enrolled. There is
> **no divergent student-facing copy** — the only student-side difference is that partner seats **don't
> show a self-withdraw control** (the founder removes them manually, step 5), so the student is never
> shown a refund promise that doesn't apply to them.

Happy path (**MVP = founder-driven, manual**):
0. **Configure partners (once each):** the founder adds a **partner** in the console —
   `{ id, name, cut % }` (cut % = the partner's commission). Editable later; the cut % at the time
   a seat is recorded is **snapshotted** onto the enrollment (so changing it later doesn't silently
   restate past settlements).
1. **Enter + save the record — INERT (nothing student-facing).** In the founder console the founder
   adds a partner enrollment — name, email, cohort, **partner** (from the configured list), optional
   **external ref** (the marketplace order id), **payment source = partner / invoice** (no Stripe) —
   and saves. This creates a **pending** record (flagged `paymentSource:"partner"` + `partner:<id>` +
   `externalRef`, with the seat's **price + cut %** snapshotted). **Saving sends NO email, provisions
   NO student access, and adds NOTHING to the Resend audience, and does not yet count as `enrolled`.**
   It's a back-office record the founder can review/fix/bulk-enter first.
2. **Start onboarding — EXPLICIT action.** When ready, the founder clicks **"Start onboarding"** on the
   record. *Only then* does the student get the **same** set-password / welcome email and the **same**
   dashboard (12 lessons, cert, group email) as a direct enrollment, get added to the cohort Resend
   audience, and flip from `pending` → **active** (`enrolled` fires; funnel/revenue/settlement now count
   the seat). Saving alone never triggers any of this; "Start onboarding" is per-record, deliberate, and
   re-runnable (to resend the invite).
3. Once onboarded, the student is **attributed to that partner** where it matters: the funnel `enrolled`
   event
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
5. **Removal (no self-withdraw for partner seats):** partner students **do not see the self-withdraw
   control** in their dashboard — so they're never shown a Build Young refund promise that doesn't apply
   (refunds are the **partner's** responsibility per its policy). If a partner student needs to leave,
   the **founder removes them manually** from the console: drops course + Resend-audience access, issues
   **no** Build Young refund, and **credits back** the seat in the partner's settlement totals. (Direct
   students keep the normal self-withdraw + flat-75% flow, unchanged.)

**Edge cases:** a saved-but-not-onboarded record stays **pending** indefinitely (no email, not counted)
until the founder clicks Start onboarding or deletes it; duplicate email (already enrolled) → block +
surface; partner not in the list → must pick/create one (no silent free-text); cohort full → founder
override allowed (partner seats may exceed public seats by agreement); student never sets a password →
re-run Start onboarding to resend the invite.

## Done when (acceptance)
- [ ] Founder can create an enrollment with `paymentSource:"partner"`, a `partner` tag, and an
      optional `externalRef`, into any cohort, **without a Stripe charge** — the student's account +
      dashboard access + cert eligibility are identical to a paid student.
- [ ] **Saving is inert; onboarding is explicit.** Saving a partner record creates it as **pending**
      and triggers **no** student-facing onboarding (no welcome/set-password email, no access, no
      Resend-audience add, not counted as `enrolled`). A separate **"Start onboarding"** action sends
      the email, provisions access, adds to the audience, and flips the seat to active (`enrolled` +
      funnel/revenue/settlement). The action is re-runnable to resend the invite. (A test asserts saving
      sends nothing and Start onboarding sends exactly once.)
- [ ] **Student-experience parity:** once onboarded, a partner student's experience is **identical** to
      a direct enrollment — same welcome/set-password email **text**, dashboard, course, class reminders,
      certificate, group email; **no** partner/source/settlement wording reaches the student, and the
      **only** student-side difference is that the self-withdraw control is **hidden** for partner seats.
      (A render/text test asserts the partner-student emails + dashboard match the direct-student ones.)
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
- [ ] Partner students have **no self-withdraw control** in the dashboard; the founder removes a partner
      student manually from the console (drops course + Resend access, **no** Stripe refund, credits the
      seat back in settlement). Direct students' self-withdraw + flat-75% flow is unchanged.
- [ ] Build + tests stay green; a render/integration test covers the inert-save vs. explicit-onboard
      paths, the settlement math (net owed / outstanding after a recorded payment), **and** the
      hidden-self-withdraw / founder-removal branch.

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
- **Touches:** founder console (partner **config** editor + partner-enroll form with a **pending**
  state + an explicit **"Start onboarding"** action + **settlement** view with record-payment +
  manual **remove student**), a **partners + settlement store** (KV, founder-gated `PUT`, like the
  cohort catalog / site settings), enrollment data model (`paymentSource` / `partner` / `externalRef`
  + snapshotted `priceCents` + `cutPct` + an `onboarded` flag), funnel (`source` tag + **per-source
  revenue segmentation** + net cents through the server allowlist), accounting **export** (CSV/JSON
  includes the settlement ledger), Platform (**hide self-withdraw for partner seats**), email (reuse
  the **same** set-password / welcome, sent on Start onboarding), `api/` (funnel ingest allowlist + a
  founder-only create-enrollment + onboard path), Resend audience (add on **Start onboarding**, remove
  on **founder removal**). **NOT** the public Stripe checkout.

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
- **Resolved — withdrawal.** Partner seats **hide the self-withdraw control**; the founder removes a
  partner student manually if needed. So no inaccurate refund copy is ever shown and there's no
  divergent student-facing wording — the student experience stays fully identical.
- **Resolved — onboarding trigger.** Saving a partner record is **inert**; a separate explicit
  **"Start onboarding"** action sends the email + provisions access + activates the seat. Saving never
  onboards.
- **Resolved (this increment):** manual founder entry only — no partner self-serve intake/API, no
  payout processing; we track settlement and record received payments by hand.
