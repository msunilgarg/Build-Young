# Spec: The build week = 2 inputs + 2 Claude handoffs (Spec → Acceptance → Build → Verify)

> One feature, one loop the student runs in THEIR own Claude. Decisions here; PRs implement them.

**Status:** shipped
**Owner:** Sunil Garg
**Date:** 2026-06-24

> **Approved 2026-06-24** (founder review of the live screen). Every build week becomes four clean steps —
> two inputs the student types, two handoffs into their own Claude — and the project kit is the single
> "into your Claude" path (no more per-spec Copy button). Verification moves to the student's OWN Claude
> running an **independent verifier agent** (mirroring how Build Young is built), since our app can't — and
> deliberately won't — touch a minor's private repo.

## Why
The per-week UI had drifted into clutter: a ① "Copy → build" button that overlapped the project kit, a
10-file download grid, a setup-prompt preview, and an in-app "paste what you built → our AI grades it"
check. Founder review: collapse it to the real agentic loop, with the kit as the one handoff, and teach
the *whole* loop — including independent verification done the way real engineers (and Build Young itself)
do it: a fresh agent checks the build against the spec's acceptance criteria.

## The build week — four steps (Lessons 2–6, 8; shared `BuildLayer`)
1. **① Write your spec — {feature}** — heading + file badge (`→ SPECS/<feature>.md`) + a text field. Nothing else.
2. **② Write your acceptance criteria** — heading + badge (same file) + field. (Wording is "acceptance
   criteria", not "Done when…".) `s.shape.accept[key]`, per-feature (SPECS/012).
3. **③ Build it with Claude Code** — the **project kit** (`ProjectKitPanel`), shown **every** build week
   (re-generatable). ONE primary action: **"Set up & build with Claude Code"** copies a prompt that
   writes/refreshes all the project files (CLAUDE.md + the `SPECS/` folder incl. this spec & its criteria
   + POSITIONING.md + PLAYBOOK.md), commits them, **and builds this lesson's feature**. Plus a single
   **"download this lesson's file"** fallback. **Removed:** the 10-file download grid and the setup-prompt
   preview.
4. **④ Verify it — with an independent agent** — a handoff (Copy + Open Claude Code) that tells the
   student's Claude to act as a **fresh, independent verifier**: read `SPECS/<feature>.md` (spec + its
   acceptance criteria) and the actual build, and report each criterion PASS/GAPS — fix nothing. Mirrors
   Build Young's own verifier. **No more in-app "what I built" paste / "Check my work" button.**

## Removed from the student flow
- The ① per-spec **Copy / Open Claude Code** buttons and the **"Preview the full prompt"** details.
- The kit's **per-file download grid** and **"Preview the setup prompt"** details.
- The in-app **review** UI (`built` paste, "Check my work", `s.review` verdict card) in `BuildLayer`.

## Out of scope (flag for follow-up, NOT this change)
- The **server-side `reviewAgent`** (`api/_lib/reviewAgent.js`, `POST /api/funnel?resource=review`) and its
  founder console (`ReviewAgentEditor`) + ops (`reviewAgentEnabled`/`reviewModel`) are now unused by the
  student flow. Left intact (founder-only, inert) — a separate cleanup PR removes them to avoid bundling a
  multi-surface backend deletion with this UI redesign.
- Connecting the student's GitHub so a check could read real code automatically (still deferred: minors/consent).
- "Polish with AI" kit button kept as-is for now (not in scope of this declutter).

## Done when (acceptance) — all met
- [x] Every build week's `BuildLayer` renders the four steps (① spec, ② acceptance, ③ build-kit,
      ④ verify), each box = heading + badge + its control; the ① Copy/Open + preview are gone.
- [x] ② says "acceptance criteria" (no "Done when…" in the heading/label; field aria-label is "Your acceptance criteria").
- [x] `ProjectKitPanel({s, week})` renders on every build week with a single **"Set up & build with Claude Code"**
      action whose prompt embeds the kit files **and** a build instruction naming `SPECS/<feature>.md`;
      the download grid and preview are gone; one current-week download remains.
- [x] ④ copies a verifier handoff naming `SPECS/<feature>.md` and "independent verifier"; no in-app paste/Check.
- [x] Build + 391 tests green (Platform tests rewritten via clipboard-spy; in-app-review tests replaced by
      handoff tests); docs synced — `CLAUDE.md`, this spec; `reviewAgent` orphan flagged for cleanup.
