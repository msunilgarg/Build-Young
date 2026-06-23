// ============================ PROJECT KIT GENERATOR (SPECS/009) ============================
//
// Compiles a student's Week-1 bet (`s.build`) + Week-2 spec (`s.shape`) into the four files their
// building-AI reads every session — CLAUDE.md, SPEC.md, POSITIONING.md, PLAYBOOK.md. This is the
// connective tissue: the spec stops dead-ending as one prompt and becomes the durable docs that steer
// the build AND ground the "Check my work" step (the same way CLAUDE.md/SPECS/POSITIONING steer ours).
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

// The four files the kit produces (the student's repo gets these).
export const KIT_FILES = ["CLAUDE.md", "SPEC.md", "POSITIONING.md", "PLAYBOOK.md"];

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

## Definition of done
Build against the **"Done when…"** acceptance criteria in **SPEC.md**. A slice isn't done until it meets them.

## How we build
Follow **PLAYBOOK.md** — the Agentic Engineering Process (Spec → Build → Check → Ship), one small slice at a time.
`;

  // SPEC.md — the structured spec + the acceptance contract the build AND the check work against.
  const spec = `# Spec

## The core product
${val(sh.product, "the main thing your product does")}

## Accounts & saved data
${val(sh.accounts, "sign-in + what's saved per user")}

## Payments
${val(sh.payments, "what's free vs. paid, and what paying unlocks")}

## Production-ready
${val(sh.production, "emails, findability, data safety")}

## What success looks like
${val(sh.success, "how you'll know it's working — active use, retention, referrals")}

## Done when… (acceptance criteria)
${val(sh.acceptance, "a short list of checkable \"Done when…\" lines you can verify by looking")}
`;

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
- **One small slice at a time** — don't try to build everything at once.
- **Ship early** — put it live before it's perfect; real users surface the real problems.
- **You can't grade your own homework** — get an independent check before you call it done.
- **Keep secrets safe** — API keys live in environment variables, never in your code or the browser.
`;

  return { "CLAUDE.md": claude, "SPEC.md": spec, "POSITIONING.md": positioning, "PLAYBOOK.md": playbook };
}
