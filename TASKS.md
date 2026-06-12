# Build Young — task backlog (the loop's queue + state)

This file is the **durable state** for the autonomous loop (see `ENGINEERING-PLAYBOOK.md` §9). The loop drains it
top-to-bottom: it picks the first unchecked task, implements it, has a separate verifier check it,
ships it, marks it done, and moves on. Because it's committed to git, it **survives container resets**
— a fresh session re-reads this file and resumes where the last one stopped.

**You (the human) own this file.** Add tasks as goals + acceptance criteria; the loop does the rest.
Keep each task small, single-feature, and independently shippable (one file/feature where possible).

> Not-yet-scheduled ideas live in [`BACKLOG.md`](./BACKLOG.md) (a parking lot the loop ignores).
> Promote one into this file as a task when it's ready to build.

## Format
```
## [ ] T<id> — <title>  ·  risk: low | med | high
Goal: one sentence — what "done" looks like.
Acceptance criteria:
- concrete, checkable conditions (the verifier checks these)
- build + tests stay green (always implied)
Files: likely file(s) to touch
Stop-and-ask if: (optional) conditions that should bounce back to the human
```
Risk drives autonomy: `low`/`med` the loop ships on its own; `high` it implements + opens a PR but
**stops for you** (architectural / behavioral / money-auth / ambiguous).

---
---

## [ ] T10 — Make the loop model-tiered (cheap execution, premium reasoning)  ·  risk: high
Goal: the loop and ship flows spend the expensive frontier model only where it changes the outcome —
planning, architecture/design, and high-risk tasks — and run routine execution (the independent
verifier's re-run + low-risk doer passes) on a cheaper, faster model, so a fixed plan/budget isn't
burned on the easy parts.
Acceptance criteria:
- A documented **model-tiering policy** lives in `ENGINEERING-PLAYBOOK.md` (portable: principle + why —
  match model to role; cheap for bulk execution/verification, premium for planning + high-risk; don't
  trade away the *rigor*, only the cost) and the project specifics in `build-young-app/CLAUDE.md`.
- `.claude/skills/run-loop/SKILL.md` and `.claude/skills/ship/SKILL.md` instruct: spawn the independent
  **verifier sub-agent on a cheaper model** (e.g. the Agent tool's `model:` set to a Sonnet/Haiku-class
  id) and reserve the premium model for planning and any `risk: high` task — WITHOUT weakening the
  verifier's standing checks (it still re-runs build/tests, grades the diff, views diagrams, ~3 rounds).
- The tier is named by **model family/role, not a hardcoded marketing name that will age** — reference
  the `claude-api` skill for current valid model ids so the doc doesn't pin a stale string.
- No change to the guardrails: high-risk still pauses, never push main directly, no internal/model
  identifiers in committed artifacts, verifier never skipped.
- Build + tests stay green; docs/skills-only change (no app source) unless the Action needs a model arg.
Files: `ENGINEERING-PLAYBOOK.md`, `build-young-app/CLAUDE.md`, `.claude/skills/run-loop/SKILL.md`,
`.claude/skills/ship/SKILL.md`, optionally `.github/workflows/run-loop.yml` (its `claude_args` model).
Stop-and-ask if: choosing the *specific* cheaper model id for verifiers (which Sonnet/Haiku tier) — it's
a quality/cost judgment; propose a default and confirm. Also pause before merge (high risk): this changes
how the autonomous system spends and verifies, so a human signs off on the policy.

---
## Done

## [x] T9 — Make every crawlable surface 100% accurate + fix the search-result favicon  ·  risk: low
Done: audited all crawlable surfaces — **no stale money/finance positioning anywhere** (the old SERP
snippet is pure Google cache); JSON-LD price (999) matches `cohorts.js`; title/desc/OG/Twitter/canonical
consistent. Aligned two descriptive "teens" → "high schoolers"/"they" (JSON-LD + llms.txt). **Favicon:**
the SERP showed a generic globe (only an SVG favicon existed), so generated raster icons from the brand
mark — `favicon.ico` (16/32/48), `favicon-96x96.png`, `apple-touch-icon.png` (180) — and declared them
in `index.html`. Build + 237 tests green. Human follow-through (not loop-able): GSC → Request Indexing +
monitor until Google re-crawls (it controls timing).

## [x] T5 — Make the App.jsx router data-driven (routes registry)  ·  risk: high
Done (human-authorized to merge without the usual high-risk pause): App.jsx routing is now a single
`ROUTES` registry (`{ key, path, title, desc, el }`); the render block and the URL-path/`<title>`
effect both derive from it, so adding a screen is one appended entry. Behavior unchanged — same
component/props per route, the `app` route keeps its `state` guard, paths + per-route titles match the
old maps, `verify` keeps `/verify/<id>`. nav/goBack/navLock/scroll-restore/deep-link load untouched.
Independently verified route-by-route. Build + 237 tests green.

## [x] T8 — Break down US traffic by state  ·  risk: med
Done: `api/funnel.js` stamps a `region` (2-letter US state) on `visited` only when country is `US`,
from Vercel's `x-vercel-ip-country-region` header — **server-stamped, NOT in `ALLOWED_PROPS`** (so it
can't be spoofed, mirroring `country`; an intentional security improvement over the task's literal
wording). `engagement()` adds an additive `usStates: [{region,count}]` (US-only, region-required,
descending); the "Where visitors come from" card shows a "US visits by state" line (hidden when none).
New engagement test + updated exact-shape assertion. Aggregate, no PII. Suite 35 files / 237 passing.

