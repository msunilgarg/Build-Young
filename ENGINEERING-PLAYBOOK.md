# Engineering Playbook — patterns for building with AI agents

A portable, project-agnostic guide to the practices that have worked for me building software with
Claude Code. It is **not** tied to any one repo — copy it into a new project, `@import` it from that
project's `CLAUDE.md`, or paste it into your user-global `~/.claude/CLAUDE.md` so it applies everywhere.

It's a **living document**: when we discover a new pattern (or one of these turns out to be wrong),
update it and add a line to the Changelog at the bottom.

How to read it: each section states the principle, then *why* (the failure it prevents), because the
"why" is what lets you adapt the rule instead of cargo-culting it.

---

## 1. Modularity & file structure

- **One feature = one file.** A screen, a panel, a service — its own module. Keeps each unit small
  enough to hold in one head (or one agent's context) and makes ownership obvious.
- **Don't let any file grow unbounded — and revisit the convention as the app grows.** The expensive
  mistake is rarely the *first* design; it's *not revisiting* it. A single file is genuinely faster
  early (no cross-module wiring, trivial to grep, fits one context window). The miss is letting it
  creep to thousands of lines because "it still works." Pick a soft ceiling (~1,500 lines) and treat
  crossing it as a signal to split — before it hurts, not after.
- **Separate FOUNDATION from FEATURES.** Foundation = shared, dependency-light modules everything
  imports (design tokens, UI primitives, config/client lib, pure domain logic). Features depend on
  foundation; foundation depends on nothing app-specific. This one boundary is what makes everything
  else (parallelism, testing, refactoring) possible.
- **Single source of truth.** Any logic or data used by 2+ places lives in **one** dependency-free
  module, never copy-pasted. Duplicates drift; a SoT module can't. (Bonus: a pure, dependency-free
  module is trivially unit-testable and can be shared with a server/CLI.)
- **Keep the entry/router thin.** The top-level app/router owns routing, history, persistence — not
  features. If adding a feature means editing the router, that's a smell (see §5 on hot files).
- **Don't prematurely modularize.** Splitting on day one means drawing boundaries before the app's
  shape has settled — you'll draw them wrong. Build, let it settle, then extract along the seams that
  actually emerged.

## 2. Parallel / multi-agent work

Parallel agents collide in exactly four ways; each has one rule.

1. **One feature = one file = one agent.** Assign each agent a **disjoint** set of files. If a task
   spans two feature files, give the whole vertical slice to ONE agent rather than splitting it.
   *(Prevents: two agents editing the same file → merge conflict.)*
2. **Freeze the foundation during a fan-out — the #1 rule.** Shared modules are imported by everyone,
   so a change there silently breaks every other agent's branch. During parallel work they are an
   **additive-only public API**: add an export; never change a signature, rename, or alter behavior.
   If a foundation change is truly needed, do it **first, serially, merge, then** branch the agents off
   the updated main. *(Prevents: one agent's shared-code change breaking all the others.)*
3. **Contract-first.** Before splitting, pin the seams — prop shapes, event names, function signatures,
   data contracts — in the task spec, and have each agent code *to* the contract. Agents never invent a
   shared interface mid-flight. *(Prevents: two agents independently inventing divergent versions of the
   same shared thing.)*
4. **Integration order.** Each agent works on its own branch, **rebases on latest main before opening
   its PR**, and PRs merge **one at a time**. After each merge, the next agent rebases. Keep each PR to
   its owned files. *(Prevents: a pile-up of mutually-conflicting branches at the end.)*

**Parallelize the work, not the rigor.** Each parallel agent runs the **full loop** on its slice — its own
build/test/guards **and an independent verifier** with the FAIL→fix retry — and **only a verified change
joins the one-at-a-time merge**. Fan-out spreads the *doing*; it must never become a shortcut around
verification. *(Prevents: parallel speed quietly trading away the check that keeps each change correct.)*

**Stay in your lane:** an agent that finds it needs a file it doesn't own STOPS and surfaces it to the
orchestrator instead of editing across the boundary. **Design the seams first, then parallelize** — most
parallel pain is un-agreed interfaces, not the code itself.

## 3. CLAUDE.md is the coordination layer (treat it as code)

- **Agents follow `CLAUDE.md` religiously** — that's the mechanism that makes any convention stick (and
  the same reflex that quietly perpetuates bad ones). So encode conventions *there*, not just in your
  head or one session's memory.
