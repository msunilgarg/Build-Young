# Spec: Track scholarships through the funnel + journey

> One feature = one short spec. Decisions go here; PRs implement them. Follow-up to SPECS/016.

**Status:** approved
**Owner:** Sunil Garg
**Date:** 2026-06-25

> **Approved 2026-06-25:** scholarship funnel labels **Applied → Awarded → Class started → Graduated** (the
> selected stage is "**Awarded**"); tag journey events with `source`; full Scholarship segment in v1.

## Why
Scholarship signals are collected but not shown. `free_application` (a write-up submitted) is recorded yet
**never displayed**; an approved seat fires `enrolled{source:"free"}` so it lands in the topline + the
"Revenue by source" card (as raw `free`, $0) — but there's **no scholarship funnel** (applied → selected) and
**no way to follow scholarship students through the journey** (class started → graduated), because the
journey events carry no `source`. We want scholarships woven into the **existing funnel + journey**, segmentable
like any channel — and the apply→select rate ("N applications per funded seat") is exactly the
merit-based/funding-dependent signal the YC story needs.

## What
### 1. Attribute the journey to a channel (the enabling change)
Tag the lifecycle events with `source` so scholarship students are followable end-to-end. In `Platform.jsx`
where `class_started` / `week_advanced` / `graduated` fire, add `source` derived from the student's
`s.paymentSource` (`"free"` → `free`, `"partner"` → `partner`, else `direct`). `enrolled{source}` already
exists; `free_application{batchId}` already exists. (Small, additive prop — no event removed.)

### 2. A scholarship-aware funnel (`src/funnel.js`)
- Extend `summarize(events, filter)` so `filter` may be `{source}` (extend the `matches()` helper).
- Define the **scholarship spine** for the source=`free` view: **Applied** (`free_application`) → **Selected**
  (`enrolled{source:free}`) → **Class started** (`class_started{source:free}`) → **Graduated**
  (`graduated{source:free}`) — i.e. `free_application` replaces visited/enroll-started as the scholarship
  top-of-funnel, giving the **applied → selected** conversion (the selection rate). The paid spine is unchanged.

### 3. Surface it in the console (`FounderDashboard.jsx`)
- Add a **"Scholarship"** button to the existing **Segment** selector (alongside All / seasons). Selecting it
  renders the scholarship spine + the journey curves (`week_advanced`/`graduated`) filtered to `source:free`.
- Relabel the **Revenue by source** card's `free` row as **"Scholarship (funded · $0)"** (it currently falls
  through to a raw label) — and partner stays "Partner · <id>", direct stays "Direct".

## Open decisions (please confirm — recommendation in **bold**)
1. **Scholarship funnel labels:** **Applied → Selected → Class started → Graduated** (with the applied→selected
   "selection rate" shown). Alt: "Approved" instead of "Selected".
2. **Tag journey events with `source`** (recommended — it's the only way to segment the journey by channel;
   small additive prop) — vs. leave journey events untagged and only show the scholarship *funnel* (applied →
   selected), not the per-channel journey curves.
3. **v1 scope:** **the full Scholarship segment** (spine + journey curves + the revenue-card relabel) — vs. a
   smaller first cut (just an "applied → selected" scholarship funnel card, journey left for a follow-up).

## Done when (acceptance) — all met
- [x] `class_started`/`week_advanced`/`graduated` carry `source` (free/partner/direct) from `s.paymentSource`.
- [x] `summarize(events, {source:"free"})` returns the scholarship spine (Applied → **Awarded** → Class started →
      Graduated) with the applied→awarded selection rate (`overall`); the default (paid) funnel is unchanged.
- [x] The console has a **Scholarship** segment showing that funnel + the source-filtered journey curves; the
      Revenue-by-source card labels the free channel as "Scholarship (funded · $0)".
- [x] Build + 429 tests green — `funnel.test.js` covers the scholarship spine + source-tagged journey + the
      source filter + that the default funnel is unchanged; existing funnel/lifecycle tests pass unchanged.
- [x] Docs synced (CLAUDE.md funnel note; SCHOLARSHIP_STAGES self-documented in funnel.js).

## Out of scope
- Per-batchId funnel filtering (today it's by season); any change to how events are ingested/stored.
- A separate scholarship "applications over time" page beyond the funnel segment.

## Risk
Low–med. Founder-console + analytics only. The one cross-cutting bit is adding `source` to journey events
(client-side `track` calls) — additive, guarded the same as the existing transition firing. No public/money/auth.
