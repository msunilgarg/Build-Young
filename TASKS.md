# Build Young — task backlog (the loop's queue + state)

This file is the **durable state** for the autonomous loop (see `ENGINEERING-PLAYBOOK.md` §9). The loop drains it
top-to-bottom: it picks the first unchecked task, implements it, has a separate verifier check it,
ships it, marks it done, and moves on. Because it's committed to git, it **survives container resets**
— a fresh session re-reads this file and resumes where the last one stopped.

**You (the human) own this file.** Add tasks as goals + acceptance criteria; the loop does the rest.
Keep each task small, single-feature, and independently shippable (one file/feature where possible).

> Not-yet-scheduled ideas live in [`BACKLOG.md`](./BACKLOG.md) (a parking lot the loop ignores).
> Promote one into this file as a task when it's ready to build.

## Format
```
## [ ] T<id> — <title>  ·  risk: low | med | high
Goal: one sentence — what "done" looks like.
Acceptance criteria:
- concrete, checkable conditions (the verifier checks these)
- build + tests stay green (always implied)
Files: likely file(s) to touch
Stop-and-ask if: (optional) conditions that should bounce back to the human
```
Risk drives autonomy: `low`/`med` the loop ships on its own; `high` it implements + opens a PR but
**stops for you** (architectural / behavioral / money-auth / ambiguous).

---

<!-- ===== Spec 005 — third-party (marketplace/reseller) enrollment. See SPECS/005-third-party-enrollment.md.
     Ordered by dependency (T26 → T31); each is independently shippable. ===== -->

<!-- ===== Spec 006 — partner showcase + channel marketing (family-first). See SPECS/006-partner-showcase-and-channel-marketing.md.
     Depends on the 005 partners registry (done). T32 (family strip) ships first; T33 (recruitment page) next. ===== -->

<!-- ===== Spec 007 — payment-failure visibility. See SPECS/007-payment-failure-visibility.md. Both shipped. ===== -->

<!-- ===== Spec 008 — teach the build loop "The Agentic Engineering Process" (Spec → Build → Check → Ship).
     See SPECS/008-teach-the-build-loop.md. All shipped (T37→T41). ===== -->

