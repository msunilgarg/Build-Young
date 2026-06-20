# Spec: Payment-failure visibility (know when a student's Stripe payment fails)

> One feature = one short spec. Keep it to a page. Decisions go here; PRs implement them.

**Status:** draft
**Owner:** Sunil Garg
**Date:** 2026-06-19

## What
Detect failed Stripe payments at enrollment and surface them to the founder — a founder email
when one happens, plus a **"Failed payments"** list in the founder console. Notification/visibility
only: it never moves money, issues refunds, or changes enrollment state.

## Why
Today the Stripe webhook (`api/stripe-webhook.js`) only listens for `checkout.session.completed`
(enroll) and `charge.refunded` (cancel). A **failed** payment fires neither, so a student whose card
is declined simply never appears anywhere — no log, no email, no status field. The founder can only
discover it by manually searching the Stripe Dashboard. That's a blind spot in the enrollment funnel:
a family that tried to pay and bounced is exactly the lead worth following up, and it's invisible.

## Users & trigger
**Founder.** Triggered when Stripe reports a failed payment attempt on an enrollment checkout — a
declined/expired card on a Payment Link, or a delayed-payment method that fails to clear.

## Behavior
- The webhook handles three new Stripe events (acknowledged 200, never made to retry):
  - **`payment_intent.payment_failed`** — primary signal (card declines on Checkout fire this).
  - **`charge.failed`** — redundant backup signal for the same.
  - **`checkout.session.async_payment_failed`** — delayed-payment-method failures (carries the
    session, so `batchId` + student name are recoverable like the success path).
- For each, we extract whatever Stripe gives us: **email** (billing/receipt/customer details),
  **amount**, **decline reason/code** (`last_payment_error` / `failure_message`), and **`batchId`**
  when present (session metadata / `client_reference_id`; often absent on a bare PaymentIntent — that's fine).
- A new KV-backed `paymentIssueStore` records the failure (`payments:failed` list, capped) **and**
  emails the founder (`ops.notifyEmail` → site `contactEmail` → `team@build-young.com`), mirroring
  `refundStore` exactly. Both are key-gated/best-effort — no KV or no Resend ⇒ no-op, webhook still 200s.
- **Idempotent per underlying attempt:** `payment_intent.payment_failed` and `charge.failed` both fire
  for one declined card, so a `SET … NX` marker keyed by the PaymentIntent id (charge id fallback)
  ensures the founder is notified **once** per failure.
- The founder console (Students → Enrolled students) gains a **"Failed payments"** card right beside
  "Refunds to issue": each row shows name/email, amount, decline reason, cohort (if known), date.
- **Edge cases:** missing email ⇒ still record/notify with what we have (the reason + amount are still
  useful); no `batchId` ⇒ show "—"; store-less/keyless setup ⇒ clean 200, no throw.

## Done when (acceptance)
- [ ] `api/stripe-webhook.js` handles `payment_intent.payment_failed`, `charge.failed`, and
      `checkout.session.async_payment_failed`, each returning 200 and calling the new store once.
- [ ] New `api/_lib/paymentIssueStore.js`: `addPaymentFailure(...)` (idempotent per ref, KV list +
      founder email, key-gated/best-effort) and `listPaymentFailures()` (newest first).
- [ ] `GET /api/funnel?resource=payment-failures` (founder-gated) returns the list.
- [ ] Founder console renders a **"Failed payments"** card next to "Refunds to issue"; empty state
      reads cleanly; no PII leaks to any public read.
- [ ] Tests: store (validation, idempotency per ref, email-recipient resolution) + webhook (a
      `payment_intent.payment_failed` records once; a duplicate no-ops) + a founder-ui render assertion.
- [ ] Build + tests green; `CLAUDE.md` Stripe-events note + `BUILD-YOUNG-ARCHITECTURE.md` updated
      (new endpoint/module + the two new handled events).

## Out of scope
- **No automatic student-facing retry/dunning email.** Re-engaging the family (a "your payment didn't
  go through, here's the link again" email) touches minors + outward messaging and is its own decision —
  spec it separately if wanted. This feature only tells the *founder*.
- **No refunds, no enrollment-state mutation, no money movement.** A failed payment means the student
  was never enrolled; we add no `payment_status` field to the enrollment/user records.
- **No new Stripe API dependency** — stays keyless (signed-webhook verification only).

## Surfaces & sources of truth
- Copy (founder email + console card wording) → keep plain/operational; check **POSITIONING.md** voice.
- Code conventions/gotchas (keyless Payment Links, key-gated best-effort, idempotency markers) → **CLAUDE.md**.
- Touches: `api/stripe-webhook.js`, new `api/_lib/paymentIssueStore.js`, `api/funnel.js` (GET read),
  `src/FounderDashboard.jsx` (console card), tests, `CLAUDE.md`, `BUILD-YOUNG-ARCHITECTURE.md`.

## Risks / open questions
- **Stripe Dashboard config (founder action, gates go-live):** the three new events must be added to the
  webhook endpoint subscription in Stripe (Developers → Webhooks). The code handles them, but Stripe won't
  send them until subscribed. Document in the go-live checklist.
- **PaymentIntent often lacks `batchId`** (it lives on the Checkout Session, not the PI) — a card-decline
  alert may identify the student only by email/amount/reason. Acceptable: the founder cross-refs in Stripe.
- Aggregate funnel analytics are unaffected (failures are not an `enrolled` event); this is an ops
  notification list, not a funnel stage. No Terms/refund-policy copy changes.
