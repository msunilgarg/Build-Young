# Spec: Teach the build loop — Spec → Build → Check → Ship (the method behind Build Young)

> One feature = one short spec. Keep it to a page (this one runs longer because it spans the course —
> the week-by-week change map is the point). Decisions go here; PRs implement them.

**Status:** approved
**Owner:** Sunil Garg
**Date:** 2026-06-22

> **Approved 2026-06-22** (founder sign-off). Decisions captured: (1) named **"The Agentic Engineering
> Process"** (steps Spec → Build → Check → Ship); (2) the Check agent uses **Build Young's own
> `ANTHROPIC_API_KEY`** — students bring none; (3) the project-brief doc + dogfooding showcase are
> **deferred** to their own specs; (4) the Check step is a **non-gating optional button**; and the Check
> step gets its **own `reviewModel`** setting (separate from `scenarioModel`) for independent cost control.

## What
Make the **engineering method Build Young is itself built with** an explicit, named, taught through-line
of the course — **The Agentic Engineering Process**, taught as its four steps **Spec → Build → Check →
Ship.** Two core additions — (1) name the process and teach it as a reflex across the existing weeks, and
(2) give students a real **"Check my work"** AI step (an *independent* review pass) that mirrors the
independent verifier that gates every change in this repo. Plus a sharpened **"Done when…"
acceptance-criteria** field at the spec step. Project-brief doc + a "how this program is built" dogfooding
showcase are named follow-ons (out of scope here).

**Naming:** the method is **"The Agentic Engineering Process"** everywhere it's named (the primer title,
act heads, capstone framing); **Spec → Build → Check → Ship** are its four steps.

## Why
The product already has students build with AI; what it doesn't yet teach is the *discipline* pros use to
trust what AI builds — decide "done" up front, get an **independent** check, ship small verified slices.
That discipline is exactly the loop in `ENGINEERING-PLAYBOOK.md` §9 that produces this very app. Teaching
it is on-voice (POSITIONING: *taste + how builders actually work*, **not** coding), differentiated, and
unusually credible because of **dogfooding** — "the way you'll learn to build is how the thing you're
learning on was built." The "Check my work" agent in particular teaches "you can't grade your own homework"
better than any lecture, and the plumbing already exists (the Week-9 scenario agent).

