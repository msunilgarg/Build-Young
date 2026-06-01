// ============================ BATCH SIMULATION HARNESS ============================
//
// OFFLINE data-generation harness for Built Young. It drives the SAME simulation engine
// that powers the student dashboard (imported READ-ONLY from src/App.jsx + marketMedia.js)
// through the FULL student lifecycle — 12 course weeks + 6 monthly check-ins — for a whole
// cohort of 15 personas, then persists rich per-student + per-cohort data for founder review.
//
// ── How it mirrors the real app ──────────────────────────────────────────────
// The dashboard's "advance" button calls `advance(prev, macroEvent)` once per period, after
// the student has tinkered with sliders/buttons that mutate the state object. Each weekly
// "action" handler in WeekPanel/PortfolioPanel mutates state in a specific way; this harness
// replays those exact mutations (see decide + weekOps) BEFORE calling `advance`, so the
// numbers match what a real student would see. The macro event each period comes from the
// engine's own `marketEventFor(phase, week, checkin)`, so the market schedule is identical.
//
// ── Determinism ──────────────────────────────────────────────────────────────
// `advance` adds a random hustle bonus via Math.random(). To keep runs reproducible we
// install a seeded PRNG around the whole cohort run and restore Math.random afterward.
//
// ── Boundaries ───────────────────────────────────────────────────────────────
// This file imports the engine; it NEVER modifies it. All money is SIMULATED.

import {
  newState, advance, netWorth, holdingsTotal,
  RISK_PRESETS, ASSETS, BATCHES,
} from "../src/App.jsx";
import { WEEK_TITLES } from "../src/marketMedia.js";
// The market schedule + schedule-resolving mediaDrip are server-only now (so the future
// schedule never ships in the client bundle); the harness runs in node, so it imports them
// directly from the server module — same content the app fetches via /api/market-event.
import { marketEventFor, mediaDrip } from "../api/_lib/marketSchedule.js";

const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");
const round2 = (n) => Math.round(n * 100) / 100;
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ── Seeded PRNG (mulberry32) — deterministic across runs ──────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================ DECISION MUTATORS ============================
// Each mirrors the exact effect of the corresponding WeekPanel / PortfolioPanel handler
// in src/App.jsx. They mutate `n` in place (the harness deep-clones state before each period
// just like the UI's `set` helper does).

const decide = {
  // Week 1 — settings (401k); Week 2 — savings/brokerage rates + risk style.
  setSettings(n, { retire401k, savingsRate, brokerageRate }) {
    if (retire401k != null) n.settings.retire401k = retire401k;
    if (savingsRate != null) n.settings.savingsRate = savingsRate;
    if (brokerageRate != null) n.settings.brokerageRate = brokerageRate;
  },
  setRisk(n, risk) { n.settings.risk = risk; n.alloc = { ...RISK_PRESETS[risk] }; },
  // Week 5 buy handlers
  buyHome(n) { n.savings -= 7500; n.home = { value: 150000, mortgage: 142500, payment: 1000 }; },
  buyCar(n) { n.savings -= 3000; n.car = { value: 15000, loan: 12000, payment: 300 }; },
  // Week 6 emergency
  emergencyFromSavings(n) { n.savings -= 800; },
  emergencyOnCredit(n) { n.card.open = true; n.card.balance += 800; },
  // Week 6 spree vs invest (mirrors takeSpree / investInstead)
  spree(n) { n.cash -= 500; },
  investInstead(n) { n.cash -= 500; ASSETS.forEach((a) => { n.holdings[a.key] += 500 * (n.alloc[a.key] || 0); }); },
  // Week 7 credit card
  openCard(n) { n.card.open = true; },
  // Mirrors the dashboard's "Pay it off in full" button, which only renders when there's a
  // positive balance AND only pays what cash allows. Guard balance>0 and clamp pay to [0, cash]
  // so we never (a) act on a zero balance or (b) let negative cash inflate the balance — both
  // of which the live UI avoids by only showing the button with a real balance to clear.
  payCardInFull(n) {
    if (n.card.balance <= 0) return;
    const pay = Math.max(0, Math.min(n.cash, n.card.balance));
    n.cash -= pay; n.card.balance -= pay;
  },
  // Week 9 rebalance (mirrors PortfolioPanel.rebalance — re-weights existing holdings by preset)
  rebalance(n, preset) {
    n.settings.risk = preset; n.alloc = { ...RISK_PRESETS[preset] };
    const tot = ASSETS.reduce((a, x) => a + n.holdings[x.key], 0);
    ASSETS.forEach((x) => { n.holdings[x.key] = tot * RISK_PRESETS[preset][x.key]; });
  },
  // Week 10 hustle
  hustle(n) { n.hustle = true; n.cash -= 200; },
  // Week 11 protect
  buyBullion(n) { n.cash -= 1000; n.holdings.bullion += 1000; },
  buyReit(n) { n.cash -= 1000; n.holdings.reits += 1000; },
  buyPE(n) { n.cash -= 2000; n.pe = (n.pe || 0) + 2000; },
  insure(n) { n.insured = true; n.cash -= 150; },
};

