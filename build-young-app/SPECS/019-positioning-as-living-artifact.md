# Spec: Teach positioning as a living artifact (the student's "pitch")

> One feature = one short spec. Decisions go here; PRs implement them. Follow-up to the positioning gap.

**Status:** draft
**Owner:** Sunil Garg
**Date:** 2026-06-25

## Why
The course coaches **specs + acceptance criteria** rigorously (every build week: write ① → check ④, against
worked examples), but **positioning is one-and-done in Week 1** — captured in the `BuildPlan` form, mirrored
into a thin `POSITIONING.md` kit stub, then never revisited or coached. Yet positioning (who it's for, the
problem, why you, the one promise) is the prerequisite to everything in Act 2 ("grow it") and to the whole
"what you've built travels" thesis. Make positioning a **first-class, living artifact** — written in Week 1
and refined every build week, like the spec — and give it a name a teenager actually relates to.

## What
### 1. Rename the kit doc to something teen-friendly
The student-kit `POSITIONING.md` → **`PITCH.md`** ("Your Pitch") *(name = decision #1)*. Update `KIT_FILES`,
the doc heading + body in `buildProjectKit`, the kit's `CLAUDE.md` reference to it, the kit object key, and
the ③ "Set up & build" prompt copy in `Platform.jsx` (it lists the files). **The company's own internal
`POSITIONING.md` is unchanged** — "positioning" is fine for the founder/team; only the *student's* doc gets
the friendly name.

### 2. Week 1 — frame it as writing your pitch
The Week-1 `BuildPlan` already captures the raw material (idea, who/pain, press release, one promise,
true-vs-goal). Reframe it explicitly as **"Write your pitch"** and (decision #2) optionally enrich it with a
**"why you / why this over what they do today"** line (the one differentiator) — the piece most missing today.

### 3. Every build week — a living "Your Pitch" editor
On each build week (`BuildLayer`), surface a **collapsible "✎ Your pitch" panel** that edits the *same*
`s.build` fields, so the student tweaks it as they learn — exactly like they refine a spec. No new storage:
it already persists in `s.build`, and the ③ kit prompt **regenerates `PITCH.md` every build week**, so a
sharpened pitch automatically flows into the next build. Framing: *"Your pitch is a spec for your message —
sharpen it as you learn who it's really for."*

### 4. (Decision #3 — in v1 or follow-up) A worked example
Show an adapted version of **Build Young's own positioning** (one promise · who it's for · claims to make vs.
avoid · voice) as a model, the way `SHAPE_EXAMPLE` shows a worked spec. Kids learn positioning from a sharp
example faster than from instructions.

## Open decisions (please confirm — recommendation in **bold**)
1. **Name:** **`PITCH.md` ("Your Pitch")** — teens get "pitch" (elevator/Shark-Tank) and it covers who-it's-for
   + promise + why-you. Alternatives: `STORY.md` (conflicts with the capstone "founder story"), `WHY.md`,
   keep the filename but just relabel the UI.
2. **Enrich the fields?** **Add one "why you / vs. the alternative" differentiation line** (the main gap) —
   vs. keep the existing 5 fields as-is and only reframe/relabel.
3. **Worked example in v1?** **Yes, include it** (adapt Build Young's positioning) — vs. defer to a follow-up.

## Done when (acceptance)
- [ ] The kit writes **`PITCH.md`** (renamed from `POSITIONING.md`); `KIT_FILES`, the kit prompt, and all
      student-facing references use the new name; the company `POSITIONING.md` is untouched.
- [ ] Week 1 frames the work as **"Write your pitch"** (+ the differentiator line, per decision #2).
- [ ] Every build week shows an editable **"Your pitch"** panel that edits `s.build` and flows into the
      regenerated `PITCH.md` (verified: editing it on a build week changes the kit output).
- [ ] (If decision #3 = yes) a worked-example pitch is shown as a model.
- [ ] Build + tests green; a test covers the kit emitting `PITCH.md` from `s.build`; docs synced (CLAUDE.md
      project-kit note).

## Out of scope
- Renaming the company's internal `POSITIONING.md`. Multi-week *curriculum* changes beyond surfacing the
  editor (e.g. a dedicated Act-2 positioning lesson) — can follow once this artifact exists.
- Any AI "positioning critic" step (the student can already ask their Claude to critique it; a built-in
  coached step is a natural follow-up).

## Risk
Low. Student-side only (the kit + build-week UI + `s.build` fields, which already persist). The rename is a
mechanical find/replace within the kit; no public, money, or auth surface.
