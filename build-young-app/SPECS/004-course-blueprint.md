# Spec: 004 — Course blueprint (how to add a new course)

> **Reusable template.** This is the canonical anatomy of a Build Young course. When we add a NEW
> course (possibly teaching something different from entrepreneurship), copy the skeleton at the
> bottom, fill it in, and wire each piece at the file/symbol it names. Keeps us from re-deriving the
> structure every time.

**Status:** living blueprint
**Owner:** Sunil Garg
**Date:** 2026-06-08

---

## The model: Course → Cohorts (read this first)

- A **Course** = the *curriculum* — what is taught: the weeks, titles, prep, objectives, per-week
  activities, prereqs, capstone, certificate. The "what."
- A **Cohort** = one *scheduled run* of a course — dates, day-pair, seats, price, Zoom link, payment
  link, group email. The "when/who." **One course has one OR MANY cohorts.**

**Where we are today:** there is exactly ONE course (the "Builders" entrepreneurship program), and it
is *implicit* — the curriculum is hardcoded globally and every cohort (`BATCHES`) just carries
`track: "Builders"`. There is no explicit Course entity yet. So "what we have today is just cohorts."
Adding a SECOND, DIFFERENT course needs the small model change in **§5**. Adding more cohorts of the
SAME course needs nothing structural — just new `BATCHES` rows.

---

## 1. Anatomy of a Course (the curriculum — every piece + where it lives)

A course is a fixed number of weeks (today **12**), each week with: a title, a one-line subtitle, prep
homework, "what you'll learn" objectives, an in-app activity, optional prereqs, optional worked
example/glossary, and a final capstone + certificate. Define ALL of these for a new course:

| # | Piece | Lives in | Shape / notes |
|---|-------|----------|----------------|
| 1 | **Weeks** (`WEEKS`) | `src/App.jsx` | array, one per week: `{ act, t (title), s (subtitle), action, comingSoon }`. `action` ∈ `"build"` \| `"capstone"`. |
| 2 | **Week titles** (`WEEK_TITLES`) | `src/marketMedia.js` | the N titles for email subjects — **must stay in sync with `WEEKS[].t`**. |
| 3 | **Prep / homework** (`WEEK_PREP`) | `src/marketMedia.js` | per-week "prepare for next week" text. Sent by the cron reminder + completion email. `""` = no homework that week. Also founder-editable live (Settings → Homework, `homeworkStore.js`). |
| 4 | **Objectives** (`WEEK_OBJECTIVES`) | `src/marketMedia.js` | per-week "what you'll learn this class" — first line is the connective thread, rest are bullets. Founder-editable (`objectivesStore.js`). |
| 5 | **Prereqs** (`PREREQS`) | `src/App.jsx` | tools/accounts: `{ id, title, when ("Week N" \| "Day one"), build?, why, link \| links }`. Drives the per-week **Pre-req** tab (`weekPrereqs` parses `when`). |
| 6 | **Per-week activity dispatch** (`weekActivity`) | `src/App.jsx` | `weekActivity(week,…)` maps each week → its component (BuildPlan / ShapePlan / `BuildLayer` / GoLiveChecklist / FunnelStages / FunnelScenarios / ReflectionPanel / capstone). This is the spine — every week must return something or `null`. |
| 7 | **Build layers** (`BUILD_LAYERS`) | `src/App.jsx` | the "describe → build with AI" weeks: `{ key, heading, lead, fieldLabel, promptLabel, placeholder, intro, instruction }`, keyed by week number. `s.shape[key]` stores the student's spec. |
| 8 | **AI-build weeks** (`BUILD_WEEKS`) | `src/App.jsx` | `Set` of weeks where students actively prompt the AI to build — drives the **stretch goal** callout. Today = the `BUILD_LAYERS` weeks. |
| 9 | **Reflection/discussion weeks** (`REFLECT_WEEKS`) | `src/App.jsx` | no-prompt discussion weeks → `ReflectionPanel`. |
| 10 | **Go-live checklist** (`GO_LIVE_DEFAULT`) | `src/App.jsx` | grouped `{ s (section), t (item), h (how-to) }` for the launch week. Editable per student (`s.golive`). |
| 11 | **Worked example / glossaries** (`weekExample`, `SHAPE_EXAMPLE`, `FUNNEL_PRIMER`/`METRICS_PRIMER`/`PLG_PRIMER`) | `src/App.jsx` | the "Class example" tab: a filled-in sample + plain-English term cards for a week. |
| 12 | **Capstone + certificate** | `src/App.jsx` (`action:"capstone"`, `StretchGoal`), `api/_lib/cert.js` | final week presents; cert mints once Week N−1 is complete (`certEligible`). Cert wording (`certName`) in `src/cert.js`. |
| 13 | **Course constants** | `src/cohorts.js`, `src/App.jsx` | number of weeks, `CHECKINS`, `REFUND_WEEKS`, refund proration basis. |
| 14 | **Legal/Terms copy** | in-app `LEGAL` + `public/terms.html` | refund window, prize, minors — keep both copies in sync. Governed by **POSITIONING.md**. |