// Deep clone exactly like the UI's `set`/`advance` helpers.
const clone = (o) => JSON.parse(JSON.stringify(o));

// Is a "once" goal already satisfied in this state? (prevents re-buying / re-doing.)
function alreadyDone(key, n) {
  switch (key) {
    case "buyHome": return !!n.home;
    case "buyCar": return !!n.car;
    case "buyPE": return (n.pe || 0) > 0;
    case "insure": return n.insured;
    case "openCard": return n.card.open;
    case "hustle": return n.hustle;
    // bullion/REIT can technically be bought repeatedly; we model a single $1k allocation.
    default: return false;
  }
}

// Funds gate mirroring the dashboard's disabled buy buttons. Returns null if affordable,
// else { note } describing the shortfall.
function fundsGate(key, n) {
  const short = (label) => ({ note: `wanted ${label} but couldn't afford it yet — saving toward it` });
  switch (key) {
    case "buyHome": return n.savings < 7500 ? short("a home ($7,500 down)") : null;
    case "buyCar": return n.savings < 3000 ? short("a car ($3,000 down)") : null;
    case "buyBullion": return n.cash < 1000 ? short("$1,000 in bullion") : null;
    case "buyReit": return n.cash < 1000 ? short("$1,000 in a REIT") : null;
    case "buyPE": return n.cash < 2000 ? short("$2,000 in private equity") : null;
    case "hustle": return n.cash < 200 ? short("to launch a hustle (−$200)") : null;
    case "insure": return n.cash < 150 ? short("insurance (−$150)") : null;
    default: return null;
  }
}

// ============================ PERSONAS ============================
// 15 distinct, deterministic behavior profiles. Each carries investing flags + funnel
// metadata (discoverySource, bookedCall, description). `weekOps` maps the flags onto the
// 12-week curriculum's action weeks.

// Helper to keep persona definitions readable (sensible defaults, override per persona).
const P = (over) => ({
  risk: "balanced", retire401k: 0.05, savingsRate: 0.25, brokerageRate: 0.2,
  buyHome: true, buyCar: true, emergency: "savings", spree: "invest",
  card: "payInFull", hustle: true, rebalance: null, insure: true,
  buyBullion: true, buyReit: true, buyPE: false, bookedCall: true,
  ...over,
});

