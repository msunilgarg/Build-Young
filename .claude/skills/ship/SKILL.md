---
name: ship
description: The canonical, VERIFIED path to land any change — a direct edit OR a loop task. Build + tests + guards → an INDEPENDENT verifier sub-agent (fresh context, grades the diff against intent + the playbook's standing checks) → commit → PR → verify get_files → squash-merge → sync. Verification is a property of shipping, so nothing merges unverified. Invoke with "/ship" (or "ship this", "land this change") whenever you're about to merge work that wasn't already verified inside /run-loop.
---

# Ship (the verified merge path)

**Verification is part of shipping, not of one entry point.** `/run-loop` verifies each task at its
step 5; this skill is the SAME rigor for everything else — so a *direct edit* never becomes an
unverified path to `main`. Use it for any substantive change you're about to land.

## Steps
1. **Start clean.** `git fetch origin main`; be on the dev branch (`claude/<branch>`) at latest
   `origin/main`. Keep the change in its own lane (only the files it needs).
2. **Self-check.** `cd build-young-app && npm run build && npx vitest run` (for docs/skill-only changes,
   a build sanity is enough). Run the repo guards (no `\uXXXX` escapes, no internal/model id, no
   resurrected money-sim markers). Fix until green.
3. **Independent verification — do NOT skip (the doer can't grade its own homework).** Spawn a **fresh
   sub-agent** (general-purpose, own context) **on the cheaper verifier tier — the Agent tool's
   `model: "sonnet"`** (cost discipline per CLAUDE.md / playbook §9; the rigor is unchanged — don't drop
   below Sonnet for grading). Give it: the change's intent / acceptance + `git diff origin/main`, **and
   tell it to first READ `ENGINEERING-PLAYBOOK.md`** (its standing rules — esp. **§3** diagram/doc rules
   and **§4** shipping rules) **and, when `BUILD-YOUNG-ARCHITECTURE.md` changed, that doc's *"Acceptance
   criteria for this doc"* section.** The **playbook is the single source of truth** — grade the diff
   against **every rule it reads there**, so a rule added to the playbook is enforced *without editing this
   skill* (don't hand-copy rules here, where they drift out of sync with §3). It must *independently*
   re-run build/tests, inspect the diff, and apply the **operational triggers** (these turn the playbook's
   standing rules into "on THIS diff, check Y" — the rule *content* lives in the playbook, not here):
   - every stated acceptance condition met, nothing obviously broken;
   - **architecture-doc currency** — if the diff adds/removes/moves/renames a module/endpoint/route/
     skill/hook or changes the loop/ship flow, `BUILD-YOUNG-ARCHITECTURE.md` (+ `CLAUDE.md`) is updated
     in the SAME diff, and if a Mermaid block changed the exports were regenerated;
   - **diagram quality (visual)** — if a Mermaid block changed, the verifier **Reads the regenerated
     PNG** (`docs/architecture/*.png`) and **FAILs on any §3 diagram-quality violation** (e.g. a whitespace /
     dead region, one component drawn as several, an unlabeled node) — §3 is authoritative;
   - **diagram ↔ policy consistency (bidirectional)** — a diagram/doc must not *assert* a behavior the
     governing policy (`CLAUDE.md`/the playbook) doesn't state, and a policy change must update the
     diagrams that depict it.
   It replies **PASS**, or **FAIL** + specific gaps. **Scale to the change** — a one-word typo gets a
   light check; a substantive change gets the full pass — but never skip it.
   - **FAIL** → fix the gaps and re-verify. ~3 rounds, then stop and surface the blocker.
   - **PASS** → continue.
4. **Ship.** Commit (author `Claude <noreply@anthropic.com>`), push the dev branch, open a PR
   (repo `msunilgarg/builtyoung`, base `main`), **verify the PR's file diff is non-empty and correct**
   (`mcp__github__pull_request_read get_files` — container resets have silently dropped commits), then:
   - **low / med risk** → squash-merge, sync `main`, re-push the dev branch so it matches.
   - **high / architectural / destructive / outward-facing / ambiguous** → leave the PR open, comment
     why it paused, and **STOP for human review** (don't merge).
5. **If the change updated a diagram, give it back.** When the diff touched a `docs/architecture/*.png`
   (a Mermaid block changed), **surface the regenerated PNG to the human** (`SendUserFile`) in the same
   turn you report the change — the diagram is the deliverable; don't make them ask "show me the diagram."

## Don't
- Don't merge without the independent verifier passing (that's the whole point).
- Don't push `main` directly; don't put internal/model identifiers in committed artifacts.
- Don't let "it's just a small direct edit" be the reason a change skips verification.
