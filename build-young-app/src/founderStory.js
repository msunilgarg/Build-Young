// ============================ FOUNDER STORY GENERATOR (SPECS/010) ============================
//
// Compiles a student's capstone reflection (s.reflect[11]) + their build (s.build / s.shape) into an
// honest, application-ready one-pager — for college essays, the activities list, interviews, a portfolio.
// Their own words, assembled and framed well. Pure + dependency-free (foundation), deterministic,
// offline-safe; placeholders for empty fields. NO admissions-outcome language anywhere — it's evidence
// and a story, never "this gets you in" / "boosts your chances" (POSITIONING guardrail).

const val = (v, placeholder) => {
  const s = String(v == null ? "" : v).trim();
  return s || `_(${placeholder})_`;
};

// A worked model — Build Young itself as the example product (mirrors SHAPE_EXAMPLE) — so students see
// what a strong founder story looks like (shown via an ExampleCard at Lesson 11).
export const FOUNDER_STORY_EXAMPLE = {
  build: {
    promise: "Raising builders, not consumers — teens build a real product with AI in 12 weeks.",
    pain: "Teens are taught to consume technology, not create it — and 'learn to code' classes stop the moment the app works, long before anything is real.",
  },
  shape: { product: "A live, online program + web app where high schoolers build a real product with AI, take it live, and go get their first customers." },
  reflect: {
    11: {
      whatBuilt: "Build Young — a 12-week program and web app that turns teenagers into builders who ship a real product with AI.",
      proud: "Watching a 15-year-old share a link to something they built and seeing a stranger actually use it.",
      whoUses: "High-school students and their families; the first cohorts enroll, build, and present a live product at a capstone.",
      next: "More cohorts, partner schools, and tools that help each student land their first paying customer.",
    },
  },
};

// Build the one-pager. `reflect` is the whole s.reflect object; the capstone-prep fields live at [11].
export function buildFounderStory({ build = {}, shape = {}, reflect = {} } = {}) {
  const b = build || {};
  const sh = shape || {};
  const r = (reflect && reflect[11]) || {};
  const built = r.whatBuilt || sh.product;

  return `# My founder story

## In one line
${val(b.promise || r.whatBuilt, "your product in one line")}

## The problem I saw
${val(b.pain, "who has this problem and what's frustrating about it today")}

## What I built (with AI)
${val(built, "what you built and what it does")}

## Who's using it
${val(r.whoUses, "who tried it or signed up — friends, classmates, a team; any numbers you have")}

## What I'm proudest of
${val(r.proud, "the moment or part of the build you most want to show")}

## What I'd build next
${val(r.next, "where you'd take it if you kept going")}

---

## How to use this
- **Essay hook:** "I noticed ${val(b.pain, "a real problem")} — so I built ${val(built, "a product")} with AI and went after my first customers."
- **Activities list:** Founder — built and launched ${val(built, "a real product")}; ${val(r.whoUses, "real people use it")}.
- **30-second answer (interviews):** ${val(built, "I built a product")}. It started from a real problem — ${val(b.pain, "something people were stuck on")}. ${val(r.whoUses, "Real people use it")}, and what I'm proudest of is ${val(r.proud, "shipping something real")}. Next, ${val(r.next, "I'd keep growing it")}.

> This is *your* real product and your real story — and honest is exactly what makes it strong.
`;
}