## [x] T7 — Show country in the "Top paths through the site" view  ·  risk: med
Done: `journeys()` now joins each visit's server-stamped `country` (via the visit's `sid`, now also
on the `visited` event) and returns it additively — `byCountry` per path + an overall `countries`
tally (existing `steps/left/count`/`sessions` unchanged). The "Top paths" card shows a "Top countries"
line + per-path flags (unknown → "—"). Aggregate, no PII (sole join key is the existing ephemeral
`sid`; country is server-only, not client-settable). New journeys test; suite 35 files / 235 passing.

## [x] T4 — Add render tests for the certificate route + card  ·  risk: med
Done: `test/cert-ui.test.jsx` (4 tests) — `CertifyVerify` verified path (mocked `/api/cohorts?cert=`
→ name + "Verified by Build Young" + correct lookup URL) and not-found path; `CertificateCard` renders
the graduate name + all three actions (Add to LinkedIn / Download / View public page) and renders
nothing without a cert. Tests only — no app source. Suite 35 files / 234 passing.

## [x] T3 — Co-locate tests per feature module  ·  risk: med
Done: split `test/app.test.jsx` (10 tests) into per-feature files — `Landing.test.jsx` (2),
`Enroll.test.jsx` (3), `Legal.test.jsx` (2), `Platform.test.jsx` (3); removed the monolith. Tests
moved verbatim; suite stays 34 files / 230 passing (no coverage lost). Tests only — no app source.

## [x] T2 — Refresh the stale technical sections of build-young-app/README.md  ·  risk: low
Done: refreshed the go-live + layout sections to the current app — class-reminder cron (not a
market-news drip), high-school-only cohorts (`fall-mw`/`fall-tt`, one $999 price; no MS/HS tiers),
`CONFIG` now in `src/lib.js` + founder-console live-editing, server/KV-authoritative state, and a
Project-layout block mirroring CLAUDE.md's module map (App.jsx = router; screens + foundation + the
real `api/` set). Docs only — build + 230 tests green.

## [x] T1 — Remove the unused lazy `Charts` import from App.jsx  ·  risk: low
Done: removed the dead `const Charts = React.lazy(() => import("./Charts.jsx"))` (+ its comment) from
the router; charts are lazy-loaded from FounderDashboard.jsx. Build still code-splits recharts; 230
tests green.

## [x] T6 — Create BUILD-YOUNG-ARCHITECTURE.md (living diagrams) + the keep-it-updated rule  ·  risk: med
Done: `BUILD-YOUNG-ARCHITECTURE.md` added at the repo root with two **Mermaid** diagrams + component tables —
(1) the agentic loop (triggers incl. the new issue-triggered `run-loop.yml` Action → durable state →
driver → doer → verifier → ship/pause → live, plus the always-on guards/hooks/MCP/worktrees machinery)
and (2) the app (App.jsx router → screen modules → foundation modules → `api/` serverless endpoints →
KV + Stripe/Resend/Vercel/Anthropic). Module/endpoint names match the repo. The **living-document
rule** is installed in `build-young-app/CLAUDE.md` (any PR changing a module/endpoint/skill/hook/
service or the loop flow updates BUILD-YOUNG-ARCHITECTURE.md in the same PR). Docs only — no app code touched.
