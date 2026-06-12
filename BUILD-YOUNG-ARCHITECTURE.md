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
> **Node colors (see the Legend in each diagram):** purple = an **AI agent** (dashed = an *ephemeral
> spawned sub-agent*), teal = **tool / automation**, amber = **committed state**, blue = **external
> service**, pink = **human**.
>
> **Rendered exports (zoomable):** [`docs/architecture/loop.pdf`](docs/architecture/loop.pdf) ·
> [`parallel.pdf`](docs/architecture/parallel.pdf) · [`app.pdf`](docs/architecture/app.pdf) (PNG previews alongside). They're for places that don't render
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
    %% ① start a run — pick ONE on-ramp (detail in the table below)
    subgraph onramps["① Start a run — ONE on-ramp (this OR that, never both)"]
        direction LR
        you["You · /run-loop locally<br/>(drains the TASKS.md backlog)"]
        issue["GitHub Issue + 'loop-task' → Action<br/>(the issue IS the task; no TASKS.md)"]
    end
    tasks[("② TASKS.md · backlog")]
    docs["③ Governing docs (context)<br/>CLAUDE.md — auto-loaded, @imports ENGINEERING-PLAYBOOK.md<br/>(playbook §9 = loop engineering) · POSITIONING.md — read on demand"]

    onramps --> driver
    tasks ==> driver
    tasks -. "acceptance criteria" .-> verifier
    docs -. context .-> driver

    subgraph LOOP["♻ THE LOOP — one task at a time (until the backlog is empty or a stop condition)"]
        direction TB
        subgraph mainagent["MAIN AGENT · one context (driver + doer = the SAME agent)"]
            direction LR
            driver["DRIVER · picks the next task<br/>(next step = a signal, never a guess)"]
            doer["DOER · writes the smallest change<br/>↳ can fan out to parallel sub-agents"]
        end
        check["Self-check · build · tests · guards"]
        verifier["VERIFIER · a SEPARATE ephemeral sub-agent (own context)<br/>grades the diff vs the acceptance criteria"]
        gate{"low / med risk?"}
        ship["SHIP · PR → verify → squash-merge → sync"]
        record["mark [x] in TASKS.md"]
        driver --> doer --> check --> verifier --> gate
        verifier -. "FAIL → fix the gaps" .-> doer
        gate -- "yes" --> ship --> record
        record == "↻ next task" ==> driver
    end

    gate -- "no · high-risk / ambiguous" --> pause["⏸ PAUSE for human · open PR, don't merge"]
    ship --> live["🌐 Live site (Vercel)"]
    machinery["🛡 Always-on machinery · SessionStart resync · commit guards ·<br/>settings allowlist · GitHub MCP · worktrees"]
    machinery -. guards every step .-> LOOP

    %% ── visual taxonomy (see Legend): agent · sub-agent · tool · state · external · human ──
    classDef agent fill:#ede7f6,stroke:#5e35b1,stroke-width:3px,color:#311b92;
    classDef subagent fill:#ede7f6,stroke:#5e35b1,stroke-width:3px,stroke-dasharray:6 3,color:#311b92;
    classDef tool fill:#e0f2f1,stroke:#00897b,stroke-width:2px,color:#004d40;
    classDef state fill:#fff8e1,stroke:#f9a825,stroke-width:2px,color:#5f4300;
    classDef ext fill:#e3f2fd,stroke:#1e88e5,stroke-width:2px,color:#0d47a1;
    classDef human fill:#fce4ec,stroke:#d81b60,stroke-width:2px,color:#880e4f;
    class driver,doer agent;
    class verifier subagent;
    class issue,machinery tool;
    class tasks,docs state;
    class you human;
    class live ext;
    style mainagent fill:#f6f1fb,stroke:#5e35b1,stroke-width:1px,color:#311b92;

    subgraph legend["Legend"]
        direction LR
        lgA["AI agent (one context: driver + doer)"]:::agent
        lgS["separate ephemeral sub-agent (verifier)"]:::subagent
        lgT["tool / automation"]:::tool
        lgD["committed state"]:::state
        lgE["external service"]:::ext
        lgH["human"]:::human
        lgA ~~~ lgS ~~~ lgT ~~~ lgD ~~~ lgE ~~~ lgH
    end