// card: "never" | "payInFull" | "carry"
// emergency: "savings" | "credit"
// spree: "invest" | "treat"
// rebalance: null | "conservative" | "balanced" | "aggressive" (applied Week 9)
// Tuning note: on a $1,000 salary, living costs (−$350/period) are paid from CASH, and the
// overdraft guard pulls from savings when cash runs short. So the realistic way to fund a big
// purchase is a high SAVINGS rate paired with a LOW brokerage rate (so cash, not savings, eats
// the living costs). Personas are calibrated so their intended behavior actually occurs in the
// engine: dedicated savers reach the car ($3k) and even the home ($7.5k) down payment by the
// later periods/check-ins; heavy auto-investors stay cash-strapped (a real, teachable outcome).
const PERSONAS = [
  P({ name: "Ava Thompson", discoverySource: "Instagram",
    description: "Aggressive all-in investor; maxes the 401(k) match and pours pay into the brokerage, so she's cash-strapped for big buys but builds the biggest invested base. The textbook growth 'builder'.",
    risk: "aggressive", retire401k: 0.1, savingsRate: 0.1, brokerageRate: 0.45,
    buyHome: false, buyCar: false, spree: "invest", card: "payInFull", hustle: true,
    buyBullion: false, buyReit: false }),
  P({ name: "Liam Patel", discoverySource: "friend referral",
    description: "Balanced and steady; high savings, light investing, saves up for and buys a car, pays cards in full, takes the hustle.",
    risk: "balanced", retire401k: 0.05, savingsRate: 0.4, brokerageRate: 0.1, buyHome: false,
    buyBullion: false, buyReit: false }),
  P({ name: "Sofia Nguyen", discoverySource: "Google search",
    description: "Conservative; bonds-heavy, modest investing, skips big purchases to stay liquid, insures early. Risk-averse but disciplined.",
    risk: "conservative", retire401k: 0.06, savingsRate: 0.3, brokerageRate: 0.1,
    buyHome: false, buyCar: false, buyPE: false, hustle: false, buyBullion: false, buyReit: false }),
  P({ name: "Noah Garcia", discoverySource: "school flyer",
    description: "Spends first, invests later. Treats himself on the spree, puts the emergency on a card and carries the balance, no hustle. The cautionary tale.",
    risk: "balanced", retire401k: 0.02, savingsRate: 0.15, brokerageRate: 0.1,
    buyHome: false, buyCar: false, spree: "treat", card: "carry", emergency: "credit",
    hustle: false, insure: false, buyBullion: false, buyReit: false, bookedCall: false }),
  P({ name: "Maya Robinson", discoverySource: "Instagram",
    description: "Aggressive and engaged. Rebalances to aggressive mid-course to ride the tech rally, hustles. Invests heavily, skips big purchases.",
    risk: "aggressive", retire401k: 0.08, savingsRate: 0.15, brokerageRate: 0.4,
    buyHome: false, buyCar: false, rebalance: "aggressive", buyBullion: false, buyReit: false }),
  P({ name: "Ethan Kim", discoverySource: "YouTube",
    description: "Started aggressive, got nervous in the correction, rebalanced to conservative mid-course. Locks in a calmer mix; hustles for extra cash.",
    risk: "aggressive", retire401k: 0.05, savingsRate: 0.2, brokerageRate: 0.3,
    buyHome: false, buyCar: false, rebalance: "conservative", buyBullion: false, buyReit: false }),
  P({ name: "Olivia Martinez", discoverySource: "friend referral",
    description: "Balanced and well-rounded; saves up for a car, pays cards in full, hustles, insures, and adds a bullion + REIT slice. The diversified all-rounder.",
    risk: "balanced", retire401k: 0.05, savingsRate: 0.35, brokerageRate: 0.12, buyHome: false }),
  P({ name: "Lucas Brown", discoverySource: "podcast ad",
    description: "Low engagement — minimal contributions, never opens a card, skips every optional buy and the hustle. The 'missed it' student.",
    risk: "conservative", retire401k: 0, savingsRate: 0.1, brokerageRate: 0.05,
    buyHome: false, buyCar: false, card: "never", hustle: false, insure: false,
    buyBullion: false, buyReit: false, bookedCall: false }),
  P({ name: "Isabella Davis", discoverySource: "Google search",
    description: "Laser-focused HOME saver; max savings rate, zero brokerage, finances the emergency on a card (carrying a small balance) so every saved dollar keeps funding the down payment — buys the home during the check-ins and holds the equity. Real-estate-first.",
    risk: "conservative", retire401k: 0, savingsRate: 0.5, brokerageRate: 0,
    buyHome: true, buyCar: false, spree: "invest", emergency: "credit", card: "carry",
    hustle: false, insure: false, buyBullion: false, buyReit: false }),
  P({ name: "Mason Lee", discoverySource: "Instagram",
    description: "Balanced risk-taker who puts the emergency on a card and carries the balance, but offsets it with a hustle, a saved-up car, and steady investing. Mixed habits.",
    risk: "balanced", retire401k: 0.05, savingsRate: 0.3, brokerageRate: 0.12,
    buyHome: false, card: "carry", emergency: "credit", buyBullion: false, buyReit: false }),
  P({ name: "Charlotte Wilson", discoverySource: "school flyer",
    description: "Aggressive and all-in on the market: max 401(k), heavy brokerage, hustle, rebalances aggressive. High risk, high invested base, no big purchases.",
    risk: "aggressive", retire401k: 0.1, savingsRate: 0.1, brokerageRate: 0.45,
    buyHome: false, buyCar: false, rebalance: "aggressive", buyBullion: false, buyReit: false }),
  P({ name: "Elijah Moore", discoverySource: "Google search",
    description: "Balanced and simple; saves up for a car but rents (no home), pays cards in full, hustles, light bullion slice. Keeps it uncomplicated.",
    risk: "balanced", retire401k: 0.04, savingsRate: 0.35, brokerageRate: 0.12,
    buyHome: false, buyReit: false, buyBullion: true, bookedCall: false }),
  P({ name: "Amelia Taylor", discoverySource: "friend referral",
    description: "Conservative HOME-buyer; max savings, no brokerage, no hustle, finances the emergency on a card (carrying a small balance) to protect the down-payment fund. Buys the home during the check-ins and holds home equity. Real-estate-leaning.",
    risk: "conservative", retire401k: 0, savingsRate: 0.5, brokerageRate: 0,
    buyHome: true, buyCar: false, emergency: "credit", card: "carry",
    hustle: false, insure: false, buyBullion: false, buyReit: false }),
  P({ name: "James Anderson", discoverySource: "Reddit",
    description: "Aggressive builder; max 401(k), heavy brokerage, hustle, pays cards in full. Biggest invested base; stays cash-light so skips the big purchases.",
    risk: "aggressive", retire401k: 0.08, savingsRate: 0.12, brokerageRate: 0.45,
    buyHome: false, buyCar: false, buyBullion: false, buyReit: false }),
  P({ name: "Harper Thomas", discoverySource: "Instagram",
    description: "Balanced mid-engagement; takes the spree treat once, no hustle, saves up for a car, pays cards in full, stays diversified.",
    risk: "balanced", retire401k: 0.05, savingsRate: 0.3, brokerageRate: 0.12,
    buyHome: false, spree: "treat", hustle: false, buyBullion: false, buyReit: false }),
];

