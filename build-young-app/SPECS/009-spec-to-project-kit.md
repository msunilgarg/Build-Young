# Spec: Spec → Project Kit (the docs the student's AI actually reads)

> One feature = one short spec. Decisions go here; PRs implement them.

**Status:** draft
**Owner:** Sunil Garg
**Date:** 2026-06-23

## What
Compile the student's Week-1 bet (`s.build`) + Week-2 spec (`s.shape`) into a **project kit** —
the same four artifacts that make *our* agentic build work: a **`CLAUDE.md`**, a **`SPEC.md`**, a
**`POSITIONING.md`**, and a shared **`PLAYBOOK.md`** — and get them into the student's project as
frictionlessly as possible, so their Claude Code reads them on every build (and the Check step grades
against them). Today the spec dead-ends as one copy-paste prompt; this is the connective tissue.

## Why
Our agentic loop works because of the **docs the AI reads every session**, not the four step-names. A
student writes a great spec in Week 2, copies one prompt, and from then on their building-AI flies blind —
no project guide, no standing rules, no positioning, no persistent acceptance criteria → it drifts. That's
exactly what `CLAUDE.md`/`SPECS/`/`POSITIONING.md`/the playbook prevent for us. This makes the loop we
*teach* the loop the student actually *gets*. (It also fixes the weak "Check my work" step: the building-AI
and the checker finally share one durable spec + acceptance contract.)

## Users & trigger
**Enrolled student**, at the end of **Lesson 2** (spec is ready) — a **"Generate my project kit"** action.
Re-generatable any time (the spec keeps evolving — acceptance criteria are editable through the build weeks).

## Field → file mapping (what translates to what)
- **`CLAUDE.md`** (project guide, read every session): `product` → what it is + core features; `pain` → who/the problem; `accounts` → accounts & data (+ guardrail "trusted sign-in, never homemade passwords"); `payments` → payments (+ guardrail "use Stripe, never touch cards"); `production` → emails/findable/protect-minors'-data; "Definition of done" → links `SPEC.md`.
- **`SPEC.md`**: the four build layers verbatim (`product`/`accounts`/`payments`/`production`) + `success` + the **`acceptance` "Done when…"** contract.
- **`POSITIONING.md`**: `promise` (headline), `pr` (narrative), `pain` (who it's for), `trueVsGoal` → **claims we make vs. avoid** (true-now = claimable; goal = label as aspiration).
- **`PLAYBOOK.md`** — **shared, not generated** (same for every student): the agentic standing rules (build one layer at a time, ship early, run Spec→Build→Check→Ship, keep secrets safe). Content already exists in-app (`MAKE_PRINCIPLES`, `GO_LIVE_DEFAULT`) — ship it as a file.

Generation is a **deterministic template** (drops the student's own words into the right sections — predictable, offline-safe, no PII to a model). Optional later: an AI "expand/polish" pass reusing the existing agent plumbing.

## Delivery — make it as easy as possible (phased)
**Phase 1 — zero auth, ships first (works for everyone):**
- **A. "Set up with Claude Code" (recommended easiest + most on-brand).** One button copies a single prompt that instructs the student's *own* Claude Code to **write all four files into their project**. No GitHub integration, no tokens, no account linking — and it teaches the exact workflow. This is the lowest-friction path and sidesteps every auth/minor risk.
- **B. Download.** Download the kit as a `.zip` (or individual files) to drag into their repo. Universal fallback.

**Phase 2 — convenience, gated (the "commit to their repo for them" idea):**
- **C. Connect GitHub → commit for them.** Student pastes/picks a repo; we open a **PR** adding the four files. ⚠️ This is the **highest-risk** piece — write-access to a **minor's** GitHub: needs a narrow-scoped **GitHub App** (contents-write on the one repo they pick, PR-only — never force-push), an OAuth/consent flow, token handling, and **parental-consent** review (per BUSINESS.md "working with minors"). Specced here but **built only after the consent/auth design is approved** — and only if A/B prove insufficient.

## Other ideas to reduce friction (candidates, not all in v1)
- **Starter template repo.** Build Young publishes a GitHub **template repo** pre-loaded with `PLAYBOOK.md` + placeholder docs; "Use this template" gives the student a repo in one click, then they paste their generated docs (or run path A). Cuts first-time setup to near-zero.
- **Keep-in-sync.** Because the spec evolves (editable acceptance through build weeks), make the kit **re-generatable** with one click so `SPEC.md`/`CLAUDE.md` never go stale.
- **Connect the live URL.** Capture the student's deployed URL (Week 7) into `CLAUDE.md` so the AI/Check know where "live" is.

## Done when (acceptance) — Phase 1
- [ ] A **"Generate my project kit"** action (end of Lesson 2, re-runnable) produces the four files from `s.build` + `s.shape` via a deterministic template (pure function, unit-tested).
- [ ] **Path A:** a "Set up with Claude Code" button copies a prompt that, pasted into Claude Code, writes all four files into the student's project (the prompt embeds the generated file contents).
- [ ] **Path B:** the student can **download** the kit (zip or per-file).
- [ ] `PLAYBOOK.md` content comes from the existing shared source (`MAKE_PRINCIPLES`/`GO_LIVE_DEFAULT`), not duplicated.
- [ ] Re-generating reflects edits made since (e.g. refined acceptance criteria).
- [ ] Pure generator unit tests (each field lands in the right file/section; guardrails present) + a render test (the action + copy/download controls render). Build + tests green; POSITIONING-voiced copy; `CLAUDE.md` + `BUILD-YOUNG-ARCHITECTURE.md` updated.

## Out of scope (for Phase 1)
- **GitHub commit / auth (Path C)** — separate, consent-gated phase; not built until approved.
- AI "expand/polish" of the docs (deterministic template only for v1).
- The template-repo + live-URL ideas (fast follow-ons once v1 lands).

## Surfaces & sources of truth
- Copy/voice → **POSITIONING.md**. Curriculum mechanics (`s.shape`, the build layers) → **CLAUDE.md**.
- Touches: `src/Platform.jsx` (the Lesson-2 kit action/UI), a new pure generator module (e.g. `src/projectKit.js`, foundation — dependency-free, shared/testable), tests, `CLAUDE.md`, `BUILD-YOUNG-ARCHITECTURE.md`. Phase 2 would add an `api/` GitHub integration + auth (separate).

## Risks / open questions
1. **GitHub write for minors (Path C)** — the program's highest-stakes area. Storing/using OAuth tokens for under-18s, write scope, parental consent. Recommend: **defer**; if pursued, narrow GitHub App + PR-only + consent flow + counsel review. **Decision needed.**
2. **v1 delivery set** — is **A (Claude Code prompt) + B (download)** the right Phase-1 scope, with C deferred? (Recommended.)
3. **Generation** — deterministic template (recommended) vs. AI-expanded (cost + nondeterminism). 
4. **Keep-in-sync** — re-generatable kit (recommended) so the docs follow the evolving spec.