```

| Node | What it is / its responsibility |
|---|---|
| **Triggers** | Two on-ramps to the same driver — **use one OR the other for a given task, never both.** **Local `/run-loop`** (runs in your Claude Code on your subscription; drains the `TASKS.md` backlog) **or** the **issue-triggered GitHub Action** (`.github/workflows/run-loop.yml`, gated by the `loop-task` label, billed to Anthropic API credits; the **issue itself is the task** — it doesn't read `TASKS.md`). Same procedure once started. |
| **Durable state** | Committed files the loop reads/writes so a fresh container resumes where it stopped: `TASKS.md` (queue + done log), `CLAUDE.md` (project rules/module map), `POSITIONING.md` (copy & voice source of truth), `ENGINEERING-PLAYBOOK.md` (portable rules + §9 loop engineering). |
| **Driver + Doer** (`.claude/skills/run-loop`) | **The same agent, one context, two hats.** As *driver* it picks the first unchecked task and never guesses the next step — it comes from a **signal** (failing build/test, verifier gap, or the next backlog item); as *doer* it writes the smallest change that meets the acceptance criteria, staying in the task's file lane. (The doer *may* fan out to a **worktree**-isolated sub-agent for parallel work — the exception, not the default.) |
| **Risk gate** | Reads the task's `risk:`. Everything is implemented; only the **merge** decision differs (see ship gate). |
| **Self-check** | `npm run build` + `npx vitest run` + repo guards (no `\uXXXX`, no internal model id, no resurrected money-sim markers). Fix until green. |
| **Verifier** | A **fresh, ephemeral sub-agent** in its own context, given only **the task's acceptance criteria (from `TASKS.md`) + the diff**. It independently re-runs build/tests and returns **PASS** or **FAIL + gaps**. The doer can't grade its own homework. ~3 rounds, then stop. |
| **Ship** | Commit (author `Claude <noreply@anthropic.com>`) → push dev branch → open PR → **verify the PR's file diff is non-empty** → squash-merge → sync `main` and re-push the dev branch. |
| **Ship gate / Pause** | **low/med** → auto squash-merge to the live site. **high / architectural / destructive / outward-facing / ambiguous** → leave the PR open, comment why, and **stop for human review**. |
| **Machinery** | The SessionStart hook (state resurrection: resync + reinstall guards), the commit guards, the settings allowlist (and the deny-push-to-`main` rule), the **GitHub MCP** connector, and worktrees for isolation. |

**Stop conditions** (the loop bounces back to you instead of merging): `risk: high`, a destructive/
irreversible/outward-facing action, an ambiguous/underspecified task, or a verifier that keeps
failing. Detail in [`ENGINEERING-PLAYBOOK.md`](./ENGINEERING-PLAYBOOK.md) §9 and [`.claude/skills/run-loop/SKILL.md`](./.claude/skills/run-loop/SKILL.md).

There is also a **second automation** that predates the loop: [`.github/workflows/content-integrity.yml`](./.github/workflows/content-integrity.yml)
— a weekly scheduled agent that verifies curriculum links/stats and opens a PR for human review
(it never merges).

---

## 1a. Parallel fan-out — the same harness, optimized for sub-agents

The loop above runs **sequentially** (one task at a time). But the architecture is **built to fan out**:
when several tasks are independent, the orchestrator runs them as **parallel sub-agents**, each in its
own git worktree, converging on a one-at-a-time merge.

```mermaid
---
title: Parallel fan-out — each sub-agent runs its OWN doer↔verifier loop
---
flowchart TB
    orch["ORCHESTRATOR (the driver) · splits work into disjoint slices ·<br/>pins the contract · freezes the foundation (additive-only)"]
    orch --> da
    orch --> db
    orch --> dc

    subgraph A["sub-agent A · worktree · branch claude/feat-a · files {X}"]
        direction TB
        da["DOER · writes the change"]
        va["self-check + VERIFIER<br/>(its own ephemeral sub-agent)"]
        da --> va
        va -. "FAIL → fix the gaps (↺ retry)" .-> da
    end
    subgraph B["sub-agent B · worktree · branch claude/feat-b · files {Y}"]
        direction TB
        db["DOER · writes the change"]
        vb["self-check + VERIFIER<br/>(its own ephemeral sub-agent)"]
        db --> vb
        vb -. "FAIL → fix the gaps (↺ retry)" .-> db
    end
    subgraph C["sub-agent C · worktree · branch claude/feat-c · files {Z}"]
        direction TB
        dc["DOER · writes the change"]
        vc["self-check + VERIFIER<br/>(its own ephemeral sub-agent)"]
        dc --> vc
        vc -. "FAIL → fix the gaps (↺ retry)" .-> dc
    end

    va == "PASS → PR" ==> merge
    vb == "PASS → PR" ==> merge
    vc == "PASS → PR" ==> merge
    merge["INTEGRATION · each rebases on main ·<br/>PRs squash-merge ONE at a time"]
    merge --> main["🌐 main / live site"]

    classDef agent fill:#ede7f6,stroke:#5e35b1,stroke-width:3px,color:#311b92;
    classDef subagent fill:#ede7f6,stroke:#5e35b1,stroke-width:3px,stroke-dasharray:6 3,color:#311b92;
    classDef tool fill:#e0f2f1,stroke:#00897b,stroke-width:2px,color:#004d40;
    classDef ext fill:#e3f2fd,stroke:#1e88e5,stroke-width:2px,color:#0d47a1;
    class orch,da,db,dc agent;
    class va,vb,vc subagent;
    class merge tool;
    class main ext;