// ============================ PER-WEEK DECISION SCHEDULE ============================
// Maps the persona's flags onto the 12-week curriculum's action weeks (matching WEEKS in
// App.jsx). Returns the ordered list of {key, arg} ops to apply in a given course week
// (the engine's $1,000 salary keeps paying through the 6 check-ins too — see below).
//
// NOTE on big purchases: on a $1,000 salary with heavy auto-investing, savings accumulates
// slowly, so the home ($7,500 down) / car ($3,000 down) / PE ($2,000) buys are LIQUIDITY-
// gated. We model the realistic teen behavior of *saving toward a goal and buying when it's
// affordable*: an intending student attempts the purchase on the curriculum week the option
// is introduced and RETRIES every period after (including check-ins) until they can afford
// it — exactly what the dashboard's funds-gated buy button allows. Students who never clear
// the threshold simply never buy, and the data captures that honestly.
function weekOps(persona, week, phase) {
  const ops = [];
  const courseWeek = phase === "course" ? week : 99; // check-ins are "after week 12"
  // settings (course weeks 1–2)
  if (courseWeek === 1) ops.push({ key: "setSettings", arg: { retire401k: persona.retire401k } });
  if (courseWeek === 2) {
    ops.push({ key: "setSettings", arg: { savingsRate: persona.savingsRate, brokerageRate: persona.brokerageRate } });
    ops.push({ key: "setRisk", arg: persona.risk });
  }
  // big purchases: introduced Week 5, then retried every period until affordable
  if (courseWeek >= 5) {
    if (persona.buyHome) ops.push({ key: "buyHome", once: true });
    if (persona.buyCar) ops.push({ key: "buyCar", once: true });
  }
  // budget week (Week 6 only)
  if (courseWeek === 6) {
    ops.push({ key: persona.emergency === "credit" ? "emergencyOnCredit" : "emergencyFromSavings" });
    ops.push({ key: persona.spree === "treat" ? "spree" : "investInstead" });
  }
  // credit card (Week 7 only)
  if (courseWeek === 7 && persona.card !== "never") {
    ops.push({ key: "openCard" });
    // "carry" leaves the Week-6 emergency balance on the card; "payInFull" clears it.
    if (persona.card === "payInFull") ops.push({ key: "payCardInFull" });
  }
  // active investing rebalance (Week 9 only)
  if (courseWeek === 9 && persona.rebalance) ops.push({ key: "rebalance", arg: persona.rebalance });
  // hustle (Week 10 only)
  if (courseWeek === 10 && persona.hustle) ops.push({ key: "hustle" });
  // protect: bullion / REIT / PE / insurance — introduced Week 11, retried until affordable
  if (courseWeek >= 11) {
    if (persona.buyBullion) ops.push({ key: "buyBullion", once: true });
    if (persona.buyReit) ops.push({ key: "buyReit", once: true });
    if (persona.buyPE) ops.push({ key: "buyPE", once: true });
    if (persona.insure) ops.push({ key: "insure", once: true });
  }
  return ops;
}

