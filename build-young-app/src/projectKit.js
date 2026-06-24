// ============================ PROJECT KIT GENERATOR (SPECS/009 + 011) ============================
//
// Compiles a student's Week-1 bet (`s.build`) + per-feature specs (`s.shape`) into the files their
// building-AI reads every session — CLAUDE.md, a SPECS/ folder (one file per feature, SPECS/011),
// POSITIONING.md, PLAYBOOK.md. This is the connective tissue: each feature's spec stops dead-ending as
// one prompt and becomes a durable doc that steers the build AND grounds the "Check my work" step (the
// same way CLAUDE.md/SPECS/POSITIONING steer ours).
//
// Pure + dependency-free (foundation): deterministic, no AI, offline-safe. The optional AI expand/polish
// layer (SPECS/009 T45) sits on top server-side; THIS is the always-on base and its fallback.

// The Agentic Engineering Process — the named method, single source of truth (drives BOTH the in-app
// `AgenticProcessPrimer` and the generated PLAYBOOK.md). Spec → Build → Check → Ship.
export const AGENTIC_STEPS = [
  { n: "Spec", d: "decide what \"done\" looks like before you build — write it down so you (and the AI) don't drift." },
  { n: "Build", d: "hand the AI your spec and build the next small slice — one working piece at a time." },
  { n: "Check", d: "get an independent check before you call it done — you can't grade your own homework." },
  { n: "Ship", d: "put the working slice live. Small, finished, real — then loop back to Spec for the next piece." },
];

// One spec per feature (SPECS/011) — the build weeks, in order. `key` is the s.shape field; `file` is
// the spec's filename (spec name = feature name); `title` heads the file + the in-app example. The
// student writes each in its build week and has their AI commit + implement it.
export const FEATURE_SPECS = [
  { key: "product", file: "core-product", title: "Core product", lesson: 2 },
  { key: "accounts", file: "accounts", title: "Accounts & saved data", lesson: 3 },
  { key: "payments", file: "payments", title: "Payments", lesson: 4 },
  { key: "production", file: "production-ready", title: "Production-ready", lesson: 5 },
  { key: "polish", file: "polish-and-iterate", title: "Polish & iterate", lesson: 6 },
  { key: "funnel", file: "funnel", title: "The funnel", lesson: 8 },
];
// The repo path for a feature's spec file (e.g. "product" → "SPECS/core-product.md").
export const specFileFor = (key) => {
  const f = FEATURE_SPECS.find((x) => x.key === key);
  return `SPECS/${f ? f.file : "feature"}.md`;
};

// The files the kit produces (the student's repo gets these). The SPECS/ folder is one file per feature
// plus an overview (the product-level vision + acceptance), mirroring our own repo.
export const KIT_FILES = [
  "CLAUDE.md",
  "SPECS/000-overview.md",
  ...FEATURE_SPECS.map((f) => specFileFor(f.key)),
  "POSITIONING.md",
  "PLAYBOOK.md",
];

// A spec field, or a gentle placeholder when empty — never "undefined" in the student's repo.
const val = (v, placeholder) => {
  const s = String(v == null ? "" : v).trim();
  return s || `_(${placeholder} — fill this in)_`;
};

export function buildProjectKit({ build = {}, shape = {} } = {}) {
  const b = build || {};
  const sh = shape || {};

  // CLAUDE.md — the project guide the AI reads every session (with guardrails baked in).
  const claude = `# Project guide (CLAUDE.md)

> Your AI build partner reads this first, every session. Keep it true and up to date.

## What this is
${val(sh.product, "your core product — what it is, who it's for, the one 'wow'")}

## Who it's for / the problem
${val(b.pain, "the customer and the problem you're solving")}

## How we talk about it
- Our one promise: ${val(b.promise, "the single thing you promise a customer")}
- Voice + the claims we make vs. avoid live in **POSITIONING.md**.

## Accounts & saved data
${val(sh.accounts, "who signs in and what's saved for each person")}
- Guardrail: use a trusted, standard sign-in — **never write your own password code**.

## Payments
${val(sh.payments, "what people pay for and what they get")}
- Guardrail: use a trusted checkout like **Stripe** — **never handle card details yourself**.

## Production / going live
${val(sh.production, "emails, being findable, keeping data safe")}
- Guardrail: keep secret keys **off the browser** (use environment variables); protect users' data — they may be minors.

## How we spec
One feature = one short spec in the **\`SPECS/\` folder** (\`SPECS/core-product.md\`, \`SPECS/accounts.md\`, …).
Each build week, write that feature's spec, commit it, then build it. \`SPECS/000-overview.md\` holds the
product vision + the **"Done when…"** acceptance a slice is checked against.

## Definition of done
A slice isn't done until it meets the **"Done when…"** acceptance in **SPECS/000-overview.md** (and the
feature's own spec). Get an independent check before calling it done.

## How we build
Follow **PLAYBOOK.md** — the Agentic Engineering Process (Spec → Build → Check → Ship), one small slice at a time.
`;

  // SPECS/000-overview.md — the product-level vision + the acceptance contract the build + check work against.
  const overview = `# Overview

## What success looks like
${val(sh.success, "how you'll know it's working — active use, retention, referrals, earning more than it costs")}

## Done when… (acceptance criteria)
${val(sh.acceptance, "a short list of checkable \"Done when…\" lines you can verify by looking")}

## The features (one spec each, in SPECS/)
${FEATURE_SPECS.map((f) => `- **${f.title}** — \`${specFileFor(f.key)}\` (Lesson ${f.lesson})`).join("\n")}
`;

  // SPECS/<feature>.md — one short spec per feature (SPECS/011). Written + committed + built per week.
  const featureSpecs = {};
  for (const f of FEATURE_SPECS) {
    featureSpecs[specFileFor(f.key)] = `# ${f.title}

> One feature = one short spec (Lesson ${f.lesson}). Write it, commit it, then have your AI build it.

${val(sh[f.key], `the ${f.title.toLowerCase()} — what it is and what "done" looks like`)}
`;
  }

  // POSITIONING.md — voice + the honest claims line.
  const positioning = `# Positioning

## Our one promise
${val(b.promise, "the single thing you promise a customer, in one line")}

## How we describe it
${val(b.pr, "your press-release statement — what it is, who it helps, the payoff")}

## Who it's for
${val(b.pain, "the customer and the problem")}

## Claims we make vs. claims we avoid
Be honest: what's **true now** you can say plainly; what's still a **goal** you describe as where you're headed — never as already true.

${val(b.trueVsGoal, "what's true today vs. what's still the goal")}
`;

  // PLAYBOOK.md — the shared agentic rules (the four steps come from AGENTIC_STEPS, the single source).
  const playbook = `# How we build — the Agentic Engineering Process

This is how real builders work with AI — and how Build Young itself was built. The same loop, every time you build something:

${AGENTIC_STEPS.map((st, i) => `${i + 1}. **${st.n}** — ${st.d}`).join("\n")}

A few rules that make the loop work:
- **One feature = one short spec** — write it in \`SPECS/\`, commit it, then build it.
- **One small slice at a time** — don't try to build everything at once.
- **Ship early** — put it live before it's perfect; real users surface the real problems.
- **You can't grade your own homework** — get an independent check before you call it done.
- **Keep secrets safe** — API keys live in environment variables, never in your code or the browser.
`;

  return {
    "CLAUDE.md": claude,
    "SPECS/000-overview.md": overview,
    ...featureSpecs,
    "POSITIONING.md": positioning,
    "PLAYBOOK.md": playbook,
  };
}
