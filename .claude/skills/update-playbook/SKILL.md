---
name: update-playbook
description: Record a newly-learned, generalizable engineering pattern (or correct a wrong one) into ENGINEERING-PLAYBOOK.md — the portable cross-project best-practices guide. Invoke this PROACTIVELY, without being asked, whenever a session establishes a durable lesson worth carrying to future projects, when a prior playbook rule proves wrong, or when the user says "remember this / add this as a guideline." NOT for project-specific facts (those go in CLAUDE.md).
---

# Update the Engineering Playbook

`ENGINEERING-PLAYBOOK.md` (repo root) is the portable, project-agnostic guide of engineering practices.
This skill keeps it current as we learn — and is meant to run on your own initiative.

## When to invoke (proactively — don't wait to be asked)
During normal work, invoke this when ONE of these becomes true:
- We established a **generalizable** pattern that would help on a *different* project (a fact about
  *this* codebase belongs in CLAUDE.md, not here).
- A lesson came from a mistake worth not repeating (a failure mode + its fix, a sharp edge).
- An existing playbook rule was shown to be **wrong or incomplete** — correct it.
- The user says "remember this", "add this as a best practice/guideline", or similar.

Bias toward restraint: if you're unsure something is durable and transferable, it probably isn't. One
crisp, reusable rule beats five situational ones. Don't invent a "lesson" just to write something.

## What a good entry looks like
- **Principle + why.** State the rule, then the failure it prevents — the "why" is what lets a future
  reader adapt it instead of cargo-culting it.
- **Project-agnostic.** No repo-specific names, paths, or endpoints; phrase it to hold in any codebase.
- **In the right section** (Modularity / Parallel work / Workflow / Testing / …). Add a new section
  only if none fits.
- **Concise & deduped.** Tighten or merge existing wording rather than appending near-duplicates.

## Steps
1. Read `ENGINEERING-PLAYBOOK.md` and locate the section the lesson belongs in (or decide a new one is
   warranted).
2. Add or curate the entry as *principle + why*. If correcting a wrong rule, fix it in place and keep
   the doc honest about what changed.
3. Append a dated line to the **Changelog** at the bottom: `YYYY-MM-DD — <one-line summary>` (use the
   real current date).
4. Ship it through the project's normal flow — feature branch → guards → PR → squash-merge → sync main.
   It's a docs change (no full test run needed), but keep the branch/PR discipline: never commit the
   playbook straight to `main`.
5. Tell the user, in one line, what you recorded.

## Don't
- Don't put project-specific facts here — those go in CLAUDE.md.
- Don't restate what the doc already says, and don't let it bloat.
- Don't fabricate learnings to have something to add.
