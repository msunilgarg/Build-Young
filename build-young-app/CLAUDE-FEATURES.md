# Claude Code features to use on Build Young

A reference list of Claude Code / Claude features that would speed up or harden work on this
project. Compiled from the go-live session (the build/test/PR/merge cycle, the Stripe + cert +
refund debugging, and the calendar-driven progression refactor).

Ordered by leverage for *this* repo.

## Highest impact

1. **Custom slash command / skill for the ship-cycle** — encapsulate
   `build → test → guards → commit → PR → squash-merge → sync main` into one invocation (e.g.
   `/ship`). Replaces ~6–8 manual tool calls per change and can't skip a step (guard greps, the
   www-vs-apex check).
2. **SessionStart hook** (`session-start-hook` skill) — at session start, sync to the right base,
   `npm install`, and confirm `npm test` is green. Kills the recurring "stale git mirror" problem
   (wrong SHA / wrong branch / fewer tests than expected).
3. **MCP servers for Stripe + Vercel + Resend** — inspect webhook deliveries, read deploy/function
   logs, confirm email delivery, and even issue refunds directly — instead of relaying JSON and
   screenshots by hand. This was the single biggest source of slow round-trips during payment
   debugging. Custom MCP servers plug in via the Claude Agent SDK.
4. **Browser verification** (`/run` or `/verify`) — launch the app and screenshot it to catch
   visual / layout / mobile-wrapping issues that jsdom can't (CLAUDE.md explicitly calls these out
   as needing "a real browser / human eyes").
5. **`/security-review`** (and **`/code-review`**) — run on the sensitive diffs (auth, payments,
   refunds, certificate issuance, minors' data) before merge. Cheap insurance where stakes are
   highest.

## Workflow smoothers

6. **`/loop`** — self-paced polling for "did the webhook fire?", "is the deploy live?", or
   "babysit this PR's CI" instead of prompting each time.
7. **`fewer-permission-prompts`** — allowlist the read-only `git` / `grep` / `npm` commands to cut
   permission friction.
8. **Parallel subagents** (`Explore` / `Plan`) — fan out independent investigations; use `Plan` to
   design bigger refactors (like calendar-driven progression) up front.
9. **Stop / PostToolUse hook** (`update-config`) — auto-run tests or the guard greps
   (finance-marker, literal `\uXXXX`) after edits, harness-enforced rather than remembered.

## Product-side (Build Young itself)

10. **`deep-research`** — verify every `WHY_STATS` figure against primary, dated sources on the
    annual stat refresh (matches the "statistics integrity" house rule).
11. **Claude Agent SDK + tool use** — power richer in-app AI (a spec reviewer, a "is your funnel
    healthy?" read, capstone grading) beyond the existing Week-9 scenario agent; use prompt caching
    to cut cost on repeated system prompts.

---

### Collaboration notes (how to brief Claude for fewer round-trips)

- **Lead with the full scenario/repro**, not the symptom — who, what they saw, what they expected.
- **State the acceptance criteria once** (the testable done-condition), not the direction only.
- **Declare invariants up front**: keyless Stripe (no secret key), www-only (apex 307-redirects),
  serves minors, reuse the same email, one shared Payment Link per price.
- **Flag the size of a change** — "quick cosmetic tweak" vs "do it properly even if it ripples."
- **Batch related asks** into one pass so interactions are caught and one PR covers them.