```

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
    subgraph legendB["Legend"]
        direction LR
        lbA["AI agent"]:::agent
        lbE["external service"]:::ext
        lbC["app / api code = default"]
        lbA ~~~ lbE ~~~ lbC
    end
```

| Node | Responsibility |
|---|---|
| **App.jsx** | The router only — a **data-driven `ROUTES` registry** (`{key, path, title, desc, el}`) drives both the render and the URL/`<title>`, so adding a screen is one appended entry. Owns the route/history stack, scroll restore, the single-flight `navLock`, persistence/hydration, and the legal modal. New features go in their own file, never back here. |
| **Screens** | One feature per file: `Landing` (marketing), `Enroll` (3-step), `BookCall` (intro call), `Platform` (student dashboard + course hub), `FounderDashboard` (hidden `?founder` analytics/admin console), `auth` (login/set-password), `Certificate` (cert + public `/verify`), `WhyStrip` (social-proof strips), `Legal` (privacy/terms modal), `Charts` (lazy-loaded recharts). |
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
- **No invented nodes:** every node maps to a real artifact in the repo (module / endpoint / skill /
  hook / external service); names match the code.
- **The loop reads as a loop:** the loop diagram has the explicit return edge closing `record → driver`
  (plus the verifier→doer FAIL retry) — not a top-to-bottom pipeline.
- **Visual taxonomy + legend:** agents, ephemeral sub-agents, tools/automation, committed state,
  external services, and humans are styled distinctly (the `classDef`s), and each diagram carries a Legend.
- **The verifier shows its inputs:** the diff (from the doer) AND the acceptance-criteria source (`TASKS.md`).
- **Exports current:** `docs/architecture/*.png|pdf` were regenerated from these Mermaid blocks in the
  SAME change (`scripts/render-architecture.sh`) and render with no Mermaid syntax error.
- **Cross-linked:** links to `CLAUDE.md` / `ENGINEERING-PLAYBOOK.md` for depth.

The only genuinely subjective bit — "is it *clear*?" — is the one thing that needs a human eye;
everything above is checkable, so the loop can grade a diagram change instead of bouncing it to you.