// Human-readable description of an op, for the captured journal.
function describeOp(op) {
  switch (op.key) {
    case "setSettings": {
      const a = op.arg;
      const parts = [];
      if (a.retire401k != null) parts.push(`set 401(k) contribution to ${Math.round(a.retire401k * 100)}% (employer matches up to 5%)`);
      if (a.savingsRate != null) parts.push(`auto-save ${Math.round(a.savingsRate * 100)}% of net pay`);
      if (a.brokerageRate != null) parts.push(`auto-invest ${Math.round(a.brokerageRate * 100)}% of net pay to brokerage`);
      return parts.join("; ");
    }
    case "setRisk": return `chose a ${op.arg} investing style`;
    case "buyHome": return "bought a starter home ($150k, 5% down, ~$1,000/mo mortgage)";
    case "buyCar": return "bought a used car ($15k, 20% down, ~$300/mo loan)";
    case "emergencyFromSavings": return "covered the $800 emergency car repair from savings";
    case "emergencyOnCredit": return "put the $800 emergency car repair on a credit card";
    case "spree": return "took the $500 shopping spree (treat myself)";
    case "investInstead": return "invested the $500 instead of spending it";
    case "openCard": return "opened a first credit card";
    case "payCardInFull": return "paid the credit-card balance in full";
    case "rebalance": return `rebalanced the portfolio to a ${op.arg} mix`;
    case "hustle": return "launched a side build/hustle (−$200 to start, recurring income after)";
    case "buyBullion": return "bought $1,000 in bullion (gold inflation hedge)";
    case "buyReit": return "bought $1,000 in a REIT";
    case "buyPE": return "invested $2,000 in private equity (locked up)";
    case "insure": return "bought an insurance policy (−$150)";
    default: return op.key;
  }
}

// Snapshot the holdings/state numbers we capture each period.
function snapshot(s) {
  return {
    netWorth: round2(netWorth(s)),
    cash: round2(s.cash),
    savings: round2(s.savings),
    retirement: round2(s.retirement),
    holdings: {
      stocks: round2(s.holdings.stocks),
      bonds: round2(s.holdings.bonds),
      reits: round2(s.holdings.reits),
      bullion: round2(s.holdings.bullion),
    },
    privateEquity: round2(s.pe || 0),
    creditScore: s.creditScore,
    home: s.home ? { value: round2(s.home.value), mortgage: round2(s.home.mortgage), equity: round2(s.home.value - s.home.mortgage) } : null,
    car: s.car ? { value: round2(s.car.value), loan: round2(s.car.loan), equity: round2(s.car.value - s.car.loan) } : null,
    creditCard: { open: s.card.open, balance: round2(s.card.balance) },
    insured: s.insured,
    hustleActive: s.hustle,
  };
}

