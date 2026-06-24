# Spec: Remove the orphaned student-AI agents (reviewAgent + kitAgent)

> Dead-code cleanup. SPECS/013 moved build + verify into the student's own Claude; these server agents
> and their founder consoles are no longer reachable from the student flow.

**Status:** shipped
**Owner:** Sunil Garg
**Date:** 2026-06-24

> **Approved 2026-06-24** — the follow-up cleanup SPECS/013 flagged. With the in-app "Check my work" review
> gone (verification is now a handoff to the student's own independent verifier agent) and the kit's
> "Polish with AI" removed, the server `reviewAgent` and `kitAgent` — plus their founder-console editors and
> ops toggles — are unused. Remove them so there's no dead, founder-confusing code.

## Remove
- **Files:** `api/_lib/reviewAgent.js`, `api/_lib/kitAgent.js`, `test/reviewAgent.test.js`, `test/kit-agent.test.js`.
- **`api/funnel.js`:** the `?resource=review` (`makeReview`) and `?resource=kit` (`makeKit`) handlers + their
  route dispatch + the now-unused imports (`generateReview`/`localReview`, `generateKit`; keep `buildProjectKit`
  only if still used elsewhere — it isn't in funnel, so drop it too).
- **`api/_lib/settingsStore.js`:** the `reviewAgentEnabled`/`reviewModel`/`kitAgentEnabled`/`kitModel` ops
  (defaults + sanitize) and the `REVIEW_MODEL(S)`/`KIT_MODEL(S)` imports.
- **`src/FounderDashboard.jsx`:** the `ReviewAgentEditor` + `KitAgentEditor` components and their render sites.
- **`src/Platform.jsx`:** the kit's **"Polish with AI"** button + `polish()` + `aiKit`/`polishing`/`polishNote`
  state + the `?resource=kit` fetch. The kit becomes purely the deterministic `buildProjectKit` (it already
  is the base; this drops the optional AI-polish overlay).
- **`test/settings-store.test.js`:** the review/kit ops assertions + their entries in the test's `OPS_DEFAULTS`.

## Keep
- `scenarioAgent` (Week-9 practice funnels) — still used. `buildProjectKit` (`src/projectKit.js`) — the kit's base.
- The Stripe/refund/payment agents and `paymentIssueStore` — unrelated.

## Done when (acceptance) — all met
- [x] The four files are deleted; no import of them remains; `api/funnel.js` no longer routes `review`/`kit`.
- [x] No live `reviewAgent`/`kitAgent`/`reviewModel`/`kitModel`/`reviewAgentEnabled`/`kitAgentEnabled`/
      "Polish with AI"/`ReviewAgentEditor`/`KitAgentEditor` references remain in `src/`, `api/`, `test/`
      (only removal-note comments + a "fields dropped" regression test).
- [x] `ProjectKitPanel` renders the deterministic kit with no Polish button; the ③ build handoff is unchanged.
- [x] Build + 367 tests green (the two deleted test files removed; settings-store + founder-ui tests trimmed).
- [x] Docs synced — `CLAUDE.md`, `BUILD-YOUNG-ARCHITECTURE.md` (api/_lib row), SPECS/008 + 009 (superseded note), SPECS/013 (flag resolved).

## Out of scope
- The `scenarioAgent` and any Stripe/payment work. Founder-console layout beyond removing the two editors.
