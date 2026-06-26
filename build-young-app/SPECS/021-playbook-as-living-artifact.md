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
> _(As shipped — the approval note above resolved the open decisions: label "Engineering rules"; the editor
> shows the defaults seeded in with a review/edit/add nudge, no separate ④-Check nudge; security guardrails
> stay fixed.)_

### 1. PLAYBOOK.md gets a student-authored section
Keep the fixed **"How we build"** (the loop + the **security non-negotiables**); add a **"## Engineering rules"**
section **seeded from `DEFAULT_ENGINEERING_RULES`** (the craft rules) and **overridden by a new `s.build.rules`**
field (free text, a running list — one rule per line). Only the *craft* rules are student-editable; the security
non-negotiables stay fixed in the kit, so a student can't delete them.

### 2. A living "Engineering rules" editor on every build week
Mirror the SPECS/019 pitch pattern: a **collapsible "✎ Your engineering rules"** panel in `BuildLayer` (every
build week), **seeded with the defaults**, that edits `s.build.rules` and flows into the regenerated
`PLAYBOOK.md` on each ③ build. Framing: *"Your AI reads these every build, so a rule you write here changes your
next build — review the starting set, edit what doesn't fit, and add a line each time you learn something the
hard way (e.g. right after a check turns up a gap)."* The review/edit/add nudge lives here — **not** in the ④
Check box (per the approval note).

### 3. A worked example
Show a short **`RULES_EXAMPLE`** (Build Young's own real craft rules) as a model, like `SHAPE_EXAMPLE` / the
pitch example.

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