// Reconstruct the per-period recap email subject exactly as followupEmail() in App.jsx
// (which isn't exported). Called on the just-advanced state BEFORE the week/checkin counters
// roll — matching doAdvance's order. Returns null if there's nothing to send.
function recapEmail(s, batch) {
  if (s.phase === "course") {
    const last = s.week >= 12;
    return {
      type: "followup",
      when: "Just now",
      event: null,
      subject: last ? "Course complete — your check-ins are coming" : `Week ${s.week} recap + your next class`,
    };
  }
  return { type: "followup", when: "Just now", event: null, subject: `Check-in ${s.checkin + 1} recap` };
}

// Email-subject extraction: welcome email + per-period recaps + the 3-email media drips.
function collectEmails(s) {
  return (s.emails || []).map((m) => ({
    type: m.type,
    subject: m.subject,
    when: m.when,
    event: m.event || null,
  }));
}

// ============================ ONE STUDENT JOURNEY ============================
function runStudent(persona, batch) {
  const student = { name: persona.name, email: persona.email, batch: batch.id, track: batch.track };
  let s = newState(student);

  const funnel = ["discovered (" + persona.discoverySource + ")"];
  if (persona.bookedCall) funnel.push("booked a free 15-min call with Sunil");
  funnel.push("enrolled (" + batch.start + ")");
  funnel.push("started weekly engagement");

  const weekByWeek = [];

  // The lifecycle: 12 course weeks (phase "course"), then 6 check-ins (phase "checkin").
  // We advance exactly like the dashboard's doAdvance: apply this period's decisions, then
  // call advance(state, macroEvent), then roll the phase/week/checkin counters.
  let period = 0;
  const MAX_PERIODS = 18; // 12 weeks + 6 check-ins
  const introNoted = {}; // first-introduction "couldn't afford yet" note shown once per goal
  while (!s.done && period < MAX_PERIODS) {
    period += 1;
    const isCourse = s.phase === "course";
    const week = s.week;
    const checkin = s.checkin;
    const macro = marketEventFor(s.phase, week, checkin);
    const label = isCourse ? `Week ${week}: ${WEEK_TITLES[week - 1]}` : `Check-in ${checkin + 1} of 6`;

    // 1) Apply this period's decisions onto a working clone (mirrors the UI `set` helper).
    let working = clone(s);
    const decisionsMade = [];
    for (const op of weekOps(persona, week, s.phase)) {
      const fn = decide[op.key];
      if (!fn) continue;
      // Skip "once" goals already satisfied (owned/held/active) — no re-buying.
      if (alreadyDone(op.key, working)) continue;
      // No card balance to pay → the UI wouldn't show the button, so skip silently.
      if (op.key === "payCardInFull" && working.card.balance <= 0) continue;
      // Funds-gate the buy ops exactly like the dashboard's disabled button. For the
      // retried big-purchase goals, note the shortfall only once (the intro period).
      const gate = fundsGate(op.key, working);
      if (gate) {
        if (op.once && !introNoted[op.key]) { decisionsMade.push(gate.note); introNoted[op.key] = true; }
        else if (!op.once) { decisionsMade.push(gate.note); }
        continue;
      }
      if (op.arg !== undefined) fn(working, op.arg); else fn(working);
      decisionsMade.push(describeOp(op));
    }
    if (decisionsMade.length === 0) decisionsMade.push(isCourse ? "attended class; no portfolio changes this week" : "showed up, collected salary, let the portfolio ride");

    // 2) Advance one period (pay → allocate → macro → bills), mirroring doAdvance.
    let ns = advance(working, macro);
    ns.started = true;

    // Per-period recap email, reconstructed from followupEmail() in App.jsx (which is not
    // exported). doAdvance builds it from the just-completed period BEFORE rolling counters.
    const recap = recapEmail(ns, batch);
    if (recap) ns.emails = [recap, ...(ns.emails || [])];

    // 3) Roll phase/week/checkin counters exactly as doAdvance does.
    if (ns.phase === "course") {
      if (ns.week >= 12) { ns.phase = "checkin"; ns.week = 12; ns.done = false; }
      else ns.week += 1;
    } else {
      ns.checkin += 1;
      if (ns.checkin >= 6) ns.done = true;
    }

    // Pre-class media drip for the week we just arrived at (mirrors doAdvance).
    const media = mediaDrip(ns, batch);
    if (media.length) ns.emails = [...media, ...(ns.emails || [])];

    s = ns;

    const snap = snapshot(s);
    weekByWeek.push({
      period: label,
      phase: isCourse ? "course" : "checkin",
      marketEvent: { headline: macro.h, detail: macro.d, effects: macro.e },
      decisionsMade,
      ...snap,
    });
  }

  funnel.push("completed the 12-week course");
  funnel.push("completed 6 monthly check-ins");
  funnel.push("graduated");

  const final = snapshot(s);
  // total contributed = 18 paychecks of $1,000 (the only money that ever enters the sim).
  const totalPaychecks = 18 * 1000;
  const narrative = buildNarrative(persona, final);

  return {
    profile: {
      name: persona.name,
      slug: slugify(persona.name),
      email: persona.email,
      batchId: batch.id,
      track: batch.track,
      discoverySource: persona.discoverySource,
      bookedCall: persona.bookedCall,
      enrolledOn: batch.start,
      persona: persona.description,
      riskStyle: persona.risk,
      settings: {
        retire401k: persona.retire401k,
        savingsRate: persona.savingsRate,
        brokerageRate: persona.brokerageRate,
        finalRisk: s.settings.risk,
      },
    },
    funnel,
    weekByWeek,
    emailsReceived: collectEmails(s),
    final: {
      finalNetWorth: final.netWorth,
      totalPaychecksReceived: totalPaychecks,
      breakdown: {
        cash: final.cash,
        savings: final.savings,
        retirement: final.retirement,
        brokerageHoldings: round2(holdingsTotal(s)),
        privateEquity: final.privateEquity,
        homeEquity: final.home ? final.home.equity : 0,
        carEquity: final.car ? final.car.equity : 0,
        creditCardDebt: round2(s.card.balance),
      },
      creditScore: final.creditScore,
      boughtHome: !!s.home,
      boughtCar: !!s.car,
      carriedCardDebt: s.card.balance > 0,
      insured: s.insured,
      hustled: s.hustle,
      narrative,
    },
    _internal: { state: s }, // not serialized to the per-student file; used for cohort rollups
  };
}

