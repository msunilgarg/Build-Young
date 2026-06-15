# Build Young — Architecture

Two systems live in this repo, and this document maps both:

1. **The agentic engineering system** — how a goal becomes a shipped change to the live site,
   mostly without per-step prompting (the "loop"). See also [`ENGINEERING-PLAYBOOK.md`](./ENGINEERING-PLAYBOOK.md) §9 "Loop engineering".
2. **The application** — the React marketing site + enrollment + course dashboard, its serverless
   API, and the external services it talks to. See also [`build-young-app/CLAUDE.md`](./build-young-app/CLAUDE.md).

> The diagrams below are **Mermaid** — they render as real diagrams on GitHub (open this file there),
> and they're plain text so an agent can edit them in the same PR that changes the architecture.
> **Living-document rule:** any PR that adds/removes/moves a module, endpoint, skill, hook, or
> external service — or changes how the loop/ship flow works — **updates this file in the same PR.**
>
> **Node colors:** purple = an **AI agent** (dashed = an *ephemeral spawned sub-agent*), teal = **tool /
> automation**, amber = **committed state**, blue = **external service**, pink = **human**. (Kept as a
> text key rather than an in-diagram legend so the diagrams stay compact — no floating legend box.)
>
> **Rendered exports (zoomable):** [`docs/architecture/loop.pdf`](docs/architecture/loop.pdf) ·
> [`app.pdf`](docs/architecture/app.pdf) (PNG previews alongside). They're for places that don't render
> Mermaid (chat, decks, the app). **When you edit a Mermaid block here, regenerate them in the SAME
> change:** `bash scripts/render-architecture.sh`.

---

## 1. The agentic engineering system (the loop)

How work gets done here: you write a **goal** (a task), and the loop drives it to the live site —
implement → verify (independently) → ship — pausing only on the conditions noted below.

```mermaid
---
title: Build Young — Agent Harness (one loop; built to fan out to parallel sub-agents)
---
flowchart TB
    %% Labels are short + plain-English (the function); the detail lives in the table below.
    %% ① start a run — one on-ramp + the task backlog
    subgraph inputs["① Start a run"]
        direction LR
        you["You — run it locally"]
        issue["GitHub issue — run it in CI"]
        tasks[("TASKS.md — the task backlog")]
    end

    %% ② the rules — global (any repo) vs this project's
    subgraph docs["② The rules"]
        direction TB
        subgraph dglobal["🌐 Global · any repo"]
            playbook["ENGINEERING-PLAYBOOK.md — how we build<br/>• modularity & parallel work<br/>• ship: verify → PR → merge<br/>• diagram & loop rules"]
        end
        subgraph dproject["📦 This project"]
            claude["CLAUDE.md — project rules<br/>• house style + module map<br/>• quality bars: a11y · perf · security<br/>• navigation / perf invariants"]
            positioning["POSITIONING.md — copy & voice<br/>• tagline & mission<br/>• claims we make / avoid<br/>• canonical phrasings"]
        end
        playbook -. imports .-> claude
    end

    tasks ==> agent
    tasks -. "what 'done' means" .-> verifier
    dproject -. "loaded automatically" .-> agent
    docs -. "re-read to grade" .-> verifier

    %% ③ the loop
    subgraph LOOP["♻ The loop — one task at a time"]
        direction TB
        agent["Main agent<br/>pick a task, write the change"]
        check["Self-check<br/>build · tests · guards"]
        verifier["Verifier — a separate agent<br/>re-checks the work independently"]
        gate{"Low / med risk?"}
        ship["Ship<br/>PR · merge · sync"]
        record["Mark the task done"]
        agent --> check --> verifier --> gate
        verifier -. "fail → fix" .-> agent
        gate -- yes --> ship --> record
        record == "next task" ==> agent
    end
    gate -- "no — high-risk" --> pause["Pause for human review<br/>(open PR, don't merge)"]
    ship --> live["🌐 Live site"]

    %% ④ fan-out — the same loop, in parallel
    subgraph FANOUT["④ Fan-out (optional)"]
        direction TB
        sub["Parallel sub-agent<br/>same loop, own branch → merge one at a time"]
    end
    agent -. "if tasks are independent" .-> sub
    docs -. "same rules apply" .-> sub

    %% ⑤ always-on
    machinery["🛡 Always-on guards<br/>resync · commit guards · CI · worktrees"]
    machinery -. "guard every step" .-> LOOP

    %% ── visual taxonomy (color key is text, in the doc intro): agent · sub-agent · tool · state · external · human ──
    classDef agent fill:#ede7f6,stroke:#5e35b1,stroke-width:3px,color:#311b92;
    classDef subagent fill:#ede7f6,stroke:#5e35b1,stroke-width:3px,stroke-dasharray:6 3,color:#311b92;
    classDef tool fill:#e0f2f1,stroke:#00897b,stroke-width:2px,color:#004d40;
    classDef state fill:#fff8e1,stroke:#f9a825,stroke-width:2px,color:#5f4300;
    classDef ext fill:#e3f2fd,stroke:#1e88e5,stroke-width:2px,color:#0d47a1;
    classDef human fill:#fce4ec,stroke:#d81b60,stroke-width:2px,color:#880e4f;
    class agent agent;
    class verifier,sub subagent;
    class issue,machinery tool;
    class tasks,playbook,claude,positioning state;
    class you human;
    class live ext;
```