<!-- ===== Spec 009 — Spec → Project Kit (the docs the student's AI reads). See SPECS/009-spec-to-project-kit.md.
     Phase 1 (T42→T45) ALL SHIPPED. Path C (GitHub commit for minors) deferred to a consent/auth phase. ===== -->

<!-- ===== Spec 010 — Your Founder Story (capstone application-ready narrative). See SPECS/010-founder-story.md.
     T46→T47 ALL SHIPPED. Public portfolio page + AI polish deferred. ===== -->

<!-- ===== Spec 022 — track the scholarship application as its own screen. See SPECS/022-scholarship-apply-as-its-own-screen.md. SHIPPED (T48). ===== -->

<!-- ===== Spec 023 — teach steering & knowing when to stop ("is it going somewhere?"). See SPECS/023-steering-and-knowing-when-to-stop.md. SHIPPED (T49). ===== -->

<!-- Completed tasks are checked off and moved below this line by the loop, newest first. -->
## Done

## [x] T49 — "Is it going somewhere?" steering beat (between ③ Build and ④ Check)  ·  risk: low
Done (SPECS/023, Option 1). New exported `SteeringBeat({ week })` in Platform.jsx, rendered in `BuildLayer` between ③ Build (`ProjectKitPanel`) and the ④ Check box on EVERY build week — read-only guidance on steering an in-progress build: the **converging vs. spinning** signal (two cards; CSS-dot markers, no emoji glyphs), the **steer/stop playbook** (stop → re-read the spec → sharpen/shrink → reset context → capture an Engineering rule), a quick "what your AI is good at" read, and the honest hook (out-plan/out-judge, not out-type; no token-minimization framing). Fuller intro **open at Lesson 3** (after a spin in Lesson 2), compact + collapsed thereafter; a worked example (the "make login work" spin + the rule we wrote). Ties to ④ Check (finished slice) + SPECS/021 Engineering rules. 4 render tests (signal+moves, L3-intro-vs-compact, rules-tie+example, sits-between-③-and-④); a11y clean. CLAUDE.md curriculum note. Build + 445; independently verified.


## [x] T48 — Scholarship application = its own engagement screen (`enroll-scholarship`)  ·  risk: low
Done (SPECS/022). The funded/apply flow shared the `enroll` route with paid enrollment, so it was invisible in the whole-site Traffic & engagement + Top paths panels. New pure `engagementScreen(route, batch)` (`src/lib.js`, foundation): keys the enroll flow entered for a FREE ($0) cohort as `enroll-scholarship` (paid stays `enroll`, any other route keeps its key, null-batch-safe). `App.jsx` screen-view effect computes the key via the helper from the preselected batch → both `screen_view` and `exit` carry it; `/enroll` URL, ROUTES, and the funnel `enroll_started`/`enrolled` events are unchanged. `FounderDashboard.jsx` `SCREEN_LABELS` → `"enroll-scholarship": "Scholarship application"`, so it appears as its own row in both engagement cards and as its own node in Top paths (engagement/journeys are generic over screen keys — no change). Limitation: going-forward only (no backfill); keyed off the initially-clicked batch (reliable — the funded enroll flow locks the picker). New `test/engagement-screen.test.js` (7: helper free/paid/other-route/null + engagement/journeys distinguish the screen). CLAUDE.md analytics-screens note. Build + 441; independently verified.

## [x] T47 — Capstone "Your founder story" panels (Lesson 11 draft + Lesson 12 final) + sample  ·  risk: med
Done (PR #516; merged, full-auto). Completes SPECS/010. New exported `FounderStoryPanel` (Platform.jsx): renders `buildFounderStory` from live state with **copy + download** (reuses `downloadFile`), re-generatable. `final` prop switches **Lesson 11 = "Draft your founder story"** (mounted after the `ReflectionPanel`, with the worked `FOUNDER_STORY_EXAMPLE` shown via `ExampleCard`) ↔ **Lesson 12 = "Your founder story — for your presentation"** (in the capstone block, after `ShowcaseCapture`). Never gates progression; POSITIONING-voiced (evidence + a real story, no admissions claim). Render tests: L11 drafts from the reflection + the sample renders; L12 final framing. CLAUDE.md note. Build + 384; Sonnet-verified.

## [x] T46 — Founder-story generator + worked sample (pure module)  ·  risk: med
Done (PR #515; merged, full-auto). New foundation module `src/founderStory.js` (pure, dependency-free): `buildFounderStory({build, shape, reflect})` deterministically compiles `s.reflect[11]` (whatBuilt/proud/whoUses/next) + the build into an honest application-ready one-pager (essays/activities/interviews/portfolio) + a "How to use this" helper; worked `FOUNDER_STORY_EXAMPLE`. NO admissions-outcome language (POSITIONING — test asserts "guarantee"/"boost"/"get you in"/"admission" absent). Empty → placeholders. Unit tests: routing, helper, banned-phrase absence, empty-safe, sample. CLAUDE.md + BUILD-YOUNG-ARCHITECTURE.md (new foundation module). Build + 382; Sonnet-verified (purity, foundation layering, claim integrity).

## [x] T45 — Optional AI expand/polish layer for the kit (toggleable, key-gated, deterministic fallback)  ·  risk: med
Done (PR #510; merged, full-auto). Completes SPECS/009 Phase 1. New `api/_lib/kitAgent.js` (mirrors `reviewAgent.js`; reuses `buildProjectKit` + `parseJsonObject`) sharpens the four kit files while keeping the filenames/guardrails/acceptance contract; `sanitizeKit` returns EXACTLY the four files (capped) and **falls back to the deterministic base per-file**, so a bad/partial reply can't break the kit. Public `POST /api/funnel?resource=kit` → `{configured, kit}` using Build Young's server-side `ANTHROPIC_API_KEY`; off / no key / any failure ⇒ the deterministic `buildProjectKit` output (never an error). Separate ops `kitAgentEnabled` + `kitModel` (`KitAgentEditor` console; `saveOps` merges). Client: `ProjectKitPanel` "Polish with AI" button swaps in the polished kit when configured; a spec edit invalidates a prior polish. Tests: kit-agent helpers (prompt/sanitize-clamps+per-file-fallback/key-gated generateKit) + settings-store kit independence + a Platform polish-button render assertion. CLAUDE.md + arch table. Build + 374; Sonnet-verified.

## [x] T44 — "Create your repo" beginner step (+ Build Young starter template repo)  ·  risk: med
Done (PR #509; merged, full-auto). New `repo` item in `PREREQS` explains in plain English what a repo is + (when set) a one-click **"Use this template"** link to the founder's starter template repo, driven by a new founder-editable site setting `starterRepoUrl` (`src/site.js` + console Site settings; hidden when blank). Rendered via a generic `configLink` field on prereq items (both render sites; `rel="noopener noreferrer"`). Render tests: explainer + template link when set; link absent when unset. CLAUDE.md notes. Build + 366; Sonnet-verified. ⚠ Founder asset: create the template repo on GitHub (Settings → Template repository), pre-load the playbook, paste the URL into the setting. (Flagged pre-existing bug: `prereqWeek` `/week N/` regex vs `"Lesson N"` → per-lesson Pre-req tab shows the generic note — separate fix.)

## [x] T43 — Lesson-2 "Generate my project kit" action (Set up with Claude Code + download)  ·  risk: med
Done (PR #508; merged, full-auto). New `ProjectKitPanel` in `ShapePlan` (end of Lesson 2), built from the live spec via `buildProjectKit` (re-generatable): **"Set up with Claude Code"** copies one prompt embedding all four files + create/commit instruction (zero auth — the student's own agent writes them); per-file **download** (reuses `downloadFile`); a readonly setup-prompt preview is the copy fallback. Purely additive (never gates progression). Render test asserts the action + that the prompt embeds the four files built from the spec. CLAUDE.md note. Build + 364; Sonnet-verified.

## [x] T42 — Project-kit generator (pure module: spec → CLAUDE.md / SPEC.md / POSITIONING.md / PLAYBOOK.md)  ·  risk: med
Done (PR #507; merged, full-auto). New foundation module `src/projectKit.js` (pure, dependency-free): `buildProjectKit({build, shape})` deterministically compiles `s.build`+`s.shape` into the four files the student's build-AI reads — guardrails baked into CLAUDE.md (never homemade passwords / never handle cards / secrets off the browser) + the acceptance "Done when…" contract in SPEC.md. `AGENTIC_STEPS` moved here as the single source of truth (was duplicated in Platform.jsx; `AgenticProcessPrimer` now imports it) so the in-app primer + generated PLAYBOOK.md can't drift. Empty fields → placeholders, never "undefined". Unit tests: field→file routing, guardrails, shared-steps source, empty-safe. CLAUDE.md + BUILD-YOUNG-ARCHITECTURE.md (new foundation module). Build + 363; Sonnet-verified (purity, foundation layering, no feature import).

## [x] T41 — Ship/loop framing copy: Lesson 7 Go Live = "Ship"; Lesson 11 capstone tells the loop story  ·  risk: low
Done (PR #501; merged, full-auto). Completes SPECS/008. Lesson 7 `GoLiveChecklist` intro now names itself the **"Ship"** step of the Agentic Engineering Process ("you specced it, built it, and checked it; now you put it in front of real people") — copy only, checklist mechanics unchanged. Lesson 11 capstone-prep (`REFLECT_WEEKS[11].intro`) frames the story as Spec → Build → Check → Ship. `GoLiveChecklist` exported for a deterministic render test asserting the "Ship" + "Agentic Engineering Process" naming. POSITIONING voice; CLAUDE.md note. Build + 355; Sonnet-verified.

## [x] T40 — Wire the "Check my work" step into BuildLayer (Lessons 3–6, 8) + s.review  ·  risk: med
Done (PR #500; merged, full-auto). `BuildLayer` gains the Check card: a "What I built" box + "Check my work" button → `POST /api/funnel?resource=review` with that lesson's spec slice + `s.shape.acceptance`; renders verdict + strengths-first + gaps as a calm, encouraging card, saved to `s.review[week]`. Optional — **never gates progression** (cert/lock logic untouched); a full outage falls back to the pure `localReview` client-side, so it never errors. Two deterministic render tests (mocked agent reply verdict+strengths+gaps; offline self-check). `BuildLayer` exported as the test seam. CLAUDE.md note. Build + 354; Sonnet-verified (no progression touch, offline-safe, strengths-first, tone).

## [x] T39 — "Check my work" review agent (server: reviewAgent.js + POST ?resource=review + ops toggle + local fallback)  ·  risk: med
Done (PR #499; merged, full-auto). New `api/_lib/reviewAgent.js` (mirrors `scenarioAgent.js`): grades a build against `s.shape.acceptance` → `{verdict:"pass"|"gaps", strengths[], gaps[]}` via `sanitizeReview` (verdict bounded, arrays/strings capped, junk dropped). Public `POST /api/funnel?resource=review` → `{configured, review}` using **Build Young's own server-side `ANTHROPIC_API_KEY`** (students bring none; key never reaches the client); `generateReview` never throws; off / no key / any failure ⇒ deterministic `localReview`, never an error. Separate ops `reviewAgentEnabled` + `reviewModel` (`ReviewAgentEditor` console editor; `saveOps` merges). Tests: reviewAgent helpers (16) + settings-store independence + founder-ui render. CLAUDE.md + arch table. Build + 352; Sonnet-verified (key server-side, sanitization, fallback-never-throws, ops merge).

## [x] T38 — Lesson 2 spec gains "Done when…" acceptance criteria (s.shape.acceptance)  ·  risk: med
Done (PR #498; merged, full-auto). `ShapePlan` adds an `acceptance` field (`s.shape.acceptance`) — the sharper, checkable "Done when…" criteria the Check step grades against, distinct from the existing `success` vision line; worked `SHAPE_EXAMPLE.acceptance` sample added to the Lesson-2 class example. `ShapePlan` exported for a deterministic round-trip render test (both fields present + distinct; types into the field, asserts it persists via `s.shape`). CLAUDE.md `s.shape` note. Build + 335; Sonnet-verified.

## [x] T37 — Name the process: Lesson 1 "The Agentic Engineering Process" primer  ·  risk: low
Done (PR #497; merged, full-auto). New `AgenticProcessPrimer` (one shared component) names the through-line **Spec → Build → Check → Ship**: full card at the head of Lesson 1 (`BuildPlan`), compact reminder strip at the head of Act 2 (Lesson 8) + Act 3 (Lesson 11). POSITIONING-voiced (us/we; "how we built Build Young itself"; build with AI not coding); lucide `Repeat` icon (no content emoji); a11y clean. Render test asserts the named method + all four steps in Lesson 1. CLAUDE.md curriculum note. Build + 334; Sonnet-verified.

## [x] T36 — Founder console: "Failed payments" card  ·  risk: med
Done (PR #491; merged, full-auto). Completes SPECS/007. Founder-gated `GET /api/funnel?resource=payment-failures` (mirrors the `refunds` branch) → `{ failures: listPaymentFailures() }`. `FounderDashboard` gains a `PaymentFailuresAdmin` card (mirror of `RefundsAdmin`) in Students → Enrolled students, right beside "Refunds to issue": each row shows name/email, amount, decline reason+code, cohort (or "—"), date; loading + empty states read cleanly. Only the founder-gated GET exposes it (no public read). Render test asserts the card + a mocked failure row render next to "Refunds to issue". BUILD-YOUNG-ARCHITECTURE.md GET-resource list updated. Build + tests green; Sonnet-verified.

## [x] T35 — Detect failed Stripe payments + notify the founder  ·  risk: med
Done (PR #490; merged, full-auto). The keyless-Payment-Links webhook only handled success/refund, so a declined payment was invisible in-app. `api/stripe-webhook.js` now handles `payment_intent.payment_failed`, `charge.failed`, and `checkout.session.async_payment_failed` (existing signature path; always 200 so Stripe never retries) → new `api/_lib/paymentIssueStore.js` records to KV `payments:failed` + emails the founder (`notifyEmail` → `contactEmail` → `team@build-young.com`). Idempotent per attempt (PaymentIntent/charge id) so the dual events alert once; key-gated/best-effort. VISIBILITY ONLY — no charge, refund, or enrollment/audience change. Tests: payment-issue-store (record/notify, idempotency, recipient resolution, no-store fallback) + stripe-webhook (records once; dedup no-op). CLAUDE.md handled-events note + BUILD-YOUNG-ARCHITECTURE.md table updated. Build + 332; Sonnet-verified. ⚠ Founder go-live step: subscribe those three events on the Stripe webhook endpoint (code handles them, Stripe won't send until added).

## [x] T34 — Declutter the founder console "Students" tab (it's a kitchen sink)  ·  risk: med
Done (PR #468; merged, full-auto). The Students tab stacked 10 unrelated sections in one scroll. Split into a lightweight in-tab **sub-nav** (the acceptance's allowed alternative): **Enrolled students** (default — partner enrollments · certificates · student plans · showcase · refunds to issue · reset account) vs **Inbound · leads & requests** (tutor applications · partner inquiries · visitor questions · schedule requests). One cluster renders at a time → the tab opens compact + related things sit together. NO behavior change to any panel — each `<Admin/>` rendered as-is, just partitioned (only the Students render block + a `studentsView` state changed). Pills reuse `segBtn` (keyboard-operable `act()`, AA). Render test asserts both directions. Build + 320; Sonnet-verified (both-directions render, all 10 panels preserved unchanged, existing tests green).

## [x] T33 — "Partner with us" interest modal (006-B) — keep it simple, like Careers  ·  risk: med
Done (PR #466; merged, full-auto). Completes SPECS/006. Mirror of `CareersModal`: a nav + footer "Partner with us" link opens `PartnerModal` (short pitch + org + email (required) + optional note) → public `POST /api/funnel?resource=partner-lead` → new `addPartnerLead` (interestStore mirror of `addTutorInterest`: store in KV + email the team, key-gated → no real send on merge). Founder reads them in the console: Students → "Partner inquiries" (`PartnerLeadsAdmin`, founder-gated `GET ?resource=partner-lead`). NO new route (App.jsx untouched). Tests: addPartnerLead validation + a render test that the nav link opens the modal (org + email). lean guard intact; CLAUDE.md + arch table. Build + 319; Sonnet-verified (modal + no-new-route, public POST/founder GET wired + key-gated, console list, copy/voice).

## [x] T32 — Family "Where to find us" partner strip (006-A)  ·  risk: med
Done (PR #464; merged, full-auto). Threads the public featured-partner display fields (`GET /api/cohorts` → `partners`, T26's `publicPartners` hard allowlist) to the client (App state → `Landing` prop, mirroring `testimonials`) and renders a compact "Where to find us" strip below the batches section: logos link to each partner's `publicUrl` (`target=_blank rel=noopener noreferrer`; text-name fallback), hidden entirely when none featured. Only display fields reach the client (no cut/settlement). Render test: links out for a featured partner + absent when none. lean-landing guard intact; CLAUDE.md flipped to shipped. Build + 316; Sonnet-verified (link attrs + hidden-when-empty, no-new-endpoint threading, hygiene, lean guard).

## [x] T31 — Partner-aware withdrawal: hide self-withdraw + founder manual removal  ·  risk: high
Done (PR #458; merged, full-auto). Completes SPECS/005. Part A: partner students don't self-withdraw — `s.paymentSource` is threaded to the dashboard (onboarding stamps `paymentSource:"partner"` on the user → `/api/auth/me` → `newState`; returning students merged in `App.hydrateFromServer`), and `Platform` hides BOTH the withdraw control AND all refund-window copy when `s.paymentSource==="partner"` (`canWithdraw = canWithdrawNow(s) && !isPartner`); direct flow unchanged. Part B: founder-gated `POST /api/funnel?resource=partner-remove` drops the enrollment (→ no longer owed in settlement), removes the Resend contact + account/state, issues NO Stripe refund; console "Remove" per row (with confirm). Render test asserts a direct not-started student CAN cancel while a partner sees NO withdraw control/refund copy. Key-gated → no real side-effect on merge. CLAUDE.md + arch table. Build + 313; Sonnet-verified (both-sides render test, paymentSource chain, no-refund removal, direct flow intact). ⚠ Terms partner clause / refund disclaimer flagged for the founder's attorney (a Terms edit was NOT made — surface for legal sign-off).

## [x] T30 — Per-partner settlement view + manual record-payment + accounting export  ·  risk: med
Done (PR #456; merged, full-auto). Each partner record gains a founder-only `payments` ledger ({date, amountCents, note}; never public — publicPartners whitelist unchanged). New pure `funnel.settlementSummary(partners, enrollments)`: per partner — ONBOARDED seats, gross, cut, net owed (gross−cut, per the seat's snapshotted cut), received, outstanding; pending/withdrawn don't owe. Console Settings → "Partner settlement" view + per-partner "Record a payment" form (date/amount/note → appended to `payments`, saved via `PUT ?resource=partners`; bookkeeping only, preserves other ledgers). `toDataRoom(events, extra)` merges {settlement} into the funnel JSON export (back-compat). Tests: settlement math + toDataRoom extra + sanitizePayments. CLAUDE.md. Build + 312; Sonnet-verified (math, payments-never-public, record-payment save, export back-compat).

## [x] T29 — Funnel: net partner revenue + slice-by-source  ·  risk: med
Done (PR #454; merged, full-auto). New pure `funnel.revenueBySource(events)` groups `enrolled` events by `source` (`direct` vs `partner:<id>`), summing count + cents — partner seats at NET (their event carries net cents from `partner-onboard`), direct at gross — sorted by revenue; the slices SUM to `summarize().revenue.grossCents` (topline unchanged, single source of truth). Console: a "Revenue by source" card in the funnel tab (period-scoped; Direct / Partner · <id>; hidden when empty). Tests: grouping/sort/net + slices-sum-to-topline + empty-safe. Aggregate/no-PII. CLAUDE.md revenue note. Build + 308; Sonnet-verified (topline consistency + labeling + no PII).

## [x] T28 — "Start onboarding" explicit action (email + access + audience + activate)  ·  risk: high
Done (PR #452; merged, full-auto). Founder-gated `POST /api/funnel?resource=partner-onboard` ACTIVATES a pending partner seat exactly like a direct (Stripe) onboarding: provisions the account (`putUser`) + sends the SAME `sendSetPasswordEmail` welcome (no partner/source wording — parity), adds to the cohort Resend audience, flips `onboarded:true` (keeps snapshotted price/cut), and fires `enrolled` at NET (price×(1−cutPct)) tagged `source:"partner:<id>"`. Re-runnable (re-sends invite until a password exists; idempotent). Console: each pending row → "Start onboarding" button (onboarded → "Resend invite"). Saving (T27) still does none of this. Email/audience key-gated → no real send on merge. Tests: welcome-email parity (same fn, asserts standard text + absence of partner/source/commission wording) + founder-ui renders the action on a pending row. CLAUDE.md + arch table. Build + 305; Sonnet-verified (all 8 dimensions: parity, net+source, gating, inert-save preserved, no real side-effect on merge).

## [x] T27 — Partner enrollment record + "Add partner enrollment" form (INERT save)  ·  risk: high
Done (PR #450; merged, full-auto). Enrollment store (api/_lib/store.js) extended: a partner seat carries `paymentSource:"partner"` + `partner` + `externalRef` + snapshotted `priceCents`/`cutPct` + `onboarded` (PENDING=false); normal Stripe records byte-identical. `listEnrollments` passes partner fields through; new `listPartnerEnrollments` aggregates across cohorts. Founder-gated `POST /api/funnel?resource=partner-enroll` creates a PENDING record (price/cut snapshotted server-side, duplicate-email blocked) and is INERT — the store only HSETs, so NO email/access/Resend audience, NOT counted as `enrolled`. `GET ?resource=partner-enrollments` lists them. Console: Students → "Partner enrollments" form + pending/onboarded list. Tests: store partner record pending+snapshot+only-HSET, list pass-through+filter, back-compat, founder-ui render. CLAUDE.md + arch table. Build + 303; Sonnet-verified (inert-save guarantee — only addEnrollment called; both endpoints founder-gated; snapshots server-side).

## [x] T26 — Partners registry + store (config: name + cut %, public display fields)  ·  risk: med
Done (PR #448; merged, full-auto). New KV-backed `api/_lib/partnerStore.js`: each partner `{ id, name, cutPct (0..1 commission, FOUNDER-ONLY), displayName, logo, publicUrl, blurb, featureOnSite }`. `sanitizePartners` clamps cutPct, guards the logo (data:image/… or http(s), capped), trims, dedupes ids, coerces featureOnSite. Founder-gated `PUT /api/funnel?resource=partners` + `GET ?resource=partners` (full records). `publicPartners()` = a HARD allowlist of 5 display fields for FEATURED partners only, folded into `GET /api/cohorts` so cutPct/settlement can never leak (structurally — the projection enumerates only the allowlist, no spread). Console "Partners" editor under Settings (name + cut % + display fields + Feature-on-site toggle; cut % shown as %, stored as 0..1). test/partner-store.test.js (sanitize/clamp/logo + publicPartners omits money/internal) + founder-ui render assertion. CLAUDE.md + architecture table. Build + 301; Sonnet-verified (money-leak guarantee + gating + sanitization + doc currency).

## [x] T25 — Founder controls cohort display order (sort by start date + override)  ·  risk: med
Done (PR #434; merged, full-auto). New pure sortCohorts(list) (cohorts.js): start-date ascending by default (August before September) + explicit per-cohort sortOrder (>0) to pin ahead; unparseable dates last. Applied to landing cards + enroll dropdown (per season). Cohort editor "Display order" field; sanitizeCatalog clamps sortOrder ≥0. test/sort-cohorts.test.js; build + 281; Sonnet-verified by rendering (reversed seed → chronological; Sep 7 before Sep 8).

## [x] T18 — Founder can manually set a cohort's progress (effectivePosition override)  ·  risk: high
Done (PR #433; merged, full-auto). New courseDates.effectivePosition(batch) = per-cohort manualLesson override when set (1..12 on that lesson; 13 graduated) else the calendar coursePosition (unchanged). Platform position-sync uses it, so progression/cert(done)/refund(s.week) follow it; cohorts without an override are identical. Cohort editor "Progress override" select; sanitizeCatalog clamps 0..13. CLAUDE.md + cohorts.js doc. test/effective-position.test.js; build + 277; Sonnet-verified (override + cert/refund cascade + fallback deep-equals).

## [x] T24 — Make the whole cohort card founder-editable (badge/format/blurb)  ·  risk: med
Done (PR #432; merged). CARD_DEFAULTS (cohorts.js) + optional per-cohort audience/format/blurb; Landing card renders `b.field || default` (badge suffix, format line, description blurb), pace line stays computed (T23). Cohort editor gains the two inputs + a blurb textarea; sanitizeCatalog trims/whitelists. test/card-copy.test.js; build + 273; Sonnet-verified by rendering the card (defaults + overrides) + the editor inputs.

## [x] T23 — Cohort cards: pace-accurate duration/hours + "Enrollment open"  ·  risk: med
Done (PR #431; merged). New courseDates.cohortSummary → {lessons,hours,weeks,hoursPerWeek}; Landing + Enroll cards state the cohort's real span/load (flagship still 12-week/~3 hrs/week; accelerated shows its own). Seat count → "Enrollment open"/"Enrollment full". Test + build 270; Sonnet-verified by rendering both cards.

## [x] T17 — Founder schedule, reminders & funnel curve follow the cohort pace  ·  risk: med
Done (PR #430; merged). Cron reminders (api/_lib/schedule.js) derive each lesson date from the cohort `lessons` schedule (first sitting via cohortLessons) — accelerated cohorts get several reminders/week; flagship byte-identical. Funnel weekCurve relabeled W->L (already lesson 2->12). Founder teaching-schedule view was already pace-aware (T20). schedule.test pace cases; build + 268; Sonnet-verified.

## [x] T22 — Simplify refunds: flat 75% within the first week  ·  risk: high
Done (PR #429; merged, full-auto). Replaced T19's hours proration with a flat rule: full before start; round(price×0.75) within the first-week window (REFUND_RATE=0.75); 0 after. Window/canWithdrawNow unchanged. All refund copy → flat 75%: withdrawal email, dashboard withdrawal dialog + completion card, in-app LEGAL Terms + public/terms.html, and the Enroll/Landing/FAQ policy copy. Internal analytics tier value (refundTier "prorated") kept for data continuity. Tests → full/75%/0; build + 266. Sonnet-verified by RENDERING (FAILed first on a "prorated" completion-card miss → fixed). ⚠ Terms wording changed — flagged for the founder's attorney.

## [x] T21 — Founder console: build a cohort with any lesson schedule  ·  risk: med
Done (PR #427; merged, full-auto). Cohort editor gains a Pace control (lessons/week + sittings/lesson → buildLessonSchedule writes the per-cohort `lessons` array) with a live preview (count + computed end date) and a "Use weekly default" reset; flagship cohorts unchanged. New pure `courseDates.buildLessonSchedule` (defaults reproduce the flagship). `test/lesson-schedule.test.js`. Build + 265; Sonnet-verified by RENDERING the cohort editor (Generate → "Custom schedule · 12 lessons · 24 sittings · ends …"; reset reverts).

## [x] T19 — Refund prorated by hours (dollars unchanged); 1-week window kept  ·  risk: high
Done (PR #426; merged, full-auto). `refundFor` re-expressed in HOURS — `price × (totalHours − heldHours)/totalHours`, `totalHours = lessons×3 = 36` — numerically identical (every lesson is 3 hrs) so dollars are unchanged ($916/$833), but the basis is hours so it reads right at any cadence. Copy synced to hours in the withdrawal email, the dashboard withdrawal block, the in-app LEGAL Terms + `public/terms.html`; graduation email "12 weeks"→"12 lessons"; window kept (`REFUND_WEEKS=1`). Tests → hours wording. Build + 261; Sonnet-verified by RENDERING the withdrawal flow. ⚠ Terms wording changed — flagged for the founder's attorney.

## [x] T15 — Dashboard progress reads "Lesson N of 12"  ·  risk: med
Done (PR #423; merged). Relabeled the student dashboard's position chrome week→lesson — header pill
("Lesson N of 12"), lesson stepper (aria/title), "LESSON N · …" status headings, locked message, the
"Your course, lesson by lesson" heading + helper, and overview chips ("12 lessons · 3 hrs each" + "36 hours
of live building", pace-independent). Pure display relabel — `coursePosition`/gating/`s.week` untouched.
Deferred (still "week", pending a deeper pass): curriculum-arc prose ("Weeks 1–7"), per-lesson instructions
("your Week 2 spec"), prereq tool-timing, and withdrawal copy (T19's lane). Build + 261 tests (Platform +
axe a11y updated); Sonnet-verified. NOTE: this was the last task merged under the old "pause for sign-off"
rule — the loop is now FULL AUTO (see `.claude/skills/run-loop/SKILL.md`).

## [x] T20 — Lesson-based pace model (3-hr lesson, flexible sittings)  ·  risk: high
Done (human-approved the merge; PR #422). Refined T14 to the founder's spec: the unit is the **3-hour
LESSON** (12 = 36 hrs, invariant), and each lesson is delivered as ANY number of live **sittings** (no
hardcoded 2/lesson). A cohort optionally carries `lessons` — one entry per lesson, each a list of that
lesson's sitting day-offsets from `start` (e.g. `[[0,2],[7,9], …]`); `cohortLessons` regenerates the
flagship cadence when absent (byte-identical — every `engine.test.js` case green). `coursePosition` reports
the current lesson (return key still `week` for back-compat); `classMeetingOn`/`nextClass`/`sessionDate`
work across any sitting count; `refundFor` prorates over lessons. Renamed exercise→lesson
(`LESSONS_TOTAL`/`lessonsTotalFor`/`cohortLessons`; old T14 names removed). `cohortStore.sanitizeLessons`
validates the field; `CLAUDE.md` "Program shape" updated; `test/course-pace.test.js` covers a compressed
cadence + a 1-and-3-sitting lesson. Build + 261 tests; Sonnet-verified (invariance traced).

## [x] T14 — Cohort pace as a per-cohort property (exercise as the unit)  ·  risk: high
Done (human-approved the merge — high-risk pause honored; PR #421). The course's atomic unit is now the
**3-hour EXERCISE** (12 = 36 hrs, invariant); a cohort optionally carries a `schedule` (ascending day-offsets
from `start`, one per session) and ALL calendar/progression/refund math derives from `cohortSchedule(batch)`
in `courseDates.js` — `coursePosition` reports the current exercise, `refundFor` prorates over the cohort's
exercise total, and `classMeetingOn`/`nextClass`/`sessionDate`/`checkinDateLabel` follow the schedule. With
no `schedule`, the flagship 12-week / twice-weekly cadence is regenerated EXACTLY (every `engine.test.js`
invariance case unchanged + green). No cohort added (that's T16); `cohortStore.js` sanitizes the field;
`CLAUDE.md` "Program shape" updated. New `test/course-pace.test.js` (10). Build + 260 tests; Sonnet-verified.

## [x] T13 — Halve every page's scroll height (≥50%) and keep it there — without trimming content  ·  risk: high
Done (landing — three founder-approved increments, each merged after a screenshot review). Applied the
House-style "optimize for less scrolling" rule **structurally**: relocated the landing's long-form blocks
to dedicated, crawlable routes — **nothing trimmed, all copy verbatim** — leaving a lean funnel entry.
- **/about** (`About.jsx`, #396): founder "Why this exists" essay + "More than money" narrative + compound
  graphic. **/curriculum** (`Curriculum.jsx`, #397): 3-act "how it works" + product teasers + week cards +
  "where the work happens". **/faq** (`Faq.jsx`, #397): full Q&A + ask form. The landing keeps short
  teasers (+ the canonical mission paragraph) linking through; the data-driven `ROUTES` registry got one
  appended entry per page.
- **Result:** landing 390px **11,157 → 4,501px (−59.7%)**; 768px −54.6%; 1280px −54.2% — **≥50% on every
  width.** POSITIONING voice/claims unchanged; a11y preserved (`act()` teasers, `aria-expanded`, Back/Home,
  recharts still lazy).
- **Locked in (the "maintain it always" half):** `test/landing-lean.test.jsx` + a `landing-lean` CI check
  fail any PR that moves long-form content back onto the landing. jsdom has no layout engine, so the guard
  is a **deterministic content-volume proxy** (heavy blocks absent + a text-volume/node ceiling) calibrated
  to the measured **≤5,579px @ 390px** (50% of the pre-T13 baseline); raise the ceiling only with a fresh
  headless-browser px measurement. Build + 249 tests green; each increment independently Sonnet-verified.
- **Follow-on screens** (`Enroll.jsx`, `BookCall.jsx`, `Platform.jsx`) — apply the same lens; promote to
  their own tasks when ready.

## [x] T12 — Audit & tighten the current pages for less scrolling (landing first)  ·  risk: med
Done (landing-page increment — founder-approved the screenshots, then merged): a spacing/padding-only pass
on `Landing.jsx` applying the House-style "optimize for less scrolling" rule — tightened the hero stack
+ every section's padding/inter-block gaps so the **primary CTA ("Pick a batch & enroll") now sits in the
first mobile viewport** (390px), where before it barely peeked past the cut-off hero preview. No copy,
sections, CTAs, behavior, or a11y changed (verified line-by-line + before/after mobile screenshots on the
Sonnet tier); recharts lazy-split + JS budget preserved; build + 237 tests green. Outward-facing visual,
so it paused for the founder's sign-off before merge (per the Stop-and-ask). **Follow-on screens remain
(not auto-created): `Enroll.jsx`, `BookCall.jsx`, `Platform.jsx` — promote to a task when ready.**

## [x] T11 — Fix inflated traffic & engagement metrics (foreground-only dwell + exit per session)  ·  risk: med
Done: the founder dashboard's Traffic & engagement numbers were inflated because `flush()` ran on every
`visibilitychange → hidden` and measured wall-clock time (so idle/backgrounded time counted as dwell —
~20 min on landing — and an `exit`+`screen_view` fired on every tab-hide → 78 exits > 77 views > 46
visits). Fixed: **App.jsx** now records **foreground-only dwell** (accumulate active time, pause on hide,
resume on visible) and emits **one `screen_view` per visit** (a `flushed` guard, at the first of
navigation/hide/close); `exit` still fires on hide/close. **`funnel.js engagement()`** dedupes exits to
**one per session** (`sid`, last screen wins) so exits ≤ sessions; legacy no-sid exits counted
individually. **FounderDashboard.jsx** adds `countryName()` (CA→Canada, US→United States) on the country
breakdowns so a country code can't be confused with the California state code in "US visits by state."
`funnel.test.js` exit test uses sids + asserts dedup. Behavioral (the `exit` event's meaning changed —
read historical data accordingly); aggregate, no PII. Build + 237 tests green; independently verified on
the Sonnet tier.

## [x] T10 — Make the loop model-tiered (cheap execution, premium reasoning)  ·  risk: high
Done (human-approved the Sonnet tier + merge — high-risk pause honored): the loop/ship flows now tier the
model to the role. The independent **verifier** sub-agent runs on a **Sonnet-class** model
(`model: "sonnet"` via the Agent tool), and the premium frontier model is reserved for planning,
architecture/design, and `risk: high` tasks. Cheapen the *work*, not the *rigor* — the cheaper verifier
still re-runs build/tests, grades the diff, and runs every standing check (floor: never below Sonnet).
Policy: `ENGINEERING-PLAYBOOK.md` §9 (portable) + `build-young-app/CLAUDE.md` (project); both `/run-loop`
and `/ship` spawn the verifier on the cheaper tier; `BUILD-YOUNG-ARCHITECTURE.md` component table reflects
the tiers; `run-loop.yml` notes the cloud Action is a single all-in-one agent (no fan-out) so it stays
premium. Tiers named by family alias, not a dated string. Docs/skills/workflow only — build + 237 tests
green; **independently verified by a Sonnet-tier sub-agent (dogfooding the change).**

## [x] T9 — Make every crawlable surface 100% accurate + fix the search-result favicon  ·  risk: low
Done: audited all crawlable surfaces — **no stale money/finance positioning anywhere** (the old SERP
snippet is pure Google cache); JSON-LD price (999) matches `cohorts.js`; title/desc/OG/Twitter/canonical
consistent. Aligned two descriptive "teens" → "high schoolers"/"they" (JSON-LD + llms.txt). **Favicon:**
the SERP showed a generic globe (only an SVG favicon existed), so generated raster icons from the brand
mark — `favicon.ico` (16/32/48), `favicon-96x96.png`, `apple-touch-icon.png` (180) — and declared them
in `index.html`. Build + 237 tests green. Human follow-through (not loop-able): GSC → Request Indexing +
monitor until Google re-crawls (it controls timing).

## [x] T5 — Make the App.jsx router data-driven (routes registry)  ·  risk: high
Done (human-authorized to merge without the usual high-risk pause): App.jsx routing is now a single
`ROUTES` registry (`{ key, path, title, desc, el }`); the render block and the URL-path/`<title>`
effect both derive from it, so adding a screen is one appended entry. Behavior unchanged — same
component/props per route, the `app` route keeps its `state` guard, paths + per-route titles match the
old maps, `verify` keeps `/verify/<id>`. nav/goBack/navLock/scroll-restore/deep-link load untouched.
Independently verified route-by-route. Build + 237 tests green.

## [x] T8 — Break down US traffic by state  ·  risk: med
Done: `api/funnel.js` stamps a `region` (2-letter US state) on `visited` only when country is `US`,
from Vercel's `x-vercel-ip-country-region` header — **server-stamped, NOT in `ALLOWED_PROPS`** (so it
can't be spoofed, mirroring `country`; an intentional security improvement over the task's literal
wording). `engagement()` adds an additive `usStates: [{region,count}]` (US-only, region-required,
descending); the "Where visitors come from" card shows a "US visits by state" line (hidden when none).
New engagement test + updated exact-shape assertion. Aggregate, no PII. Suite 35 files / 237 passing.

## [x] T7 — Show country in the "Top paths through the site" view  ·  risk: med
Done: `journeys()` now joins each visit's server-stamped `country` (via the visit's `sid`, now also
on the `visited` event) and returns it additively — `byCountry` per path + an overall `countries`
tally (existing `steps/left/count`/`sessions` unchanged). The "Top paths" card shows a "Top countries"
line + per-path flags (unknown → "—"). Aggregate, no PII (sole join key is the existing ephemeral
`sid`; country is server-only, not client-settable). New journeys test; suite 35 files / 235 passing.

## [x] T4 — Add render tests for the certificate route + card  ·  risk: med
Done: `test/cert-ui.test.jsx` (4 tests) — `CertifyVerify` verified path (mocked `/api/cohorts?cert=`
→ name + "Verified by Build Young" + correct lookup URL) and not-found path; `CertificateCard` renders
the graduate name + all three actions (Add to LinkedIn / Download / View public page) and renders
nothing without a cert. Tests only — no app source. Suite 35 files / 234 passing.

## [x] T3 — Co-locate tests per feature module  ·  risk: med
Done: split `test/app.test.jsx` (10 tests) into per-feature files — `Landing.test.jsx` (2),
`Enroll.test.jsx` (3), `Legal.test.jsx` (2), `Platform.test.jsx` (3); removed the monolith. Tests
moved verbatim; suite stays 34 files / 230 passing (no coverage lost). Tests only — no app source.

## [x] T2 — Refresh the stale technical sections of build-young-app/README.md  ·  risk: low
Done: refreshed the go-live + layout sections to the current app — class-reminder cron (not a
market-news drip), high-school-only cohorts (`fall-mw`/`fall-tt`, one $999 price; no MS/HS tiers),
`CONFIG` now in `src/lib.js` + founder-console live-editing, server/KV-authoritative state, and a
Project-layout block mirroring CLAUDE.md's module map (App.jsx = router; screens + foundation + the
real `api/` set). Docs only — build + 230 tests green.

## [x] T1 — Remove the unused lazy `Charts` import from App.jsx  ·  risk: low
Done: removed the dead `const Charts = React.lazy(() => import("./Charts.jsx"))` (+ its comment) from
the router; charts are lazy-loaded from FounderDashboard.jsx. Build still code-splits recharts; 230
tests green.

## [x] T6 — Create BUILD-YOUNG-ARCHITECTURE.md (living diagrams) + the keep-it-updated rule  ·  risk: med
Done: `BUILD-YOUNG-ARCHITECTURE.md` added at the repo root with two **Mermaid** diagrams + component tables —
(1) the agentic loop (triggers incl. the new issue-triggered `run-loop.yml` Action → durable state →
driver → doer → verifier → ship/pause → live, plus the always-on guards/hooks/MCP/worktrees machinery)
and (2) the app (App.jsx router → screen modules → foundation modules → `api/` serverless endpoints →
KV + Stripe/Resend/Vercel/Anthropic). Module/endpoint names match the repo. The **living-document
rule** is installed in `build-young-app/CLAUDE.md` (any PR changing a module/endpoint/skill/hook/
service or the loop flow updates BUILD-YOUNG-ARCHITECTURE.md in the same PR). Docs only — no app code touched.
