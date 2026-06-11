---
name: run-loop
description: Autonomously drain the Build Young task backlog (TASKS.md) — the loop-engineering driver. For each task it implements the change, runs build+tests+guards, has an INDEPENDENT verifier sub-agent grade it against the task's acceptance criteria, ships it (PR → squash-merge → sync), marks it done, and moves to the next — looping until the backlog is empty or it hits a stop condition. Invoke when asked to "run the loop", "work the backlog", "drain TASKS.md", or with a task id (e.g. /run-loop T2).
---

# Run the loop (autonomous backlog driver)

You are the **driver**. The user has handed you the goals (in `TASKS.md`); your job is to pursue them
without being prompted per step. The next step always comes from a **signal** — a failing test, the
verifier's gap report, or the next backlog item — never from guesswork. Read `LOOP.md` once for the
full picture.

## Autonomy: FULL AUTO
Implement → verify → **squash-merge to `main`** → next task, unattended. Only stop (and ask the human)
when one of the **stop conditions** below is hit. (To change this, the human edits this section.)

## The loop (repeat until backlog empty or a stop condition)
1. **Pick the task.** `git fetch origin main` and start from the latest `origin/main` on the dev
   branch (`claude/<branch>`), per the ship discipline. Read `TASKS.md`; take the **first `[ ]` task**
   (or the id the user named). Parse its Goal + Acceptance criteria + risk + any "Stop-and-ask if".
2. **Check the stop conditions FIRST** (see below). If the task is `risk: high`, ambiguous, or
   destructive/outward-facing → do NOT auto-merge; implement on a branch, open a PR, and **stop**.
3. **Implement** the smallest change that satisfies the acceptance criteria. For an isolated feature
   file you may delegate to a worktree-isolated sub-agent; otherwise edit directly. Stay in the
   task's lane (don't touch unrelated files).
4. **Self-check:** `cd build-young-app && npm run build && npx vitest run`. Run the repo's guards
   (no `\uXXXX` escapes, no internal model id, no resurrected money-sim markers). Fix until green.
5. **Independent verification (the doer/checker split — do not skip).** Spawn a **fresh sub-agent**
   (general-purpose, its own context) and give it ONLY: the task's acceptance criteria + `git diff
   origin/main`. Instruct it to *independently* run `npm run build` + `npx vitest run`, inspect the
   diff, and reply **PASS** only if every acceptance criterion is met and nothing obvious is broken,
   else **FAIL** with the specific gaps. The doer cannot grade its own homework.
   - **FAIL** → address the listed gaps and re-verify. After ~3 failed rounds on the same task,
     **stop** and surface the blocker (don't thrash).
   - **PASS** → continue.
6. **Ship** via the normal cycle: commit (author `Claude <noreply@anthropic.com>`), push the dev
   branch, open a PR (repo `msunilgarg/builtyoung`, base `main`), **verify the PR's file diff is
   non-empty and correct** (mcp__github__pull_request_read get_files — earlier commits have been
   silently dropped by container resets, so always verify), squash-merge, then sync `main` and
   re-push the dev branch so it matches (keeps the commit-verification hook quiet).
7. **Record state.** In `TASKS.md`, change the task's `[ ]` → `[x]` and move it under `## Done`
   (newest first). Commit + ship that update too (it's the durable progress marker that lets a fresh
   container resume). Then go to step 1 for the next task.
8. **When the backlog is empty:** report a one-line summary of what shipped and stop.

## Stop conditions (bounce back to the human instead of merging)
- The task is **`risk: high`** or its "Stop-and-ask if" condition is met → implement, open a PR, stop.
- The change is **destructive, irreversible, or outward-facing** (deletes data, sends email/charges,
  changes auth/money/enrollment behavior) → confirm before doing it.
- The task is **ambiguous or underspecified** — you'd be guessing at intent → ask, don't guess.
- The **verifier keeps failing** (~3 rounds) → stop with the diagnosis.
- A change would require touching files **outside the task's scope** or a foundation module in a
  breaking way → stop (see the parallel-work protocol in CLAUDE.md).

## Reporting
Be terse between tasks — the merged PRs are the record. Don't narrate every round. Reply only to
report the final summary, a stop condition, or a question. Refresh `TASKS.md` as you go so the file
always reflects live state.

## Don't
- Don't invent backlog items or "lessons"; pursue only what's in `TASKS.md`.
- Don't auto-merge anything a stop condition covers.
- Don't put internal/model identifiers in commits, PRs, or code (the commit guards block this).
- Don't push `main` directly (the settings deny rule blocks it) — always branch → PR → squash-merge.