| Node | What it is / its responsibility |
|---|---|
| **Triggers** | Two on-ramps to the same driver — **use one OR the other for a given task, never both.** **Local `/run-loop`** (runs in your Claude Code on your subscription; drains the `TASKS.md` backlog) **or** the **issue-triggered GitHub Action** (`.github/workflows/run-loop.yml`, gated by the `loop-task` label, billed to Anthropic API credits; the **issue itself is the task** — it doesn't read `TASKS.md`). Same procedure once started. |
| **Durable state** | Committed files the loop reads/writes so a fresh container resumes where it stopped: `TASKS.md` (queue + done log), `CLAUDE.md` (project rules/module map), `POSITIONING.md` (copy & voice source of truth), `ENGINEERING-PLAYBOOK.md` (portable rules + §9 loop engineering). |
| **Driver + Doer** (`.claude/skills/run-loop`) | **The same agent, one context, two hats.** As *driver* it picks the first unchecked task and never guesses the next step — it comes from a **signal** (failing build/test, verifier gap, or the next backlog item); as *doer* it writes the smallest change that meets the acceptance criteria, staying in the task's file lane. (The doer *may* fan out to a **worktree**-isolated sub-agent for parallel work — the exception, not the default.) Runs on the **premium tier** — it's the planning/reasoning seat (and high-risk tasks live here); the cheaper tier is for the verifier + low-risk mechanical passes. |
| **Risk gate** | Reads the task's `risk:`. Everything is implemented; only the **merge** decision differs (see ship gate). |
| **Self-check** | `npm run build` + `npx vitest run` + repo guards (no `\uXXXX`, no internal model id, no resurrected money-sim markers). Fix until green. |
| **Verifier** | A **fresh, ephemeral sub-agent** in its own context. It **inherits none of the driver/doer's auto-loaded context** (no `CLAUDE.md`, no `@imports`) — so the spawn prompt must hand it everything: the task's acceptance criteria (`TASKS.md`) + the diff, **and an explicit instruction to read** `ENGINEERING-PLAYBOOK.md` (portable standing rules — §3 diagram/doc + §4 shipping), **`build-young-app/CLAUDE.md` when the diff touches the app/UI** (the project guide's **House style** — e.g. optimize for less scrolling, no flag/emoji glyphs, statistics integrity — plus the module map + quality bars), **and `POSITIONING.md` when the diff touches user-facing copy** (the voice/claims source of truth). A rule is enforced without editing the skills as long as it lives in the doc the verifier is told to read (portable → playbook, project-specific → CLAUDE.md). That's *how it knows to read them* — it's told, because it can't auto-load them. It independently re-runs build/tests and grades the diff against the criteria **and** those standing rules → **PASS** or **FAIL + gaps**. The doer can't grade its own homework. ~3 rounds, then stop. **Runs on the cheaper model tier** (Sonnet-class — `model: "sonnet"`): cost discipline, rigor unchanged (every standing rule + FAIL→fix retry). See [model tiering](./build-young-app/CLAUDE.md) / playbook §9. |
| **Ship** | Commit (author `Claude <noreply@anthropic.com>`) → push dev branch → open PR → **verify the PR's file diff is non-empty** → squash-merge → sync `main` and re-push the dev branch. |
| **Ship gate / Pause** | **low/med** → auto squash-merge to the live site. **high / architectural / destructive / outward-facing / ambiguous** → leave the PR open, comment why, and **stop for human review**. |
| **Machinery** | The SessionStart hook (state resurrection: resync + reinstall guards), the commit guards (incl. the **diagram-currency** check — `scripts/check-architecture-current.sh`), **CI checks** (e.g. `architecture-current` blocks a merge with a stale diagram; `landing-lean` blocks a merge that re-inflates the landing page past its T13 height ceiling), the settings allowlist (and the deny-push-to-`main` rule), the **GitHub MCP** connector, and worktrees for isolation. |

**Stop conditions** (the loop bounces back to you instead of merging): `risk: high`, a destructive/
irreversible/outward-facing action, an ambiguous/underspecified task, or a verifier that keeps
failing. Detail in [`ENGINEERING-PLAYBOOK.md`](./ENGINEERING-PLAYBOOK.md) §9 and [`.claude/skills/run-loop/SKILL.md`](./.claude/skills/run-loop/SKILL.md).

There is also a **second automation** that predates the loop: [`.github/workflows/content-integrity.yml`](./.github/workflows/content-integrity.yml)
— a weekly scheduled agent that verifies curriculum links/stats and opens a PR for human review
(it never merges).

---

## 1a. Parallel fan-out — the same harness, optimized for sub-agents

Parallelism is **not a second system** — it's the same loop, fanned out, so it lives **inside the loop
diagram above** (the **FAN-OUT** node) rather than as a separate diagram (one diagram = one artifact to
keep in sync). The loop runs **sequentially** by default (one task at a time); when several tasks are
independent, the orchestrator (the driver) spawns **parallel sub-agents**, each in its own git worktree
on its own branch, **each running THIS same doer → self-check → verifier loop**, converging on a
one-at-a-time merge.

**Each branch is the full loop, not a one-shot** — every sub-agent runs the same **doer → self-check →
verifier** cycle (with the **FAIL → fix → re-verify** retry from the main loop), just on its own slice.
**They never share a file or talk to each other** — each has its own context + git worktree. Coordination
is the **contract** (seams pinned up front) + the **serialized merge order**, not inter-agent chat.

**When the harness fans out (the decision rule):** default is **sequential**; the orchestrator parallelizes
**only when ALL hold** — (1) ≥2 tasks on **disjoint files**, (2) **no foundation change** mid-flight
(foundation changes go first, serially), (3) **no ordering dependency** between them, (4) the **contract is
pinnable** up front. Any miss → sequential. Borderline → ask the human; you can override either way. The four
guard-rails (one feature = one file · freeze the foundation · contract-first · merge one-at-a-time) live in
[`build-young-app/CLAUDE.md`](./build-young-app/CLAUDE.md) → "Parallel work protocol."

---

## 2. The application

A React 18 + Vite single-page app (`build-young-app/`) with a thin router, per-feature screen
modules, dependency-light foundation modules, and Vercel **serverless functions** under `api/` that
talk to KV and a few external services.

```mermaid
---
title: Build Young — Application Architecture
---
flowchart TB
    browser["🌐 Browser (SPA)"]

    subgraph app["build-young-app/src — React SPA"]
        appjsx["App.jsx<br/>ROUTER ONLY (~375 lines): data-driven ROUTES registry,<br/>history/scroll, persistence, hydration, legal modal"]
        subgraph screens["Screens (one feature = one file)"]
            landing["Landing.jsx"]
            about["About.jsx<br/>our story / founder essay"]
            curric["Curriculum.jsx<br/>how it works / 3 acts"]
            faq["Faq.jsx<br/>FAQ + ask a question"]
            enroll["Enroll.jsx"]
            book["BookCall.jsx"]
            platform["Platform.jsx<br/>student dashboard"]
            founder["FounderDashboard.jsx<br/>?founder console"]
            authui["auth.jsx"]
            certui["Certificate.jsx"]
            why["WhyStrip.jsx"]
            legal["Legal.jsx"]
            charts["Charts.jsx<br/>(lazy recharts)"]
        end
        subgraph foundation["Foundation (shared, dependency-light, additive-only API)"]
            funnel["funnel.js — stage/conversion math<br/>+ engagement/journeys geography (country · US-state)"]
            cohortsjs["cohorts.js — SEASONS/BATCHES"]
            coursejs["course.js · courseDates.js · courseState.js · engine.js"]
            data["theme.js · ui.jsx · lib.js · site.js · cert.js · scenarios.js · marketMedia.js"]
        end
    end

    subgraph api["build-young-app/api — Vercel serverless (12-fn cap → method-routed)"]
        funnelapi["funnel.js<br/>POST ingest (stamps geo: country/US-state) · GET founder read · PUT save · DELETE reset"]
        cohortsapi["cohorts.js — public catalog + settings"]
        stateapi["state.js — student course state"]
        authapi["auth/* — login·logout·me·request-reset·set-password"]
        emailapi["send-email.js"]
        stripeapi["stripe-webhook.js<br/>checkout.session.completed · charge.refunded"]
        cron["cron/market-news.js<br/>class reminders (daily)"]
        lib["_lib/* — kv · auth · stores · schedule ·<br/>resendAudience · scenarioAgent"]
    end

    subgraph ext["External services"]
        kv["Vercel KV<br/>(funnel events, cohorts, settings, auth, state)"]
        stripe["Stripe<br/>Payment Links + webhook"]
        resend["Resend<br/>transactional email + audiences"]
        vercel["Vercel<br/>hosting + Web Analytics"]
        anthropic["Anthropic API<br/>scenario agent (Wk9)"]
    end

    browser --> appjsx
    appjsx --> screens
    screens --> foundation
    landing -->|"Read our story"| about
    landing -->|"See the 12 weeks"| curric
    landing -->|"Read the FAQ"| faq
    landing -->|"track() events"| funnelapi
    enroll -->|"Payment Link"| stripe
    enroll & platform -->|"hydrate catalog"| cohortsapi
    platform --> stateapi
    authui --> authapi
    founder -->|"read/save"| funnelapi
    book -->|"Calendly link"| browser

    funnelapi & cohortsapi & stateapi & authapi & emailapi & stripeapi & cron --> lib
    lib --> kv
    stripeapi --> stripe
    emailapi --> resend
    lib -->|"audiences"| resend
    lib -->|"generate funnels"| anthropic
    app -.deployed on.-> vercel
    api -.deployed on.-> vercel

    %% ── same taxonomy: the Anthropic scenario-agent is an AI agent; the rest are external services / code ──
    classDef agent fill:#ede7f6,stroke:#5e35b1,stroke-width:3px,color:#311b92;
    classDef ext fill:#e3f2fd,stroke:#1e88e5,stroke-width:2px,color:#0d47a1;
    class anthropic agent;
    class kv,stripe,resend,vercel ext;
```

| Node | Responsibility |
|---|---|
| **App.jsx** | The router only — a **data-driven `ROUTES` registry** (`{key, path, title, desc, el}`) drives both the render and the URL/`<title>`, so adding a screen is one appended entry. Owns the route/history stack, scroll restore, the single-flight `navLock`, persistence/hydration, and the legal modal. New features go in their own file, never back here. |
| **Screens** | One feature per file: `Landing` (lean marketing funnel entry), `About` (`/about` — founder essay + "more than money"), `Curriculum` (`/curriculum` — 3-act "how it works" + where-the-work detail), `Faq` (`/faq` — full Q&A + ask form) — the last three were split off `Landing` to cut its scroll ~60% (T13); `Enroll` (3-step), `BookCall` (intro call), `Platform` (student dashboard + course hub), `FounderDashboard` (hidden `?founder` analytics/admin console), `auth` (login/set-password), `Certificate` (cert + public `/verify`), `WhyStrip` (social-proof strips), `Legal` (privacy/terms modal), `Charts` (lazy-loaded recharts). |
| **Foundation** | Shared, dependency-light single-sources-of-truth — imported by everything, so changes are **additive-only** during parallel work: `funnel.js` (stage/conversion/revenue math + traffic geography — country & US-state), `cohorts.js` (`SEASONS`/`BATCHES`), `course*.js`/`engine.js` (curriculum + week progression), `theme/ui/lib/site/cert/scenarios/marketMedia`. |
| **api/funnel.js** | One method-routed endpoint (Hobby 12-function cap): **POST** public event ingest, **GET** founder funnel read, **PUT** saves cohorts/allowlist/settings, **DELETE** resets a test account. Non-POST requires a founder session. |
| **api/cohorts.js** | Public read of the live catalog (`batches`, `checkins`, `settings`) so clients hydrate cohorts + site settings without a redeploy. |
| **api/state.js · auth/\*** | Student course state; account auth (login/logout/me/reset/set-password) — founder gating via `FOUNDER_EMAILS`. |
| **api/stripe-webhook.js** | Enrollment lifecycle: `checkout.session.completed` adds the student (+ Resend audience); `charge.refunded` removes enrollment + audience contact. |
| **api/cron/market-news.js** | Daily cron — a "prepare for next week" class reminder 2 days before each class (NOT a market-news drip; that was removed). |
| **api/_lib/\*** | Server internals: `kv` (Vercel KV client), `auth`, the KV-backed stores, `schedule`, `resendAudience`, and `scenarioAgent` (calls the Anthropic API to generate Week-9 practice funnels; key stays server-side, founder-toggleable). |
| **External services** | **Vercel KV** (all persisted state), **Stripe** (Payment Links + webhook), **Resend** (email + broadcast audiences, key-gated/best-effort), **Vercel** (hosting + cookieless Web Analytics), **Anthropic API** (the scenario agent). Secrets stay env-only. |

For deeper detail on any node, see [`build-young-app/CLAUDE.md`](./build-young-app/CLAUDE.md) (module map,
quality bars, navigation/perf invariants) and [`ENGINEERING-PLAYBOOK.md`](./ENGINEERING-PLAYBOOK.md) §9 (loop engineering).

---

## Acceptance criteria for this doc (so changes can be *verified*, not just eyeballed)

The "done" conditions for any change to `BUILD-YOUNG-ARCHITECTURE.md` — most are objectively checkable (by the
loop's verifier or a grep), which is what keeps diagram edits from turning into back-and-forth:

- **Both layers present:** the agentic loop AND the app, each with a Mermaid diagram + a component table.
- **Exactly TWO Mermaid diagrams — the loop and the app; NEVER a separate parallel diagram.** Parallel
  fan-out is the *same* loop fanned out, so it is represented **inside the loop diagram** (the FAN-OUT
  node) + described in the §1a prose — not as a third diagram. One diagram = one artifact to keep in
  sync; a second one drifts. If you're tempted to add a parallelism diagram, add/extend the fan-out node
  instead. (The renderer expects two blocks, in order: loop, app.)
- **Rule docs shown in two tiers — global vs project-specific.** The loop diagram groups the governing
  docs into **🌐 GLOBAL / portable** (`ENGINEERING-PLAYBOOK.md`) and **📦 PROJECT-SPECIFIC** (`CLAUDE.md`,
  `POSITIONING.md`), and draws the **`@imported by`** edge (CLAUDE.md @imports the playbook). A reader must
  see *which rules travel to any repo vs which are this project's* at a glance — not one undifferentiated
  "docs" blob. **Each rule-doc node lists 2–4 terse key bullets of what it governs** (its scope), so the
  reader sees what each doc is *for* without opening it.
- **Context-loading is explicit — every agent shows where its rules come from.** The diagram draws: the
  rules **"loaded automatically"** into the **doer**, **"re-read to grade"** into the **verifier**, and
  **"same rules apply"** into the **fan-out** sub-agent. **No agent box is contextless** — a spawned agent
  with no rules edge is a defect, fix it. (The *nuance* — doer auto-loads project + playbook via @import;
  the fresh verifier re-reads the playbook always and CLAUDE/POSITIONING only when the diff touches
  app/copy — lives in the **table**, NOT on the edges; keep the edge labels to a few words.)
- **Labels are short, plain English, and name the function.** Every node/edge label is a few plain words
  for what the thing *does* (e.g. "pick a task, write the change", "loaded automatically", "fail → fix"),
  not a sentence or parenthetical pile-up. Detail goes in the component **table**, never crammed onto a
  label. **In the rendered PNG, labels must not overlap or collide** — if they do, shorten them or cut
  edges. A label you can't read at normal zoom is a defect (this is what turned an earlier version into a
  wall of colliding text). (Exception: a **reference node** — e.g. each rule-doc box — may carry a few
  terse bullets naming its scope; that's node *content*, not a verbose edge/connector label.)
- **No hanging or doubled edges.** Every edge connects two real nodes with a clear arrowhead; no line
  trails into empty space, and don't run **two edges between the same pair** (e.g. both `inputs→agent`
  and `tasks→agent`) — they cross and read as a "hanging" line. One edge per relationship.
- **The loop reads as a loop:** the loop diagram has the explicit return edge closing `record → agent`
  (plus the verifier→agent FAIL retry) — not a top-to-bottom pipeline.
- **Visual taxonomy:** agents, ephemeral sub-agents, tools/automation, committed state, external
  services, and humans are styled distinctly (the `classDef`s). The color meaning is stated once as a
  **text key** in the intro — *not* as an in-diagram `Legend` subgraph (a disconnected legend node is a
  whitespace trap: dagre floats it off to one side and stretches the canvas, leaving a large empty
  quadrant). Keep the key out of the diagram.
- **Compact — no large empty regions, readable without zooming.** When you change a Mermaid block,
  **VIEW the regenerated PNG** (the verifier does this — it can Read the image) and confirm the content
  fills the frame: no big empty quadrant, no disconnected node stretching the canvas, no need to zoom to
  read a node. If there's a dead region, fix the cause (most common: a disconnected/`~~~`-chained node,
  or `LR` where `TB` packs tighter) — don't ship it and don't defer it to a human to flag. This is a
  *done-condition*, not a nicety.
- **The verifier shows its inputs:** the diff (from the doer) AND the acceptance-criteria source (`TASKS.md`).
- **Exports current (mechanically enforced):** `docs/architecture/*.png|pdf` were regenerated from these
  Mermaid blocks in the SAME change (`scripts/render-architecture.sh`) and render with no Mermaid syntax
  error. This isn't left to memory: the renderer records a hash of the Mermaid source, and
  `scripts/check-architecture-current.sh` (run by the **commit guard** and the **`architecture-current`
  CI check**) **blocks** a commit/merge where the source changed but the exports weren't regenerated.
- **Cross-linked:** links to `CLAUDE.md` / `ENGINEERING-PLAYBOOK.md` for depth.

Almost everything above is checkable — by a grep, a re-render, or the verifier **viewing the PNG** —
so the loop grades a diagram change (including its visual compactness) instead of bouncing it to you.
The only bit that still needs a human eye is the subjective "is the *story* right?"