## Users & trigger
**Enrolled student**, inside the course dashboard (`Platform`), week by week. The "Check my work" step is
student-initiated (a button, like Week 9's "Simulate more advanced scenarios"). Founder controls whether
the agent is on (console toggle), exactly like the scenario agent.

## The loop, and where each step is taught (week callouts)

Build Young runs **12 lessons** (`src/course.js` `WEEKS`, index 0 = Lesson/Week 1). The loop maps onto the
existing arc — we are **adding a teaching layer + one new step, not restructuring the course**:

| Loop step | Week(s) | Existing surface (today) | Change we make |
|---|---|---|---|
| **(frame)** Name the process | **Week 1** — *Find a Problem Worth Solving* (`BuildPlan`) | week-1 plan + `ExampleCard` | Add a short **"The Agentic Engineering Process"** primer naming its four steps **Spec → Build → Check → Ship**, reused (one shared component) and referenced at the head of each act. |
| **Spec** (write the done-condition) | **Week 2** — *Shape the Idea — write your spec* (`ShapePlan`, `s.shape`) | spec fields incl. `success` ("What success looks like") | Add an explicit **"Done when…" acceptance-criteria** field (`s.shape.acceptance`, a short checklist) — sharper and more checkable than the `success` vision line; this is what the Check step grades against. |
| **Build** (make the slice) | **Weeks 3–6** (`BuildLayer` 3·4·5·6) **+ Week 8** (`BuildLayer` 8, the funnel) | per-week copy-to-Claude build prompt | No behavior change to building itself — these weeks gain the **Check step below**. |
| **Check** (independent review) ⭐ | **Weeks 3–6 + Week 8** (inside `BuildLayer`) | — (new) | Add a **"Check my work"** step: the student pastes what they built; an **independent** Claude pass grades it against *their* Week-2 acceptance criteria and returns **strengths + gaps + a pass/needs-work verdict**. Result saved to `s.review[week]`. Mirrors the repo's verifier. |
| **Ship** (release the slice) | **Week 7** — *Go Live* (`GoLiveChecklist`, `s.golive`) | the go-live checklist | No new mechanics — add copy that **names this the "Ship" step** of the loop, closing the cycle. |
| **(reinforce)** Tell the build story via the loop | **Week 11** — *Prepare Your Capstone* | capstone prep | Frame the capstone narrative around Spec → Build → Check → Ship (copy-level). *(Project-brief doc = follow-on.)* |

> The headline new capability is the **Check step (Weeks 3–6 + 8)**. Everything else is naming/copy + one
> spec field, so the loop becomes a felt reflex rather than a lecture.

## Behavior — the "Check my work" step
- A button in `BuildLayer` (Weeks 3,4,5,6,8). On click: `POST /api/funnel?resource=review` with
  `{ week, spec (that week's `s.shape` field), acceptance (`s.shape.acceptance`), built (student-pasted) }`.
- Server (`api/_lib/reviewAgent.js`, mirroring `scenarioAgent.js`): calls Claude with **Build Young's own
  `ANTHROPIC_API_KEY`** — the **same** host env var the Week-9 scenario agent already uses, kept
  **server-side only**. **Students never bring or enter an API key**; the founder sets it once and both
  student agents work. Output is run through a `sanitizeReview` allowlist → `{ verdict: "pass"|"gaps",
  strengths: string[], gaps: string[] }` (capped counts/lengths) so a bad model reply can't reach the UI.
- **Founder-controlled + key-gated**, same as scenarios: private ops `reviewAgentEnabled` (default true) +
  `reviewModel` (family-named default `claude-haiku-4-5`; options Haiku/Sonnet/Opus); no key or disabled ⇒
  a **local deterministic fallback** ("every acceptance item addressed?" heuristic) so the step still
  teaches offline, never an error. Student-initiated, unauthenticated (like the scenarios POST). No PII.
- Result rendered as a calm strengths/gaps card and stored in `s.review[week]` (persists with course state).

## Done when (acceptance)
- [ ] **Week 1** shows a named **Spec → Build → Check → Ship** primer (one shared component), reused at each act head.
- [ ] **Week 2** spec captures explicit **acceptance criteria** (`s.shape.acceptance`); a worked example is shown; it persists in `s.shape`.
- [ ] **Weeks 3–6 + 8**: a **"Check my work"** button runs an independent review and renders strengths/gaps + verdict; result saved to `s.review[week]`.
- [ ] `POST /api/funnel?resource=review` + `api/_lib/reviewAgent.js` exist; output is `sanitizeReview`-clamped; `ANTHROPIC_API_KEY` stays server-side; disabled/no-key ⇒ local fallback, never a thrown error.
- [ ] Founder console exposes a **review-agent on/off + model** control (sibling of `ScenarioAgentEditor`); `saveOps` merge preserves `notifyEmail`/scenario settings.
- [ ] **Week 7** Go Live copy names the **"Ship"** step; **Week 11** capstone-prep copy frames the story as the loop.
- [ ] Tests: `reviewAgent` pure helpers (prompt build, `sanitizeReview`, local fallback) + a `Platform` render test that the Check step renders a verdict from a mocked agent reply + a `settings-store` case for the new ops fields. Build + tests green.
- [ ] Copy checked against **POSITIONING.md** (us/we voice; "build with AI, not coding"); `CLAUDE.md` curriculum section + `BUILD-YOUNG-ARCHITECTURE.md` (new endpoint resource + `reviewAgent` module) updated in the same PRs.

## Out of scope (named follow-ons)
- **Project-brief doc** (a kid-sized `CLAUDE.md` the student maintains + feeds their AI) — Week 11 reinforcement; spec separately.
- **Dogfooding showcase page** ("how Build Young itself is built with this loop") — marketing surface; spec separately.
- **No git/PR/CI mechanics taught** — high schoolers learn the *habits*, not the tooling.
- No change to lesson count, pacing, refund, or progression logic.

## Surfaces & sources of truth
- Copy/voice → **POSITIONING.md** (all new student-facing copy).
- Curriculum mechanics/gotchas (build layers, `s.shape`, the scenario-agent pattern we mirror) → **CLAUDE.md**.
- Touches: `src/course.js` (none — same weeks), `src/Platform.jsx` (`BuildLayer`, `ShapePlan`, a new loop primer + Check card), `src/engine.js` (`s.shape.acceptance`, `s.review`), `api/funnel.js` (POST `?resource=review`), new `api/_lib/reviewAgent.js`, `api/_lib/settingsStore.js` (`reviewAgentEnabled`/`reviewModel`), `src/FounderDashboard.jsx` (toggle), tests, `CLAUDE.md`, `BUILD-YOUNG-ARCHITECTURE.md`.

## Proposed task breakdown (phased; each independently shippable)
- **T37 · Name the process — "The Agentic Engineering Process" (Week 1 primer + shared framing)** — copy/UI. risk: low.
- **T38 · Week 2 spec gains "Done when…" acceptance criteria (`s.shape.acceptance`)** — UI + state. risk: med.
- **T39 · "Check my work" review agent (server: `reviewAgent.js` + POST `?resource=review` + ops toggle + local fallback; uses Build Young's own `ANTHROPIC_API_KEY` — the same one as the scenario agent; students bring nothing)** — agent/API, mirrors scenarios. risk: med.
- **T40 · Wire the Check step into `BuildLayer` (Weeks 3–6, 8) + `s.review` + render** — UI. risk: med. (depends on T38/T39)
- **T41 · Ship/loop framing copy (Week 7 Go Live + Week 11 capstone prep)** — copy. risk: low.

## Risks / open questions
- **Per-student AI cost is borne by Build Young** (the founder's `ANTHROPIC_API_KEY`, not the student's) — the Check step adds student-initiated Claude calls across 5 build weeks. Mitigate: cheap family-named default model (Haiku), founder on/off toggle, local fallback, and (open) a soft per-student rate limit if volume warrants.
- **Kids reading an AI "verdict"** — keep it encouraging/constructive (strengths first, gaps as next steps), never a harsh grade; `sanitizeReview` enforces shape, copy enforces tone (POSITIONING review).
- **Don't overload Act 1** — the Check step must stay one calm optional button, not a gate on progression (progression logic is untouched).
- **Resolved (approved):** the Check step gets its **own `reviewModel`** ops setting, separate from `scenarioModel`, so its cost can be tuned independently.