> The week view renders these as four tabs — **Pre-req · What you'll learn · Class example · Your
> exercise** — via the shared `WeekTabs` component (see SPECS/003). A new course inherits the tab
> shell for free; you only supply the per-week content above.

## 2. Anatomy of a Cohort (a scheduled run)

One row in `BATCHES` (`src/cohorts.js`) — also live-editable in the founder cohort editor:

```
{ id, season, track, start, day, seats, price, zoom, groupEmail, stripeLink }
```
- `id` (e.g. `fall-mw`), `season` (a `SEASONS` key), `track` (the course label — today always `"Builders"`),
  `start` (Week-1 date, PT calendar date), `day` (human label "Mondays & Wednesdays · 5:00–6:30 PM PT"),
  `seats`, `price`, `zoom`, `groupEmail`, `stripeLink` (one shared link or per-cohort).
- At runtime each cohort also gets a `groupAudienceId` (Resend) on save. Progression is calendar-driven
  from `start` (PT) via `coursePosition` — no per-cohort curriculum.

## 3. Adding more cohorts of the SAME course (no structure change)

Append rows to `BATCHES` (or add via the founder console): set `season`, `start`, `day`, `seats`,
`price`, `zoom`, `stripeLink`. Add a `SEASONS` entry if it's a new season. Done — the landing,
enroll dropdown, schedule, reminders, and dashboard pick it up automatically.

## 4. Adding a NEW, DIFFERENT course — content checklist

Fill in every numbered item in §1 for the new subject. Sync rules / guardrails:
- `WEEKS[].t` ↔ `WEEK_TITLES` must match (same count, same titles).
- Every week in `WEEKS` must be handled by `weekActivity` (return a component or `null`) and by
  `weekExample` (example or `null`).
- `BUILD_WEEKS` ⊆ the weeks where `weekActivity` is an AI-build activity.
- Re-check **POSITIONING.md** for voice/claims and **CLAUDE.md** for conventions; update Terms if the
  refund/prize/format changes.
- `npm run build` + `npm test` green; the `\uXXXX` guard on the diff = 0. Ship via `/ship`.

## 5. The model change to host MORE THAN ONE course (do this when course #2 is real)

Today the curriculum is global + single. Minimal path to multiple distinct courses:
1. **Give cohorts a course id.** Add `courseId` to each `BATCHES` row (default existing rows to
   `"builders"`). `track` stays as the display label.
2. **Namespace the curriculum by course.** Move the §1 pieces (`WEEKS`, `WEEK_TITLES`, `WEEK_PREP`,
   `WEEK_OBJECTIVES`, `PREREQS`, `BUILD_LAYERS`, `BUILD_WEEKS`, `REFLECT_WEEKS`, `GO_LIVE_DEFAULT`,
   examples/glossaries, week count) into a **course-definition object** — one per course — e.g.
   `src/courses/<id>.js` exporting a single `COURSE` shape. Keep the current Builders content as the
   first instance so nothing changes for it.
3. **Select the course from the enrolled cohort.** The dashboard already resolves the student's
   `batch`; have it look up `batch.courseId` → the course definition, and pass that into `Platform` /
   `WeekTabs` instead of reading the globals. KV state (`s.shape`, `s.golive`, `s.reflect`) stays
   per-student; just keyed under whichever course they're in.
4. **Tests:** add a course-definition shape test (titles↔weeks count, every week dispatched) that runs
   for each registered course.

This is intentionally **out of scope until a second course exists** — it's a real refactor with
regression risk on the live course. This blueprint exists so that, when the time comes, the move is
mechanical, not archaeological.

## 6. Skeleton to copy for a new course

```
COURSE id:        e.g. "design-studio"
Display track:    e.g. "Designers"        (cohort `track` label)
Weeks:            N (today 12)
Refund window:    REFUND_WEEKS = ?         (full → prorated → non-refundable)
Capstone week:    week N — action "capstone"

Per week (1..N):
  - title (WEEKS[].t  /  WEEK_TITLES)
  - subtitle (WEEKS[].s)
  - act / arc label
  - objectives (WEEK_OBJECTIVES): lead line + 2–4 takeaway bullets
  - prep homework (WEEK_PREP): one short paragraph (or "")
  - activity (weekActivity): which component + its data
       • build week?  → BUILD_LAYERS[week] = { key, heading, lead, fieldLabel, promptLabel, placeholder, intro, instruction } ; add week to BUILD_WEEKS
       • reflection?  → REFLECT_WEEKS[week]
       • checklist?   → a GO_LIVE_DEFAULT-style list
       • capstone?    → action "capstone"
  - prereqs due this week (PREREQS rows with when:"Week N")
  - class example / glossary (weekExample): worked sample or term cards (or none)

Cohorts (one or more), each a BATCHES row:
  - id, season, start (PT date), day, seats, price, zoom, groupEmail, stripeLink
```

## Sources of truth
- Copy/voice/claims → **POSITIONING.md**
- Code conventions, the current Builders curriculum, gotchas → **CLAUDE.md**
- Go-live wiring (domain, Stripe, Resend, env) → **GO-LIVE.md**, **DEPLOY.md**
