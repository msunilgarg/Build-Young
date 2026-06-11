# Build Young — Loop Engineering

This repo is set up so an agent can **drain a backlog autonomously** instead of being prompted step
by step. You write goals; the loop pursues them. The "agent that prompts on your behalf" is the
**driver** (`/run-loop`), and it never invents your intent — it derives each next step from a
**signal** (a failing test, a verifier's gap report, the next backlog item).

## What you do vs. what the loop does
- **You (once per goal):** add a task to `TASKS.md` — a goal + acceptance criteria + a risk level.
  Review the high-risk PRs the loop pauses on. That's it.
- **The loop (every step):** pick the next task → implement → build/test/guards → an independent
  verifier checks it against the acceptance criteria → ship → mark it done → next. It only comes
  back to you on ambiguity, a destructive/irreversible action, a high-risk task, or a verifier it
  can't satisfy.

Autonomy is currently **FULL AUTO**: low/med-risk tasks are implemented, verified, and squash-merged
to `main` (the live site) on their own; the loop loops to the next task without waiting. To change
this, edit the "Autonomy" section of `.claude/skills/run-loop/SKILL.md`.

## The six components (and where each lives here)
| Component | What it is | In this repo |
|---|---|---|
| **State file** | survives between runs so the loop has memory | `TASKS.md` (backlog + progress), `CLAUDE.md` (project knowledge), `ENGINEERING-PLAYBOOK.md` (cross-project) — all committed, so they survive ephemeral container resets |
| **Skills** | reusable procedures the agent loads on demand | `/run-loop` (the driver), `/ship` (build→test→guards→PR→merge→sync), `/update-playbook` |
| **Connectors** | reach real tools | the **GitHub MCP** (issues, PRs, merge, diff verification) |
| **Sub-agents** | split *writing* from *checking* | `/run-loop` spawns a **doer** (optionally worktree-isolated) and a **fresh verifier subagent** that grades the diff in its own context — the doer can't grade its own homework |
| **Worktrees** | isolate parallel work | subagent `isolation: worktree` + the parallel-work protocol in `CLAUDE.md` (one feature = one file) |
| **Automations** | run on a trigger, not your click | the SessionStart hook (resync + reinstall commit guards = *state resurrection*), the commit guards, and — for true unattended runs — the built-in `/loop` primitive or this environment's scheduled triggers invoking `/run-loop` |

## How the next prompt is generated (the key idea)
The driver doesn't imagine steps. Each next instruction comes from a **feedback signal**:
- a **failing build/test** → the error is the next prompt ("fix this"),
- the **verifier subagent** → "not done — here's the gap" becomes the next prompt,
- **CI on an open PR** → a `<github-webhook-activity>` event wakes the session and the CI log is the
  next prompt (the "make it green" loop),
- the **backlog** → the next unchecked task in `TASKS.md` is the next *goal*.

So engineering the loop = engineering **clear done-conditions** (acceptance criteria) + **fast
feedback** (build/tests/verifier). A vague goal or weak signal makes the loop spin — that's the
failure mode to design against, not the agent count.

## Running it
- **Manually:** type `/run-loop`. It drains `TASKS.md` until empty or it hits a stop condition.
- **One task:** `/run-loop T2` runs just that task.
- **Unattended / scheduled:** use this environment's automations (or `/loop`) to invoke `/run-loop`
  on a cadence; or have it triggered by PR/CI events for the autofix loop.

## Guardrails (always on, even in full auto)
- Never auto-merge a **destructive, irreversible, or outward-facing** action without confirming.
- Never put internal/model identifiers in committed artifacts (commit guards enforce this).
- Stay on the dev branch → PR → squash-merge; never push `main` directly (settings deny rule).
- High-risk tasks **always** stop for human review before merge.
- If the verifier fails the same task ~3 rounds, stop and surface the blocker instead of thrashing.
