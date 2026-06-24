# Build Young — Positioning & Messaging

The source of truth for **what we say and how we say it**. Code lives in `CLAUDE.md`;
this governs copy. Check every public/in-app word against this before shipping.
(All of it reflects decisions already made — nothing new to debate.)

## Who it's for
High school students; a parent/guardian enrolls. **No prior experience, no coding required.**

## The promise (one line)
Build a real product with AI, learn to grow it, and present it at a capstone — over a **focused 12 weeks**.
**Tagline (canonical):** *"Raising builders, not consumers."*

## The arc — and what's *achieved* vs. *learned* (the expectation spine)
- **Act 1 · 0 → 1 · Build & launch the product (Weeks 1–7)** — **ACHIEVED.** They ship a real, live product (web address, sign-in, e-commerce). It's true; say it plainly.
- **Act 2 · Learn how to grow it (Weeks 8–10)** — **SKILL, not outcome.** Funnels, metrics, finding the levers — practiced on scenarios built from their own product. *Never* a promise of scale.
- **Act 3 · Capstone (Weeks 11–12)** — prepare, then present what they built; parents welcome.

## Claims we make
- Build & **launch** a real product (achieved).
- **Learn how to grow it** (skill).
- **Live, small-group**, twice a week (~3 hrs), 100% on Zoom — **no slideware, no lectures, no busywork.**
- **Build with AI — we don't teach coding** (AI handles the how).
- **Affordable: $999.** Full refund before start; flat 75% through the first week.
- **Builder prize:** first in a cohort to land a real paying customer **within a year** → tuition back (payment proof + parent-approved video).
- **A real thing to show for it** — a live product + a founder's story they can point to (college essays, activities list, interviews, a portfolio). **Evidence and a story, never an admissions promise.**

## Claims we avoid (the guardrails that caused the rework)
- ❌ Customers / income / scale **achieved in the 12 weeks.** Real traction is the long game — the prize is *"within a year."*
- ❌ "got your first customers" / "they earn" as accomplished fact → ✅ "go after / learn to get."
- ❌ "ex-Microsoft founder" (he's the founder of **Build Young**; **20 years in product** at Microsoft).
- ❌ Teaching/claiming **coding** → it's **building with AI.**
- ❌ Unsourced stats. Every number is primary-sourced, dated, current.
- ❌ College **admissions outcomes** ("gets you in" / "boosts your chances") or **résumé-padding** framing → ✅ a real product + an authentic founder story to point to; building for its own sake is what colleges (and the world) reward.

## College & the founder mindset (secondary angle — parent-facing)
A powerful angle for the **parent** (the buyer), layered on top of the build-led core — never replacing it.
- **What's true:** they finish with a **real, live product** (often with users) and a **founder's story** — concrete material for college essays, the activities list, interviews, and a portfolio. Selective admissions rewards demonstrated **initiative and real-world impact**; a shipped product with a problem → customers narrative is differentiated and memorable.
- **Frame it as evidence + a story, NOT an outcome.** Never promise admission or "boosts your chances"; never frame it as résumé-padding. (Both are unprovable, off-brand, and — for a packaged activity — actually *weaker* in an essay.)
- **It reinforces the soul:** the application benefit is a *consequence* of genuine building, not the goal. "Building real things is what colleges and the world reward" keeps us **build-led** ("raising builders, not consumers") while giving the parent a concrete "why now."
- **Subordinate, not the headline.** The thesis stays the build; college is a proof point + motivator, never the lead.

## Voice
- **Warm, confident, forward** — never fearful, never boastful.
- The brand speaks as **"us / we."**
- **The founder's name (Sunil Garg) appears ONLY in the bio/identity** — the founder note, the Book-a-call identity card, the certificate, the LinkedIn link, the JSON-LD founder entity. **Not** in CTAs or operational copy ("we'll be in touch," "we review it live," etc.).
- First person is fine **inside** the founder story/bio; everything else is team voice.
- **CTAs:** "Talk to us" (an option, never "first" / never a required gate) and "Pick a batch & enroll." Offer the free call **once** per view.
- Apply gradient/accent to a **single key word**, never whole sentences.

## Differentiation (state the category, never name competitors)
- What's out there: **$6,000+** summer or year-long intensives; **coding classes** that stop the moment the app works; **free material** that's easy to start and easy to abandon.
- Us: **affordable, focused 12 weeks**, build-with-AI then learn to grow — and **we begin where coding classes stop.**

## Canonical phrasings (keep identical everywhere)
- **Tagline:** "Raising builders, not consumers."
- **Mission ("More than money"):** *"…AI just collapsed the barrier to building — what once took a team and a budget, a motivated teenager can now do alone. So the edge isn't a credential; it's taste — knowing what's worth making — and starting early. We teach it by letting them live it: they build, they ship, then they learn to grow what they've made."*
- **Acts:** "0 → 1 · Build & launch the product" / "Learn how to grow it" / "Make your parents proud."
- **Format line:** "12 weeks, twice a week (~3 hrs), live on Zoom — Mon & Wed or Tue & Thu."

## Facts (single source — must match across all surfaces)
12 weeks · twice a week (~3 hrs) · **$999** · high school · Zoom · Mon&Wed / Tue&Thu ·
capstone Week 12 · no separate check-in · **Claude Pro (~$20/mo)** for the build weeks, everything else free · domain optional (~$10–20/yr).

## Surfaces that must stay in sync
When a fact or claim changes, update **all** of these together:
- Landing copy (`src/App.jsx`)
- **FAQ:** visible `FAQ_ITEMS` ↔ `FAQPage` JSON-LD in `index.html` (same count, same wording)
- `index.html` `<noscript>` fallback + SEO meta + JSON-LD (EducationalOrganization / Course)
- In-app onboarding / welcome / graduation emails
- Certificate copy
- Legal: `public/terms.html`, `public/privacy.html`, in-app `LEGAL`
