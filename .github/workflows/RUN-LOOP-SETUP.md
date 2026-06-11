# Run loop — issue-triggered driver (setup + usage)

This is the "**anytime I add a task, it triggers the driver**" automation. Instead of editing
`TASKS.md` and typing `/run-loop`, you open a GitHub **Issue** describing the task and label it
`loop-task`. The [`run-loop.yml`](./run-loop.yml) Action then runs the same loop driver (build +
tests + guards + an independent verifier) and ships it — **except high-risk tasks, which it
implements and opens a PR for, then pauses for you.**

It's the cloud twin of the local `/run-loop` skill: same rules (`.claude/skills/run-loop/SKILL.md`
+ `LOOP.md` + `build-young-app/CLAUDE.md`), just triggered by an issue instead of a prompt.

## One-time setup (≈3 minutes)

1. **API key.** Either:
   - add an `ANTHROPIC_API_KEY` repo secret — *Settings → Secrets and variables → Actions → New
     repository secret*; **or**
   - run `/install-github-app` once (installs the Anthropic GitHub App, which manages the key).
2. **Create the label** (once, lowercase — the filter is case-sensitive):
   ```bash
   gh label create loop-task --description "Run the autonomous loop driver on this issue" --color 5319e7
   ```
3. **Activate it.** The `issues` trigger only fires once this workflow file is on the **default
   branch (`main`)** — so merge it to turn it on. No other token setup is needed: the built-in
   `GITHUB_TOKEN` already grants the PR/merge/issue scopes the Action uses.

## How to use it

Open an issue whose body uses the **same shape as a `TASKS.md` task**, then add the `loop-task`
label:

```
Title: Remove the unused lazy Charts import from App.jsx

Goal: App.jsx no longer declares `const Charts = React.lazy(...)` if nothing uses it.
Risk: low
Acceptance criteria:
- `Charts` is not referenced anywhere in src/App.jsx (only the dead import/declaration)
- npm run build succeeds; npx vitest run stays green
Files: build-young-app/src/App.jsx
```

What happens next:
- **low / med risk** → the Action implements it, verifies, opens a PR, **squash-merges**, and
  **closes the issue** with a summary comment.
- **high / architectural / destructive / outward-facing / ambiguous** → it implements on a
  branch, opens a PR, **comments why it paused, and stops**. You review and merge. It will not
  auto-merge these.

If the body omits a risk, the driver **infers it conservatively** — anything architectural,
behavioral, money/auth-related, data-deleting, or ambiguous is treated as **high** (pauses).

## Why issues (not a `TASKS.md` file-watch)
It's **recursion-proof**: the loop *closes* issues, it never *opens* them, so an automated run
can't trigger another run. The `loop-task` label is an explicit opt-in — an unlabeled issue does
nothing. `TASKS.md` + the local `/run-loop` skill still work exactly as before for hands-on runs;
this just adds a second, event-driven on-ramp.

## Guardrails (unchanged from the local loop)
- Never pushes to `main` directly; always branch → PR → squash-merge.
- High-risk / ambiguous tasks **always** pause for human review before merge.
- No internal/model identifiers in any committed artifact (the commit guards enforce this).
- If the build/tests can't go green, or the task is underspecified, it **stops and comments**
  the blocker instead of merging something half-done.
