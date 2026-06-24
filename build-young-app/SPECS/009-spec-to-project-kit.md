# Spec: Spec → Project Kit (the docs the student's AI actually reads)

> One feature = one short spec. Decisions go here; PRs implement them.

> **Superseded in part by SPECS/013 + 014:** the deterministic `buildProjectKit` + the kit handoff stay; the
> optional "Polish with AI" overlay (`kitAgent`, T45) was removed. The kit is now step ③ "Build it with
> Claude Code" — one prompt that writes the docs AND builds the feature — on every build week.

**Status:** approved
**Owner:** Sunil Garg
**Date:** 2026-06-23

> **Approved 2026-06-23** (founder sign-off). Decisions: v1 delivery = **"Set up with Claude Code" + download**
> (Path A+B); repo creation via a **starter template repo**; **generation = BOTH** — a deterministic
> template (always-on base) **+** an optional AI expand/polish layer (founder-toggleable, key-gated, falls
> back to the deterministic output); kit is **re-generatable** (keep-in-sync). GitHub auto-commit for minors
> (Path C) **deferred** to a consent/auth phase. Phase 1 tasks T42–T45 queued.

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

## Create the repo from zero — they don't know what a repo is (the missing first step)
The existing onboarding (`PREREQS` + the "Get set up before you build" / per-week "Pre-req" tab) already
walks the student to **make** a GitHub account, a Claude account (Claude Code in the browser at
claude.ai/code), and Vercel — but it never has them **create a repo**, and never says what one *is*. A
beginner can't "put the kit in their repo" if they've never made one. So Phase 1 must include a
**beginner "create your project" step**, built ON the existing pre-req surface (don't duplicate it):

- **Plain-English explainer (one line):** *"A repo is your project's folder, saved online, that keeps every version so nothing's ever lost."* No git jargon.
- **One-click repo creation via a Build Young starter template repo (promoted into Phase 1).** Build Young publishes a public GitHub **template repo** pre-loaded with `PLAYBOOK.md` + placeholder `CLAUDE.md`/`SPEC.md`/`POSITIONING.md`. The student clicks **"Use this template" → name it → Create** — a repo exists in one click, **no git knowledge required**, and the shared playbook is already in place. Then path A (or download) fills in the placeholders with their spec.
- **Connect their tools to it:** brief steps to open the repo in **Claude Code (claude.ai/code)** and link it to **Vercel** — folding into the existing Lesson-3 pre-reqs, which already point at those tools.

Net flow for a true beginner: *make a GitHub account (pre-req) → "Use this template" to create the repo (one click) → "Set up with Claude Code" fills in your kit → build.*

## Delivery — make it as easy as possible (phased)
**Phase 1 — zero auth, ships first (works for everyone):**
- **A. "Set up with Claude Code" (chosen — easiest + most on-brand).** One button copies a single prompt that instructs the student's *own* Claude Code to **write all four files into their project**. No GitHub integration, no tokens, no account linking — and it teaches the exact workflow. Lowest-friction, sidesteps every auth/minor risk.
- **B. Download.** Download the kit as a `.zip` (or individual files) to drag into their repo. Universal fallback.
- **Repo creation** via the **starter template repo** (above) — the beginner's "create a repo" path.

**Phase 2 — convenience, gated (the "commit to their repo for them" idea):**
- **C. Connect GitHub → commit for them.** Student pastes/picks a repo; we open a **PR** adding the four files. ⚠️ The **highest-risk** piece — write-access to a **minor's** GitHub: needs a narrow-scoped **GitHub App** (contents-write on the one repo they pick, PR-only — never force-push), an OAuth/consent flow, token handling, and **parental-consent** review (per BUSINESS.md "working with minors"). **Deferred** — built only after the consent/auth design is approved with counsel, and only if A/B prove insufficient.

## Other ideas to reduce friction
- **Keep-in-sync.** Because the spec evolves (editable acceptance through build weeks), make the kit **re-generatable** with one click so `SPEC.md`/`CLAUDE.md` never go stale.
- **Connect the live URL.** Capture the student's deployed URL (Week 7) into `CLAUDE.md` so the AI/Check know where "live" is.

## Done when (acceptance) — Phase 1
- [ ] A **"Generate my project kit"** action (end of Lesson 2, re-runnable) produces the four files from `s.build` + `s.shape` via a deterministic template (pure function, unit-tested).
- [ ] **Path A:** a "Set up with Claude Code" button copies a prompt that, pasted into Claude Code, writes all four files into the student's project (the prompt embeds the generated file contents).
- [ ] **Path B:** the student can **download** the kit (zip or per-file).
- [ ] **Create-your-repo step:** a beginner-friendly "what's a repo" line + a one-click link to **"Use this template"** (the Build Young starter template repo), surfaced on the existing pre-req surface (not duplicated). The template repo ships pre-loaded with `PLAYBOOK.md` + placeholder docs.
- [ ] `PLAYBOOK.md` content comes from the existing shared source (`MAKE_PRINCIPLES`/`GO_LIVE_DEFAULT`), not duplicated.
- [ ] Re-generating reflects edits made since (e.g. refined acceptance criteria).
- [ ] Pure generator unit tests (each field lands in the right file/section; guardrails present) + a render test (the action + copy/download/create-repo controls render). Build + tests green; POSITIONING-voiced copy; `CLAUDE.md` + `BUILD-YOUNG-ARCHITECTURE.md` updated.

> **Founder asset (not code):** the starter **template repo** must be created on GitHub (`Settings → Template repository`) and its URL wired into the app — a go-live setup item, like the Stripe links.

## Out of scope (for Phase 1)
- **GitHub commit / auth (Path C)** — separate, consent-gated phase; not built until approved.
- The live-URL-into-`CLAUDE.md` idea (fast follow-on once v1 lands).

## Surfaces & sources of truth
- Copy/voice → **POSITIONING.md**. Curriculum mechanics (`s.shape`, the build layers) → **CLAUDE.md**.
- Touches: `src/Platform.jsx` (the Lesson-2 kit action/UI), a new pure generator module (e.g. `src/projectKit.js`, foundation — dependency-free, shared/testable), tests, `CLAUDE.md`, `BUILD-YOUNG-ARCHITECTURE.md`. Phase 2 would add an `api/` GitHub integration + auth (separate).

## Decisions & open questions
- ✅ **v1 delivery = Path A ("Set up with Claude Code") + B (download)** — founder chose A; C deferred.
- ✅ **Build environment** settled by the existing pre-reqs: **browser Claude Code (claude.ai/code) + GitHub + Vercel** — no local install.
- ✅ **Repo creation = the Build Young starter template repo** ("Use this template", one click) + a plain-English "what's a repo" — folded into the existing pre-req surface.
- ✅ **Generation = BOTH** — a deterministic template is the always-on base (predictable, offline-safe, free); an **optional AI expand/polish layer** sharpens the docs when configured (founder-toggleable + key-gated, mirroring the scenario/review agents; **off / no key ⇒ the deterministic output**, never an error).
- ✅ **Keep-in-sync = yes** — the kit is re-generatable so the docs follow the evolving spec.
- **Deferred (decision needed later, with counsel):** GitHub write for minors (Path C) — OAuth tokens for under-18s, write scope, parental consent; narrow GitHub App + PR-only if pursued.