- **Stale docs actively cause drift — fix them in the same change, proactively.** A `CLAUDE.md` that
  still says "everything lives in one file" will make the next agent rebuild the monolith. So whenever a
  change makes a doc statement stale — a moved/renamed module, a removed step, or a **"deferred / TODO /
  until then" note the change just resolved** — update the doc (and any ARCHITECTURE/README/playbook it
  touches) *in that same change*. This is a standing chore, not a question: **don't ask permission for an
  obvious doc-sync follow-up — just do it.** An out-of-date guide is worse than none. **And it's
  bidirectional: diagram, policy/docs, and code are three views of ONE system — when a change makes any
  one of them *assert* something new, reconcile the others in the SAME change.** A diagram must never
  claim a behavior the governing policy doesn't require (the parallel diagram showed each sub-agent
  running the full loop before the protocol said so) — and a policy change must update the diagrams that
  depict it. Don't wait to be told they disagree.
- **Make living-doc upkeep a *standing check*, not a memory.** "Update the diagram in the same change"
  is itself a remember-to rule — and those get forgotten (a living architecture diagram silently drifted
  through several changes because its upkeep relied on vigilance, and the per-task verifier only graded
  each task's stated acceptance criteria, which didn't mention the diagram). Fix: make doc currency part
  of the **independent verification step's *standing* checklist** — on every change, the verifier asks
  "did this add/remove/move a module, endpoint, or route, or change the loop/ship flow? If so, is the
  architecture doc updated in the same change?" — independent of whether the task spec called for it.
  Enforce the upkeep where work is already gated, don't just intend it (see §4).
