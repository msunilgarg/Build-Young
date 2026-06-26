# Spec: Teach steering & knowing when to stop (the "is it going somewhere?" skill)

> One feature = one short spec. Decisions go here; the PR implements them.

**Status:** draft
**Owner:** Sunil Garg
**Date:** 2026-06-26

## Why
The course teaches the clean loop — **Spec → Build → Check → Ship** — but not the *messy* reality between Build
and Check: **a build attempt that's going nowhere.** The AI starts thrashing — re-doing the same thing,
apologizing and retrying in circles, scope drifting — and the beginner's instinct is to keep typing "no, fix
it," which usually adds fuel. Knowing **when a build is converging vs. spinning, and what to do when it's
spinning**, is the single highest-leverage agentic skill, and right now we're silent on it.

It's also the durable core of the "new engineer" thesis (the cost of an engineer is comp **plus the tokens they
burn**): the valuable muscle isn't typing faster, it's **planning + evaluation + knowing when to stop or
redirect** so effort doesn't go in circles. We teach the planning half (Spec) and the evaluation half (Check);
this fills the gap between them. **Framing matters:** the lesson is *plan → judge → redirect*, not "be cheap
with tokens." Cost is the **motivating hook** ("every spin is real time and money — yours, and a real
company's"), not the metric we drill — telling a teenager to minimize spend breeds timidity, not judgment.

## What
A short, named teaching beat: **"Is it going somewhere?"** — steering a build and knowing when to stop. It
complements the **④ Check** step (Check grades a *finished* slice; this is about reading an *in-progress* one).

### 1. The signal — converging vs. spinning
Teach the tell, in plain language:
- **Converging:** each round gets *closer* — errors shrink, the changes get smaller and more on-target, you can
  still follow what it's doing.
- **Spinning:** the same error keeps moving around instead of shrinking; it re-writes things that already
  worked; scope creeps; it "apologizes and tries again" in a loop; **you've lost the thread of what it's doing.**

### 2. The moves when it's spinning (the steer/stop playbook)
1. **Stop** — don't fire another "no, fix it." More prompts on a confused context usually make it worse.
2. **Re-read your spec** — a spin is almost always a *fuzzy spec*. Is "done" actually clear and small?
3. **Sharpen or shrink** — give it ONE concrete failing example, or split the work into a smaller slice.
4. **Reset the context** — if it's truly gone in circles, start fresh with the sharpened, smaller spec rather
   than digging the same hole deeper.
5. **Capture it as an Engineering rule** (SPECS/021) — so next time you spot the spin sooner.

### 3. Read what the AI is good at (quick capability check)
Hand off *whole* the things it's reliably good at (boilerplate, wiring, standard patterns); **break down and
spec tightly** the novel, ambiguous, or high-stakes parts. You learn the line by building — note it in your
rules.

### 4. The honest hook (motivation, not metric)
One line connecting it to the real world: good builders don't out-type the AI, they **out-plan and out-judge**
it — and that's exactly what a company is paying for. Keep it confidence-building, never fearful.

## Open decision — where to slot it (please choose; recommendation in **bold**)
1. **A persistent "Is it going somewhere?" beat on every build week** — a collapsible guide in `BuildLayer`
   placed between **③ Build** and **④ Check** (where the spin actually happens), available every build week,
   mirroring the pitch / engineering-rules panels. Introduced with a fuller callout the **first time they've
   actually built** (Lesson 3 — after they've felt a spin once in Lesson 2), compact thereafter. *Recommended:
   it lands on real pain and reinforces every week, without spending a scarce 12-lesson slot.*
2. **A dedicated standalone lesson** — its own slot in the syllabus. (Costs one of the 12 lessons; higher
   prominence, but the 12 are currently full and each maps to a feature build.)
3. **Fold "Steer" into the named loop** — make it **Spec → Build → *Steer* → Check → Ship** in
   `AGENTIC_STEPS` (the primer + generated `PLAYBOOK.md`). (Highest prominence; risk: dilutes the clean,
   memorable 4-step loop.)

> Sunil to decide the slot before build. Naming also open: **"Is it going somewhere?"** vs. "Steer & stop" vs.
> "When it's going nowhere."

## Done when (acceptance) — finalized once the slot is chosen
- [ ] The four content beats above are taught in the chosen slot, POSITIONING-voiced (us/we; build-with-AI, not
      coding; honest + confidence-building, no fear-mongering, no token-minimization framing).
- [ ] It explicitly connects to the existing loop: it's about the *in-progress* build (vs. ④ Check's finished
      slice), and a spin → capture an **Engineering rule** (SPECS/021).
- [ ] A worked example (a realistic "it was spinning — here's what I did" mini-story), like our other examples.
- [ ] Build + tests green (a render test asserts the beat shows in its slot + the key strings); docs synced
      (CLAUDE.md curriculum note; arch doc checked — likely no change unless option 3 touches `AGENTIC_STEPS`).

## Out of scope
- Any real token metering / cost dashboard in the app (the cost angle is a teaching hook, not a feature).
- Auto-detecting a spin for the student (an AI "you're spinning" nudge) — they learn to read it themselves.

## Risk
Low–med. Curriculum content + one UI beat (option 1/2) — or a foundation `AGENTIC_STEPS` change (option 3,
which also touches the primer + generated PLAYBOOK.md + their tests). No public-money/auth surface.
