// ============================ MARKET MEDIA (client-safe, dependency-free) ============================
//
// CLIENT-SAFE content + email builders for the simulated "market media".
//
// IMPORTANT — what is NOT here (by design): the market-event SCHEDULE. The future
// schedule (FLAT_MACRO / MACRO / CHECKIN_MACRO / marketEventFor) and the per-event MEDIA
// map now live SERVER-ONLY in api/_lib/marketSchedule.js, so the browser bundle never
// contains future events (anti-gaming for the tuition prize — see CLAUDE.md). The client
// learns the CURRENT event by fetching /api/market-event at advance time; this module only
// holds (a) small static metadata the client legitimately needs and (b) the PURE email
// builders that take an already-resolved event + media as parameters.
//
// This file has NO React and NO lucide imports on purpose: it is shared between the browser
// app (src/App.jsx, which re-exports the safe pieces) and the serverless schedule module
// (api/_lib/marketSchedule.js), which calls the same builders so the email content stays
// byte-identical whether rendered client-side (demo) or server-side (cron).
//
// What lives here:
//   - pct                       — percentage formatter used in email bodies
//   - ASSET_META                — minimal asset metadata (key + label ONLY)
//   - WEEK_TITLES               — the 12 weekly lesson titles (for email subjects)
//   - NEWSROOM_FROM_EMAIL       — the from-address on drip emails
//   - buildMediaDrip(ev, media, s, opts) — pure 3-email drip builder (event injected)

export const pct = (n) => (n >= 0 ? "+" : "") + (n * 100).toFixed(1) + "%";

// Minimal asset metadata. App.jsx builds its richer ASSETS array (with colors + lucide
// icons) on top of these keys/labels; keeping just key+label here avoids dragging the
// theme + icon imports into a serverless context.
export const ASSET_META = [
  { key: "stocks", label: "Stocks" },
  { key: "bonds", label: "Bonds" },
  { key: "reits", label: "Real Estate" },
  { key: "bullion", label: "Bullion" },
];

// The 12 weekly lesson titles (Act/curriculum order). App.jsx's richer WEEKS array carries
// subtitles + actions; the scheduler only needs the title for email subjects/body.
export const WEEK_TITLES = [
  "Build: Find a Problem Worth Solving",
  "Build: Shape the Idea",
  "Build: Make It (with AI)",
  "Build: Launch & First Customers",
  "Build: Price It & Get Paid",
  "Build: Grow What's Working",
  "Set Up Your Business Finances",
  "Savings & Investing + Compounding",
  "Macro Forces on Investments",
  "Big Purchases: Buy, Finance & Live With It",
  "Budgeting: Surprises & Temptations",
  "Capstone: What You Built & What It's Worth",
];

// Homework to prepare for each week (index = week − 1). Sent in the week-completion email
// (prep for the NEXT week) and the 2-days-before class reminder. Kept here (dependency-free) so
// the app email + the cron reminder share one source. DRAFTS — refine the copy any time; an empty
// string means "no homework section" for that week.
export const WEEK_PREP = [
  "Come with 3 problems you (or people you know) run into — small, real, a little annoying. We'll pick one to build around.",
  "Using last week's problem, jot a one-line idea, who it's for, the single \"magic moment\" it nails, and the smallest version you could build. (See the Shape-the-Idea steps.)",
  "Make sure your Claude account + tools are ready. Bring your shaped idea — we build the first version together, live.",
  "Get your build to a point you can show someone. Line up 2–3 people who actually have the problem to try it.",
  "List what your product does for someone, and what a fair price feels like. Bring any feedback from your first testers.",
  "Note which feature (or which people) responded best — and bring one idea for doing more of what's working.",
  "Bring a rough guess at what your build could earn in a month. We'll set up self-employment taxes and paying yourself.",
  "Think about one short-term goal (something you want) and one long-term goal. We'll set your auto-save + investing style.",
  "Skim one recent headline about inflation, interest rates, or the economy — we'll watch it move your portfolio.",
  "Pick a big thing you'd buy one day (a car, a place) and a rough price. We'll learn to finance it without wrecking your budget.",
  "Jot your typical monthly wants vs. needs. We'll handle a surprise expense and a tempting splurge.",
  "Be ready to show what you built and what it's worth — and to say what you'd build next.",
];

// The from-address used on the drip emails. Kept as a constant here so the content stays
// identical whether it's rendered in the browser app or the serverless scheduler. (App.jsx
// historically used CONFIG.contactEmail, which is this same value.)
export const NEWSROOM_FROM_EMAIL = "team@build-young.com";

// Build the 3-day pre-class media drip for an ALREADY-RESOLVED course-week event.
//
// This is a PURE builder: the caller injects the resolved `ev` ({h,d,e}) and its `media`
// ({analog,watch,question,resources}) so this function never needs the schedule. The
// server (api/_lib/marketSchedule.js → mediaDrip) resolves them from the full schedule; the
// client gets them from /api/market-event. Either way the output is byte-identical to the
// original single-sourced mediaDrip.
//
// Returns [] if it's not a course week or there's no authored media for the event.
// Newest-first (day -1 leads), so it reads naturally in the inbox.
//
// `opts.fromEmail` lets a caller override the newsroom from-address (defaults to the
// constant above so the content matches the original behavior exactly).
export function buildMediaDrip(ev, media, s, opts = {}) {
  if (!s || s.phase !== "course") return [];
  if (!ev || !media) return [];
  const first = (s.student.name || "there").split(" ")[0];
  const title = WEEK_TITLES[s.week - 1];
  const moves = ASSET_META.map((a) => `${a.label} ${pct(ev.e[a.key])}`).join(", ");
  const from = `Build Young Newsroom <${opts.fromEmail || NEWSROOM_FROM_EMAIL}>`;
  const stamp = Date.now();
  const base = { from, type: "media", event: ev.h, resources: media.resources };
  const breaking = {
    ...base, id: `m3_${s.week}_${stamp}`, when: "3 days before class", day: 3,
    subject: `📰 Breaking: ${ev.h}`,
    body: `Hi ${first},

Heads up before Week ${s.week}'s class ("${title}") — a market event just broke in your simulation:

${ev.h}. ${ev.d}

This is simulated for class, but it's modeled on a real event: ${media.analog}. Over the next three days I'll send a little more so you can research it yourself and walk in with your own view. Start digging with the resources below.`,
  };
  const analysis = {
    ...base, id: `m2_${s.week}_${stamp}`, when: "2 days before class", day: 2,
    subject: `What "${ev.h}" means for your money`,
    body: `Hi ${first},

Two days until class. In the simulation, this event pushes the asset classes in different directions: ${moves}. Notice they don't all move together — that's the whole case for diversification.

In the real world, this mirrors ${media.analog}. Keep an eye on ${media.watch}. The resources below show the real data.`,
  };
  const challenge = {
    ...base, id: `m1_${s.week}_${stamp}`, when: "1 day before class", day: 1,
    subject: `Class tomorrow — come with your own view`,
    body: `Hi ${first},

Class is tomorrow. Before we meet, do your own analysis and bring an opinion:

${media.question}

There are no wrong answers if you can back them up with what you find. Pull the real data and decide for yourself, then we'll compare notes in class.`,
  };
  return [challenge, analysis, breaking]; // newest first
}