- **Every bug fix that fits a pattern becomes a rule — applied at the next similar change, not
  rediscovered.** The moment a fix generalizes to a *class* (a platform gotcha, a sharp edge, a "fine
  here / breaks there"), record the learning in the SAME change, and put it where it will be **read when
  that kind of code is next touched**: a project-specific rule in `CLAUDE.md` (or a path-scoped
  `.claude/rules/<area>.md` that loads with those files), a transferable one here. The point isn't a
  museum of past bugs — it's that the next person/agent making that kind of change **implements the
  learning as part of the change**, so the same bug never ships twice. Mechanics that make it real:
  (1) **record it the same change** (the agent re-remembers only what's committed — a fix that lived only
  in a finished session's context is gone, so the next session repeats it); (2) **place it where it
  surfaces at the point of change** (house-style / path-scoped rules beat a buried note); (3) **lean on
  the standing verifier check** where the rule is checkable. Invoke the `update-playbook` skill
  proactively the instant you spot the pattern — don't wait to be asked. (This bit us: a flag emoji that
  silently degrades to bare country letters on Windows — caught, fixed, then reintroduced because it was
  never made a rule.)
- **Keep it lean; scope the detail.** Long always-loaded docs cost context and dilute adherence. Put
  broad rules in the root doc; push file-specific lore into path-scoped rules (`.claude/rules/*.md`)
  that load only when relevant.
- **Write rules as principle + why,** so an agent can adapt them to a novel case instead of
  pattern-matching and getting it wrong.
- **A diagram or reference list must be self-explanatory — every node carries a one-line purpose.** A
  box (or list entry) that's only a *name* — a filename, a module, a service — forces the reader to
  already know the system, which defeats the artifact. Give each node a one-liner ("what it is / what it
  does"); distinguish *kinds* with color + a legend; group things that are one unit (and don't draw one
  component as several); and for a living diagram, give it acceptance criteria + a regen step so it can
  be *verified*, not babysat. The test: a newcomer reads it without asking "what's this box?" or "are
  these two the same thing?"

## 4. Workflow & shipping

- **Small, independently-shippable, test-verified increments.** Each change builds, passes tests, and
  could ship on its own. Big-bang changes are unreviewable and unbisectable.
- **Never commit to `main` directly.** Branch off the latest `main`; PR; squash-merge; sync. Enforce it
  with a settings **deny rule** on pushing to main — discipline you have to remember is discipline you'll
  eventually forget.
- **Build + test + guards before every commit.** No exceptions for "small" changes — those are where
  it bites.
- **Automate the repetitive setup.** In ephemeral/cloud environments the workspace is cloned fresh (and
  sometimes stale) each session — a **SessionStart hook** that resyncs a *clean* workspace to latest main
  (never clobbering uncommitted work) removes a whole class of "why is this on an old branch" friction.
- **Enforce, don't just document.** Conventions a human/agent must *remember* will be forgotten;
  conventions a **hook blocks** can't be. Use commit-time guards for the things that must never ship
  (secrets, internal identifiers, banned patterns) rather than relying on vigilance.
- **Reduce friction deliberately.** Allowlist the routine, safe commands (read-only git, test/build) so
  you're not approving them all day; reserve prompts for the genuinely dangerous.

## 5. Hot files (the coordination points)

Some files get touched by *every* feature even when small — the router (every screen wants a route), an
event/permission allowlist (every signal wants an entry). They become conflict points by frequency, not
size.

- **Make them data-driven and append-only.** Turn the router into a **routes registry** (a table where
  adding a screen = one appended entry), keep allowlists append-ordered. Append-at-end changes almost
  never conflict; edits threaded through the middle always do.
- Until a hot file is data-driven, treat changes to it as an **orchestrator-owned, serialized** step
  during parallel work.

## 6. Safe large / mechanical refactors

- **Move byte-identical where possible**, and **re-export from the old location** so existing importers
  (and tests) don't change. The smaller the blast radius, the safer the move.
- **Compute imports mechanically.** When extracting a block, analyze its free identifiers against a
  known list of shared symbols to build the exact import list — and run a **leftover scan**: any symbol
  the moved block references that's still defined in the origin file (and wasn't imported) is a missing
  dependency. Watch for **local shadowing** (a block defining its own `X` that also exists as a shared
  symbol — don't import that one).
- **Tests are the net; build is not enough.** Without a `no-undef` linter, a missing import is a *runtime*
  error the build won't catch. If a target area is under-tested, **add the coverage before** you
  refactor it — then the refactor's correctness is proven, not hoped.
- **Verify after every step; keep each step revertible.** One module per PR, green before moving on.

## 7. Testing

- **Co-locate tests per module.** A failing test then names exactly one owner, and an agent can verify
  its slice in isolation instead of fighting a shared mega-test file.
- **Have at least one render/integration test per feature.** It catches the runtime errors (missing
  imports, bad refs, broken wiring) that unit tests and the build miss.
- **Treat unexpected test *warnings/errors* as failures,** not noise — an "unhandled rejection" during a
  passing test is usually a real bug you haven't triggered the assertion for yet.

## 8. Security & data hygiene (defaults worth keeping)

- Secrets stay server-side / in host env vars — never in client code, commits, or logs.
- Aggregate/anonymous over identifiable wherever the feature allows; a strict server-side allowlist on
  ingested data beats trusting the client.
- Outward-facing or hard-to-reverse actions get confirmed before they run; "approved once" ≠ "approved
  forever."
- Internal/build identifiers and model strings never land in committed artifacts (enforce with a guard).

## 9. Loop engineering (drive a backlog autonomously)

Set up a project so an agent **drains a backlog without being prompted step by step** — you write goals;
a **driver** pursues them. The payoff isn't "more agents"; it's that each next step comes from a
**feedback signal**, never guesswork.

- **You write the done-condition; the loop does the rest.** A task = a goal + **acceptance criteria** +
  a risk level. The loop picks it, implements the smallest change, self-checks (build/tests/guards), has
  an **independent verifier** grade it against the criteria, ships it, marks it done, next. You only weigh
  in on ambiguity, a destructive/irreversible action, a high-risk task, or a verifier it can't satisfy.
- **The next step is a signal, not an idea.** A failing test → "fix this." The verifier's gap report →
  "not done, here's the gap." CI on an open PR → the log is the next prompt. The next backlog item → the
  next goal. So engineering the loop = engineering **clear done-conditions** + **fast feedback**; a vague
  goal or weak signal makes it spin — that's the failure mode to design against, not the agent count.
- **Split writing from checking — the doer can't grade its own homework.** The doer and a **fresh-context,
  independent verifier** must be different contexts; the verifier re-runs build/tests and grades the diff
  against the acceptance criteria, then returns PASS or FAIL+gaps. (Fan this out in parallel per §2.)
- **Every shipped change is independently verified — regardless of how it was triggered.** Don't let a
  "direct edit" become an unverified path: verification is a property of *shipping*, not of one entry
  point. Scale the check to the change (trivial vs substantive), but never skip it.
- **Risk drives autonomy.** Low/med-risk changes ship on their own; high-risk / architectural / money- or
  auth-touching / ambiguous changes are implemented but **pause for human review** before merge.
- **State lives in committed files so a fresh/ephemeral session resumes** — the backlog + progress, the
  project guide, this playbook: memory that survives container resets.
- **Trigger it however suits the moment** — a human prompt, a schedule, or an event (e.g. a labeled
  issue) — but the *procedure* is identical once started.
- **Guardrails stay on even in full auto:** never auto-merge a destructive/irreversible/outward-facing
  action without confirming; never push the main branch directly (enforce with a deny rule); never put
  internal/model identifiers in committed artifacts (enforce with a commit guard); if the verifier fails
  the same task ~3 rounds, stop and surface the blocker instead of thrashing.

---

## Meta: keeping this current

This doc is maintained by the **`update-playbook` skill** (`.claude/skills/update-playbook/`), which the
agent invokes **proactively** — when a session establishes a durable, generalizable lesson, when a rule
here proves wrong, or when you say "remember this." You shouldn't have to ask. The skill adds the entry
as *principle + why*, in the right section, and a dated Changelog line, then ships it via a PR.

When a rule proves wrong, fix it in place and note the correction — a playbook is only as good as its
honesty about what didn't work.

## Changelog

- **2026-06-12** — Added §9 "Loop engineering" (folded in the portable loop-engineering principles from the retired `LOOP.md`) — one playbook for all engineering practice; project-specific loop wiring lives in the project's architecture doc + CLAUDE.md.
- **2026-06-11** — §3: diagrams/reference lists must be self-explanatory — a one-line purpose per node, kinds distinguished + legend, real relationships, and acceptance criteria so a living diagram is verified not babysat.
- **2026-06-11** — §3: strengthened the "patterned bug → standing rule" practice — record the learning in the same change AND place it where it's read at the next similar change, so the fix is implemented with that change (not rediscovered after the bug returns).
- **2026-06-11** — §3: make living-doc/diagram upkeep a *standing* check in the independent verifier (a living architecture diagram had drifted because upkeep relied on memory and per-task criteria).
- **2026-06-11** — §3: made the stale-docs rule explicitly proactive — fix docs (incl. flipping resolved "deferred/TODO" notes) in the same change, without asking permission.
- **2026-06-09** — Added the `update-playbook` skill so this doc is kept current proactively (no asking).
- **2026-06-09** — Initial version. Distilled from splitting a ~5,400-line single-file React app into
  per-feature modules, establishing the parallel-agent protocol, and wiring SessionStart/commit guards.
