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
- **One concern per doc — merge *fragments*, keep *concerns* separate.** Before merging two docs, ask
  "are these the same concern split across files, or two different concerns?" **Same concern fragmented →
  merge** (e.g. two engineering playbooks into one — less to keep in sync, one source of truth). **Different
  concerns → keep separate**, even if they describe the same product: messaging/voice, structure/wiring,
  and engineering *process* change for different reasons, at different cadences, and get read on different
  triggers — fusing them bloats the always-/on-demand-loaded context and couples unrelated edits. *Why it
  matters:* the verifier (and the agent) reads a doc *when its concern is in play* (copy → the voice doc;
  a diagram/module change → the structure doc); a merged doc forces reading everything for any change and
  blurs where a new rule belongs. The hub doc (`CLAUDE.md`) links them, so separation costs no
  discoverability. Test: if a one-line edit to concern A would force re-reading all of concern B, they
  shouldn't be one doc.
- **Write rules as principle + why,** so an agent can adapt them to a novel case instead of
  pattern-matching and getting it wrong.
- **A diagram or reference list must be self-explanatory — every node carries a one-line purpose.** A
  box (or list entry) that's only a *name* — a filename, a module, a service — forces the reader to
  already know the system, which defeats the artifact. Give each node a one-liner ("what it is / what it
  does"); distinguish *kinds* with color (state the color key as text, see below); group things that are
  one unit (and don't draw one component as several); and for a living diagram, give it acceptance
  criteria + a regen step so it can be *verified*, not babysat. The test: a newcomer reads it without
  asking "what's this box?" or "are these two the same thing?"
- **Labels are short, plain-English, and name the *function* — push detail to prose/the table, not the
  label.** A node or edge label is a few plain words for what the thing *does* ("pick a task, write the
  change", "loaded automatically", "fail → fix") — not a sentence, a parenthetical, or jargon. The
  "who/when/why" nuance belongs in the component table or surrounding prose, where there's room; a diagram
  is a *map*, not the manual. *Why this is its own rule:* auto-layout engines route a long edge label as a
  free-floating block, so several verbose labels **collide into an unreadable wall of text** (we shipped
  exactly that — three multi-line "spawned to READ · …" edge labels overlapping). So make the verifier's
  PNG check include **"every label is a few words AND no two labels overlap"** — a label you can't read at
  normal zoom is a defect, same as a whitespace dead-region.
- **A rendered diagram is a visual artifact — grade it visually, in the same change, against the rules
  above.** The verifier **VIEWS the regenerated image** (it can Read a PNG) and FAILs the diagram-quality
  done-conditions, just as it would a wrong label — visual quality is checked where every other change is
  gated (§4), not left to whoever happens to glance at it. The checkable conditions:
  - **Compact — no large empty regions, readable without zooming.** A whitespace defect (a big empty
    quadrant, a node you must zoom to read) is a *defect*. Mechanic: **the color key is text, not an
    in-diagram `Legend` node** — a disconnected legend box is the classic whitespace trap (auto-layout
    floats it to a corner and stretches the canvas).
  - **One component = one node.** If two boxes are really the *same* instance (e.g. one agent wearing two
    hats), draw ONE box — two boxes read as two things. This is the visual half of the "don't draw one
    component as several" rule above, made checkable.
  Both get **fixed as part of the change — never deferred back to the human as a "should I…?" question.**
  *Meta-lesson (why this bullet exists): a stated rule isn't enough — a diagram drew driver+doer as two
  boxes and shipped a "ton of whitespace" repeatedly, even though §3 already forbade both, because the
  rules lived as advice the verifier never read. The lesson isn't "add the rule" (it was there); it's
  "**a rule only holds once the verifier checks it**." The robust mechanism is **make the verifier READ
  this playbook and grade against it** — so the playbook is the single source of truth and a rule added
  here is enforced automatically. Do **not** hand-copy each rule into the loop/ship skills' checklists:
  that creates a second copy that drifts out of sync with §3 (which is exactly how the violation shipped).
  The skill's job is the *operational trigger* ("on a Mermaid change, VIEW the PNG"); the rule *content*
  lives here.*
- **Give the rendered diagram back after you change it — don't make the human ask — and hand them the
  PDF.** When a change updates a diagram, the regenerated export *is* the deliverable — surface it to the
  human as part of reporting the change (alongside the merged PR), the same turn; they shouldn't have to
  say "show me the diagram." **Default to delivering the PDF (zoomable vector), not (just) the PNG** — it
  stays crisp at any size and prints clean. (The PNG still exists for the verifier's *inline* view — it
  can Read a PNG — but the human gets the PDF.) *(Why: a diagram lives to be looked at; a text-only
  "done" hides the one artifact the change was about, and a fixed-resolution PNG is the worse copy to
  hand someone who'll zoom or print it.)*
- **Prefer fewer diagrams — fold a closely-related concept into an existing diagram, don't spawn a
  second one.** Two diagrams of the *same* system (e.g. "the loop" and "the loop, parallelized") are two
  artifacts that drift apart and double the living-doc upkeep. If a concept is a *variation* of one
  already drawn, represent it **inside** that diagram — a single annotation node — rather than as a
  separate diagram, unless it genuinely can't be shown without clutter. Make "could this be one diagram
  instead of two?" a standing question, and encode the cap as an acceptance criterion (e.g. "exactly N
  diagrams; concept X lives inside diagram Y") so the verifier blocks a re-split. *(Why: every extra
  diagram is another thing that must be kept current; one slightly-richer diagram beats two that
  disagree.)*

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
  (secrets, internal identifiers, banned patterns) rather than relying on vigilance. **This applies to
  *generated artifacts staying in sync with their source*, not just banned content** — e.g. a living
  diagram going stale: the renderer records a hash of the source, and a check (in the commit guard **and**
  CI) blocks a commit/merge where the source changed but the export wasn't regenerated. If the human keeps
  having to ask "is this regenerated / up to date?", that's the signal to replace the reminder with a
  mechanical check (the LLM verifier *noticing* is a good layer, but a deterministic guard is what earns
  trust). *Catch: a hash sync only proves export ⇄ source agree; whether the diagram matches the actual
  code/structure is still a judgment call the verifier owns — don't claim the guard covers that.*
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
  against the acceptance criteria **and this playbook's standing rules — it READS the playbook, which is
  the single source of truth, so a rule added here is enforced without editing the loop/ship skills** —
  then returns PASS or FAIL+gaps. (Fan this out in parallel per §2.)
- **A fresh-context verifier inherits NONE of the doer's auto-loaded context — so hand it everything it
  must grade against, explicitly.** This is the catch that makes the independence real *and* fragile: the
  doer's project guide and its `@imports` are auto-loaded for the doer, but the spawned verifier starts
  blank and only checks against what its spawn prompt names. So *that's how it "knows" to read a doc — you
  tell it.* Point it at: the **engineering playbook always** (portable standing rules), the **project guide
  (its House style + project-specific rules) when the diff touches the app/UI** — that's where rules like
  "optimize for less scrolling" or "no flag/emoji glyphs" live, NOT the playbook — the **copy/voice source
  of truth when the diff touches user-facing copy**, and the **architecture-doc acceptance criteria when a
  diagram/structure changed**. Miss one and the verifier grades in a vacuum — green on a diff that violates
  a rule it was never shown. (Don't assume "it'll have read CLAUDE.md" — it won't; that's the whole point.)
  Corollary: a rule must live where the verifier is told to read it — portable → playbook, project-specific
  → the project guide; the *architecture/structure* doc is for wiring, not design/copy rules.
- **Every shipped change is independently verified — regardless of how it was triggered.** Don't let a
  "direct edit" become an unverified path: verification is a property of *shipping*, not of one entry
  point. Scale the check to the change (trivial vs substantive), but never skip it.
- **Tier the model to the role — cheapen the *work*, never the *rigor*.** Spend the expensive frontier
  model where extra capability changes the outcome — **planning, architecture/design, and high-risk or
  ambiguous tasks** — and run the **bulk execution** on a cheaper, faster model: the independent
  **verifier's** re-run-and-grade and **low-risk, mechanical doer** passes. *Why:* on a fixed plan/budget,
  running everything on the top model burns quota for little marginal gain on the easy parts, while the
  verifier's job (re-run build/tests, grade a diff against explicit acceptance criteria) sits well within a
  mid-tier model's reach. You're tiering the *model*, not the *check* — a cheaper verifier still runs
  **every standing check** and the FAIL→fix retry (the §2 sibling of "parallelize the work, not the
  rigor"). The floor: don't drop the *verifier* below a solid code-grading tier — a too-weak checker that
  rubber-stamps is worse than none — and keep the *planner/doer* premium whenever the task itself is
  reasoning-hard. Name the tier by model **family/role** (the SDK's `sonnet`/`opus`/`haiku` alias), not a
  dated marketing string that ages.
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

- **2026-06-15** — §3: diagram labels must be short, plain-English, and name the *function*; push who/when/why detail to the table/prose, not the label. Verbose multi-line edge labels get routed as free-floating blocks by auto-layout and collide into an unreadable wall — so the verifier's PNG check now also fails overlapping/sentence-length labels.
- **2026-06-15** — §3: when handing a diagram back to the human, deliver the **PDF** (zoomable vector), not just the PNG — it stays crisp when zoomed/printed; the PNG remains for the verifier's inline view.
- **2026-06-15** — §3: prefer fewer diagrams — fold a closely-related concept (e.g. parallel fan-out) *into* an existing diagram as a single annotation node rather than spawning a second diagram of the same system; two diagrams of one system drift apart and double the upkeep. Encode the cap as an acceptance criterion so the verifier blocks a re-split. (Applied: merged the standalone "parallel fan-out" diagram into the loop diagram's FAN-OUT node.)
- **2026-06-14** — §4: enforce *generated-artifact currency* mechanically, not by vigilance — the renderer hashes the diagram source and a check in the commit guard + CI blocks a commit/merge where the source changed without regenerating the exports. When the human keeps asking "is this up to date?", replace the reminder with a deterministic guard. (Hash sync proves export⇄source; diagram-vs-code currency is still the verifier's judgment.)
- **2026-06-14** — §3: "one concern per doc" — merge docs that are the *same concern* fragmented (e.g. the two engineering playbooks), keep *different concerns* separate (messaging vs structure vs process) even for the same product; they change for different reasons and get read on different triggers, so fusing them bloats context and couples unrelated edits.
- **2026-06-14** — §9: the verifier must also read the **project guide** (its House style + project-specific rules) on app/UI changes, not just the portable playbook — project-specific rules (e.g. "optimize for less scrolling", "no flag/emoji glyphs") live there, so without it the verifier can't enforce them. A rule must live where the verifier is told to read it (portable → playbook, project → project guide); the architecture/structure doc is for wiring, not design/copy rules.
- **2026-06-13** — §9: a fresh-context verifier inherits none of the doer's auto-loaded context — hand it everything to grade against explicitly (playbook always; copy/voice source of truth on copy changes; arch-doc acceptance criteria on diagram changes). That's how it "knows" to read a doc — the spawn prompt tells it; it can't auto-load CLAUDE.md/@imports.
- **2026-06-13** — §3: give the rendered diagram back after a change — surface the regenerated PNG to the human as part of reporting (don't make them re-ask "show me the diagram"); the diagram is the deliverable.
- **2026-06-13** — §3/§9: the verifier **reads this playbook and grades against it** — the playbook is the single source of truth for standing rules, so a rule added here is enforced without hand-copying it into the loop/ship skills' checklists (that duplication is what drifts; the skills now carry only the *operational trigger*, the rule content lives here). Supersedes the prior "wire each rule into the checklist" framing.
- **2026-06-13** — §3: a diagram-clarity rule only holds once the verifier *checks* it — folded "one component = one node" (don't split one instance across boxes) into the standing visual check alongside compactness, after a stated-but-unchecked rule let driver+doer ship as two boxes. When you write a diagram rule, wire it into the verifier's PNG check; don't just state it.
- **2026-06-13** — §9: tier the model to the role — cheap, faster model for the bulk (the independent verifier's re-run-and-grade + low-risk mechanical doer passes), premium frontier model for planning/architecture/high-risk. Cheapen the *work*, never the *rigor* (the verifier still runs every standing check); name tiers by model family, not a dated string.
- **2026-06-12** — §3: a rendered diagram's *visual compactness* (no large empty regions, readable without zooming) is a verifier-checkable done-condition — the verifier VIEWS the regenerated PNG and FAILs whitespace defects; color key is text, never an in-diagram legend node (the classic whitespace trap). Don't defer a visual defect back to the human as a question.
- **2026-06-12** — Added §9 "Loop engineering" (folded in the portable loop-engineering principles from the retired `LOOP.md`) — one playbook for all engineering practice; project-specific loop wiring lives in the project's architecture doc + CLAUDE.md.
- **2026-06-11** — §3: diagrams/reference lists must be self-explanatory — a one-line purpose per node, kinds distinguished + legend, real relationships, and acceptance criteria so a living diagram is verified not babysat.
- **2026-06-11** — §3: strengthened the "patterned bug → standing rule" practice — record the learning in the same change AND place it where it's read at the next similar change, so the fix is implemented with that change (not rediscovered after the bug returns).
- **2026-06-11** — §3: make living-doc/diagram upkeep a *standing* check in the independent verifier (a living architecture diagram had drifted because upkeep relied on memory and per-task criteria).
- **2026-06-11** — §3: made the stale-docs rule explicitly proactive — fix docs (incl. flipping resolved "deferred/TODO" notes) in the same change, without asking permission.
- **2026-06-09** — Added the `update-playbook` skill so this doc is kept current proactively (no asking).
- **2026-06-09** — Initial version. Distilled from splitting a ~5,400-line single-file React app into
  per-feature modules, establishing the parallel-agent protocol, and wiring SessionStart/commit guards.
