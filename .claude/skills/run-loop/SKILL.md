---
name: run-loop
description: Autonomously drain the Build Young task backlog (TASKS.md) — the loop-engineering driver. For each task it implements the change, runs build+tests+guards, has an INDEPENDENT verifier sub-agent grade it against the task's acceptance criteria, ships it (PR → squash-merge → sync), marks it done, and moves to the next — looping until the backlog is empty or it hits a hard floor (full auto: no per-task human confirmation). Invoke when asked to "run the loop", "work the backlog", "drain TASKS.md", or with a task id (e.g. /run-loop T2).
---

# Run the loop (autonomous backlog driver)

You are the **driver**. The user has handed you the goals (in `TASKS.md`); your job is to pursue them
without being prompted per step. The next step always comes from a **signal** — a failing test, the
verifier's gap report, or the next backlog item — never from guesswork. Read `ENGINEERING-PLAYBOOK.md` §9 (loop engineering) once for the
full picture.

## Autonomy: FULL AUTO (no per-task confirmation)
Implement → verify → **squash-merge to `main`** → next task, unattended, for **EVERY task regardless of
risk level**. The **independent verifier (step 5) is the gate — not a human.** Do **NOT** pause for review
on `risk: high`, architectural, money/refund, or outward-facing UI/copy tasks; ship them the moment the
verifier PASSes. This deliberately **overrides the playbook's default "high-risk pauses for review"** (§9)
for this project — the founder has opted into full autonomy.
- `risk` now only tunes **how thorough the verifier is** and **which docs it reads** (and keeps the premium
  model on the doer for reasoning-hard tasks) — it does **not** decide whether a human is asked.
- A task's **"Stop-and-ask if" note is downgraded to "flag-in-report"**: surface the concern in the PR body
  + the run summary (e.g. "Terms copy changed — founder's attorney should glance"), but **keep going**;
  don't block the loop on it.
- Only the **Hard floors** below ever stop the loop. When in doubt, make the smallest safe assumption,
  **write it down in the PR/report**, and proceed.

## The loop (repeat until backlog empty or a hard floor)
1. **Pick the task.** `git fetch origin main` and start from the latest `origin/main` on the dev
   branch (`claude/<branch>`), per the ship discipline. Read `TASKS.md`; take the **first `[ ]` task**
   (or the id the user named). Parse its Goal + Acceptance criteria + risk + any "Stop-and-ask if".
2. **Implement** the smallest change that satisfies the acceptance criteria — **regardless of risk level**
   (the verifier gates the merge, not a human). For an isolated feature file you may delegate to a
   worktree-isolated sub-agent; otherwise edit directly. Stay in the task's lane (don't touch unrelated
   files); if the task genuinely needs a foundation change, do that FIRST, serially, then the rest.
4. **Self-check:** `cd build-young-app && npm run build && npx vitest run`. Run the repo's guards
   (no `\uXXXX` escapes, no internal model id, no resurrected money-sim markers). If the change touched
   `BUILD-YOUNG-ARCHITECTURE.md` or `docs/architecture/`, run `bash scripts/check-architecture-current.sh`
   (diagram exports in sync — the commit guard + CI enforce this too). Fix until green.
