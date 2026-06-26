# Spec: Teach the playbook as a living artifact (the student authors "Engineering rules")

> One feature = one short spec. Decisions go here; PRs implement them. Sibling of SPECS/019 (pitch).

**Status:** approved
**Owner:** Sunil Garg
**Date:** 2026-06-25

> **Approved 2026-06-25:** section label **"Engineering rules"**; the editor **shows the default rules seeded
> in, with a nudge to review/edit/add** (no separate ④-Check nudge); worked example included. **Safety:** the
> security **non-negotiables** (no homemade passwords; keep secrets safe) stay FIXED in the kit — only the
> *craft* rules are the seeded, student-editable set, so a student can't delete the security guardrails.

## Why
The student kit's `PLAYBOOK.md` is a **fixed handout** today (`projectKit.js`: the Spec→Build→Check→Ship loop
+ 5 guardrails, identical for every student). It's the **only kit doc that's read-only to them** — they
*write* their specs and *write + refine* their pitch (SPECS/019), but only *receive* the playbook. That skips
the single highest-leverage meta-skill: **"every time you learn something the hard way, record it as a rule so
you don't repeat it."** Their Claude **reads `PLAYBOOK.md` every session**, so a rule they capture *actually
changes their next build* — a tight, visible feedback loop (and exactly the practice Build Young itself runs).

## What
### 1. PLAYBOOK.md gets a student-authored section
Keep the fixed **"How we build"** (the loop + guardrails); **append** a **"## My rules — what I've learned"**
section generated from a new **`s.build.rules`** field (free text, a running list — one rule per line; capped).
Empty → a gentle placeholder ("add a rule each time something bites you — your AI reads these every build").

### 2. A living "My rules" editor on every build week
Mirror the SPECS/019 pitch pattern: a **collapsible "✎ My rules"** panel in `BuildLayer` (every build week)
that edits `s.build.rules` and flows into the regenerated `PLAYBOOK.md` on each ③ build. Framing:
*"Learned something the hard way? Add a one-line rule — your AI reads these every build, so it won't repeat it."*

### 3. Capture nudge at the moment it lands
A one-line nudge in the **④ Check** box (where a gap surfaces): *"Found a gap? Capture it as a rule in **My
rules** below so it doesn't bite you again."* — connecting the lesson to the practice.

### 4. A worked example
Show a short **`RULES_EXAMPLE`** (Build Young's own real rules — e.g. "Ship behind a flag," "No homemade
passwords — use a standard sign-in," "One small slice, then check") as a model, like `SHAPE_EXAMPLE` / the
pitch example.

## Open decisions (please confirm — recommendation in **bold**)
1. **Label / section name:** **"My rules — what I've learned"** (UI panel + the `PLAYBOOK.md` heading). Alt:
   "Lessons" / "House rules."
2. **Capture nudge placement:** **a collapsible editor on every build week + a one-line nudge in the ④ Check
   box** — vs. just the editor (no Check-box nudge).
3. **Worked example in v1:** **yes** (Build Young's own model rules) — vs. defer.

## Done when (acceptance)
- [x] `PLAYBOOK.md` keeps the fixed loop + **security non-negotiables**, AND has a **"## Engineering rules"**
      section seeded from `DEFAULT_ENGINEERING_RULES` and overridden by `s.build.rules` (never "undefined").
- [x] Every build week shows a collapsible **"Engineering rules"** editor (seeded with the defaults) that edits
      `s.build.rules` and flows into the regenerated `PLAYBOOK.md` (verified: editing it changes the ③ kit output).
- [x] The editor carries a review/edit/add nudge (per approved decision — **no separate ④-Check nudge**).
- [x] A worked-example set of rules (`RULES_EXAMPLE`, Build Young's own) is shown as a model.
- [x] Build + tests green — a test covers the kit emitting the Engineering-rules section from `s.build.rules`,
      and the build-week editor flowing into the kit; docs synced (CLAUDE.md project-kit note; arch doc checked —
      no module/endpoint/route change, just the kit description).

## Out of scope
- Auto-suggesting rules from the build (AI-generated lessons) — the student writes their own.
- Versioning/history of rules; sharing rules across students.

## Risk
Low. Student-side only (the kit template + a `s.build` field that already persists + build-week UI). No public,
money, or auth surface; no new module/endpoint/route.
