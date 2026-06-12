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
   sub-agent** (general-purpose, own context). Give it ONLY: the change's intent / acceptance + `git
   diff origin/main`. It must *independently* re-run build/tests, inspect the diff, and apply the
   **standing checks**:
   - every stated acceptance condition met, nothing obviously broken;
   - **architecture-doc currency** — if the diff adds/removes/moves/renames a module/endpoint/route/
     skill/hook or changes the loop/ship flow, `BUILD-YOUNG-ARCHITECTURE.md` (+ `CLAUDE.md`) is updated
     in the SAME diff, and if a Mermaid block changed the exports were regenerated;
   - **diagram is visually compact** — if a Mermaid block changed, the verifier **Reads the regenerated
     PNG** (`docs/architecture/*.png`) and FAILs on a large empty region or a node you must zoom to read
     (no in-diagram `Legend` node — the color key is text); a whitespace defect is a defect, not a
     human-only nicety;
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

## Don't
- Don't merge without the independent verifier passing (that's the whole point).
- Don't push `main` directly; don't put internal/model identifiers in committed artifacts.
- Don't let "it's just a small direct edit" be the reason a change skips verification.