function buildNarrative(persona, final) {
  const bits = [];
  bits.push(`${persona.name.split(" ")[0]} ran a ${persona.risk} strategy`);
  bits.push(final.home ? "bought a home" : "rented (no home)");
  bits.push(final.car ? "bought a car" : "skipped the car");
  if (final.creditCard.balance > 0) bits.push(`finished carrying ${fmt(final.creditCard.balance)} in card debt`);
  else if (final.creditCard.open) bits.push("used a credit card responsibly");
  else bits.push("never opened a credit card");
  if (final.hustleActive) bits.push("ran a side hustle for extra income");
  if (final.insured) bits.push("stayed insured");
  if (final.privateEquity > 0) bits.push("held private equity");
  return `${bits.join(", ")} — finishing with a simulated net worth of ${fmt(final.netWorth)} and a credit score of ${final.creditScore}. All figures simulated.`;
}

// ============================ COHORT ============================
export function runCohort(batchId, opts = {}) {
  const seed = opts.seed != null ? opts.seed : 12345;
  const batch = BATCHES.find((b) => b.id === batchId);
  if (!batch) throw new Error(`Unknown batchId: ${batchId}`);

  // Install seeded PRNG for deterministic hustle bonuses; restore afterward.
  const realRandom = Math.random;
  // Mix the seed with the batchId so the two cohorts get distinct-but-reproducible streams.
  let mix = seed >>> 0;
  for (const ch of batchId) mix = (Math.imul(mix, 31) + ch.charCodeAt(0)) >>> 0;
  Math.random = mulberry32(mix);

  let students;
  try {
    // Each persona gets an email at example.com derived from their name.
    students = PERSONAS.map((base) => {
      const email = slugify(base.name).replace(/-/g, ".") + "@example.com";
      return runStudent({ ...base, email }, batch);
    });
  } finally {
    Math.random = realRandom; // always restore
  }

  // Tuition-prize ranking: highest portfolio value wins. We rank by net worth (the
  // dashboard's headline figure & the contest criterion — "highest portfolio value").
  const ranked = [...students].sort((a, b) => b.final.finalNetWorth - a.final.finalNetWorth);
  ranked.forEach((st, i) => { st.profile.prizeRank = i + 1; });

  const nws = students.map((s) => s.final.finalNetWorth);
  const sum = nws.reduce((a, b) => a + b, 0);
  const byRisk = {};
  for (const st of students) {
    const r = st.profile.riskStyle;
    byRisk[r] = byRisk[r] || { count: 0, totalNetWorth: 0, students: [] };
    byRisk[r].count += 1;
    byRisk[r].totalNetWorth += st.final.finalNetWorth;
    byRisk[r].students.push(st.profile.name);
  }
  Object.values(byRisk).forEach((g) => { g.avgNetWorth = round2(g.totalNetWorth / g.count); });

  const summary = {
    batchId: batch.id,
    track: batch.track,
    day: batch.day,
    start: batch.start,
    price: batch.price,
    seats: batch.seats,
    studentCount: students.length,
    seed,
    averageNetWorth: round2(sum / students.length),
    minNetWorth: round2(Math.min(...nws)),
    maxNetWorth: round2(Math.max(...nws)),
    prizeWinner: { name: ranked[0].profile.name, netWorth: ranked[0].final.finalNetWorth },
    distributionByRiskStyle: byRisk,
    notableOutcomes: {
      boughtHome: students.filter((s) => s.final.boughtHome).map((s) => s.profile.name),
      boughtCar: students.filter((s) => s.final.boughtCar).map((s) => s.profile.name),
      carriedCardDebt: students.filter((s) => s.final.carriedCardDebt).map((s) => s.profile.name),
      hustled: students.filter((s) => s.final.hustled).map((s) => s.profile.name),
      heldPrivateEquity: students.filter((s) => s.final.breakdown.privateEquity > 0).map((s) => s.profile.name),
      bookedCallBeforeEnrolling: students.filter((s) => s.profile.bookedCall).map((s) => s.profile.name),
    },
    ranking: ranked.map((s) => ({
      rank: s.profile.prizeRank,
      name: s.profile.name,
      riskStyle: s.profile.riskStyle,
      finalNetWorth: s.final.finalNetWorth,
      creditScore: s.final.creditScore,
    })),
    roster: students.map((s) => ({
      name: s.profile.name,
      email: s.profile.email,
      discoverySource: s.profile.discoverySource,
      bookedCall: s.profile.bookedCall,
      riskStyle: s.profile.riskStyle,
    })),
  };

  return { batch, summary, students };
}

// CSV row builder for spreadsheet review.
export function cohortCsv(students) {
  const header = ["name", "email", "discoverySource", "bookedCall", "riskStyle", "finalNetWorth", "prizeRank", "boughtHome", "boughtCar", "carriedCardDebt", "creditScore"];
  const rows = [header.join(",")];
  for (const s of students) {
    rows.push([
      `"${s.profile.name}"`,
      s.profile.email,
      `"${s.profile.discoverySource}"`,
      s.profile.bookedCall,
      s.profile.riskStyle,
      s.final.finalNetWorth,
      s.profile.prizeRank,
      s.final.boughtHome,
      s.final.boughtCar,
      s.final.carriedCardDebt,
      s.final.creditScore,
    ].join(","));
  }
  return rows.join("\n") + "\n";
}

// Strip the internal state before writing per-student files.
export function studentForFile(s) {
  const { _internal, ...rest } = s;
  return rest;
}

export { PERSONAS, slugify };