5. **Independent verification (the doer/checker split — do not skip).** Spawn a **fresh sub-agent**
   (general-purpose, its own context) **on the cheaper verifier tier — pass the Agent tool's
   `model: "sonnet"`** (cost discipline per CLAUDE.md / playbook §9; the rigor is unchanged — don't drop
   below Sonnet for grading, a too-weak checker rubber-stamps). **A fresh sub-agent inherits NONE of your
   auto-loaded context — no `CLAUDE.md`, no `@imports` — so it only grades against what this prompt hands
   it. That's how it "knows" to read anything: you tell it.** Give it: the task's acceptance criteria +
   `git diff origin/main`, **and tell it to first READ `ENGINEERING-PLAYBOOK.md`** (portable standing
   rules — esp. **§3** diagram/doc rules and **§4** shipping rules), **`build-young-app/CLAUDE.md` when the
   diff touches the app (`src/**`/`api/**`/`public/**` or UI/copy)** — the project guide's **House style**
   (e.g. optimize for less scrolling, no flag/emoji glyphs, statistics integrity), module map, and quality
   bars, **`POSITIONING.md` when the diff touches user-facing copy** (the voice/claims source of truth),
   **and, when `BUILD-YOUNG-ARCHITECTURE.md` changed, that doc's *"Acceptance criteria for this doc"*
   section.** The playbook holds the portable engineering rules and CLAUDE.md the project-specific ones —
   the verifier grades the diff against **every rule it reads there**, so a rule added to those docs is
   enforced *without editing this skill* (that's the point: don't hand-copy rules into this checklist,
   where they drift out of sync). Then have it *independently* run `npm run build` +
   `npx vitest run`, inspect the diff, and reply **PASS** only if every acceptance criterion AND every
   standing rule is met and nothing obvious is broken, else **FAIL** with the specific gaps. The doer
   cannot grade its own homework.
   - **Operational triggers the verifier applies (these turn the playbook's standing rules into "on THIS
     diff, check Y" — the rule *content* lives in the playbook, not here):**
     - **Architecture-doc currency** — if the diff adds/removes/moves/renames a module / endpoint / route /
       skill / hook, or changes the loop/ship flow, `BUILD-YOUNG-ARCHITECTURE.md` (+ `CLAUDE.md` where
       relevant) MUST be updated in the SAME diff — **FAIL** if the structure changed but the doc didn't.
     - **Exports current** — if a `BUILD-YOUNG-ARCHITECTURE.md` **Mermaid block** changed, the regenerated
       `docs/architecture/*.png|pdf` (`scripts/render-architecture.sh`) must be in the SAME diff, and the
       verifier **Reads the regenerated PNG** and **FAILs on any §3 diagram-quality violation** (e.g. a
       whitespace / dead region, one component drawn as several, an unlabeled node) — §3 is authoritative.
     - **Diagram ↔ policy consistency (bidirectional)** — a diagram/doc must not *assert* a behavior the
       governing policy (`CLAUDE.md` / the playbook) doesn't state, and a policy change must update the
       diagrams that depict it. **FAIL** on a mismatch.
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

## Hard floors (the ONLY things that stop the loop — everything else ships after the verifier PASSes)
1. **Verification is never skipped**, and after **~3 FAIL rounds on one task** stop with the diagnosis
   (don't thrash) — skip that task and move on, or surface it if it blocks others.
2. **Never push `main` directly** — always branch → PR → **verify `get_files`** → squash-merge → sync.
3. **Never commit secrets or internal/model identifiers** (the commit guards block this anyway).
4. **A genuinely IRREVERSIBLE real-world side-effect the loop would trigger *right now*** — sending real
   email to real people, charging/refunding real money, deleting production data, rotating a live secret —
   confirm first. *(Shipping code/UI/copy/refund-MATH to the repo is reversible via another PR and is NOT
   this — it ships without asking. This floor is about runtime side-effects, not merges.)*
5. **A task that literally cannot proceed without a value only the human has** (e.g. a real Stripe link, a
   real cohort date) — make the smallest safe placeholder, **flag it in the report**, and continue; only
   hard-stop if proceeding would actually be unsafe/wrong.

Legal/Terms or other "get a human's eyes eventually" concerns are **flagged in the report, not blocked** —
the loop merges and the founder reviews async.

## Reporting
Be terse between tasks — the merged PRs are the record. Don't narrate every round. Reply only to
report the final summary, a stop condition, or a question. Refresh `TASKS.md` as you go so the file
always reflects live state. **If a shipped task changed a diagram** (a `docs/architecture/*.png`), **give
it back** — surface the regenerated PNG to the human (`SendUserFile`) when you report, don't make them ask.

## Don't
- Don't invent backlog items or "lessons"; pursue only what's in `TASKS.md`.
- Don't merge **unverified** work, and don't merge anything that trips a **Hard floor**.
- Don't pause for per-task confirmation on risk/outward-facing grounds — that's the whole point now; flag + ship.
- Don't put internal/model identifiers in commits, PRs, or code (the commit guards block this).
- Don't push `main` directly (the settings deny rule blocks it) — always branch → PR → squash-merge.
