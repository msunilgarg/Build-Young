// ============================ ACQUISITION & ENGAGEMENT FUNNEL ============================
//
// ONE source of truth for the founder funnel: the ordered stages, the event names that feed
// them, and ALL the conversion / curve / revenue math. The client (`track()` + FounderDashboard
// in App.jsx), the server read endpoint (api/funnel.js), and the tests all import from here so
// the definitions can never drift.
//
// PRIVACY: events are aggregate/operational only — season, track, batch id, week/check-in index,
// refund tier, and cents. No email, name, or other student PII ever lives in an event.
//
// Dependency-free (no React/lucide) so it can be imported by serverless code and tests too.

import { BATCHES, SEASONS, seasonLabel, CHECKINS } from "./cohorts.js";

// Raw event names fired by track() in App.jsx, in lifecycle order. `week_advanced` and
// `checkin_completed` are the progression curves; `withdrawn` is the exit branch.
export const EVENTS = [
  "visited", "enroll_started", "call_booked", "enrolled",
  "class_started", "week_advanced", "graduated", "checkin_completed", "withdrawn",
  // Traffic & engagement signals (not funnel stages): per-screen dwell + the exit screen.
  "screen_view", "exit",
  // Demand signal (not a funnel stage): a visitor asked for a different schedule/timezone.
  "schedule_requested",
  // Drop-off signal (not a funnel stage): a visitor told us why they're hesitating on Enroll.
  "hesitation",
];

// The linear conversion funnel (the spine). `call_booked` is a parallel assist path and the
// week/check-in stages are curves — both surfaced separately below, not as spine stages.
export const STAGES = [
  { key: "visited",        event: "visited",        label: "Visited",        desc: "Landing page viewed" },
  { key: "enroll_started", event: "enroll_started", label: "Enroll started", desc: "Began the enroll flow" },
  { key: "enrolled",       event: "enrolled",       label: "Enrolled",       desc: "Completed the payment step" },
  { key: "class_started",  event: "class_started",  label: "Class started",  desc: "First session attended" },
  { key: "graduated",      event: "graduated",      label: "Graduated",      desc: "Completed all 12 weeks" },
];

export const REFUND_TIERS = ["full", "prorated", "none"];
// One combined teen track now ("Builders"); segmentation is meaningful by season, not age.
export const TRACKS = ["Builders"];

export { SEASONS, seasonLabel };

// Cohort metadata to attach to an enrollment-side event, from the catalog (no PII).
export function cohortMeta(batchId) {
  const b = BATCHES.find((x) => x.id === batchId);
  return b
    ? { batchId: b.id, season: b.season, track: b.track, priceCents: Math.round(b.price * 100) }
    : { batchId: batchId || null, season: null, track: null, priceCents: 0 };
}

// Conversion rate numer/denom as a fraction in [0,1]; 0 when the denominator is 0.
export function conversionRate(numer, denom) {
  return denom > 0 ? numer / denom : 0;
}
// One-decimal percentage string for display (named to avoid clashing with marketMedia's `pct`).
export const ratePct = (frac) => `${Math.round(frac * 1000) / 10}%`;

// Does an event satisfy a {season, track} segment filter? Top-of-funnel events that don't carry
// a cohort dimension (visited / enroll_started / call_booked) are EXCLUDED when a filter is
// active, since their cohort is unknown — segmentation is meaningful from `enrolled` onward.
function matches(ev, filter) {
  if (!filter) return true;
  if (filter.season && ev.props?.season !== filter.season) return false;
  if (filter.track && ev.props?.track !== filter.track) return false;
  return true;
}

// Aggregate the raw event stream into a funnel summary. `filter` optionally narrows to a
// {season, track} segment for cohort comparison.
export function summarize(events, filter = null) {
  const evs = Array.isArray(events) ? events : [];
  const where = (name, extra) => evs.filter((e) =>
    e && e.event === name && matches(e, filter) && (!extra || extra(e)));
  const count = (name, extra) => where(name, extra).length;

  // Linear funnel counts, in stage order.
  const counts = {};
  STAGES.forEach((s) => { counts[s.key] = count(s.event); });

  // Stage-to-stage conversion between each consecutive pair (where the drop-off shows).
  const steps = [];
  for (let i = 1; i < STAGES.length; i++) {
    const from = STAGES[i - 1], to = STAGES[i];
    steps.push({
      from: from.key, to: to.key, fromLabel: from.label, toLabel: to.label,
      fromCount: counts[from.key], toCount: counts[to.key],
      rate: conversionRate(counts[to.key], counts[from.key]),
    });
  }
  const overall = conversionRate(counts.enrolled, counts.visited); // visited → enrolled

  // Parallel assist path: calls booked, and the call→enroll vs. direct-enroll split.
  const callBooked = count("call_booked");
  const enrolledFromCall = count("enrolled", (e) => !!e.props?.fromCall);
  const enrolledDirect = counts.enrolled - enrolledFromCall;

  // Week-by-week progression curve (weeks 2..12 — week N = students who advanced to it).
  const weekCurve = [];
  for (let w = 2; w <= 12; w++) weekCurve.push({ week: w, label: `W${w}`, value: count("week_advanced", (e) => e.props?.week === w) });
  // Check-in retention curve — one point per monthly check-in (CHECKINS, currently 1).
  const checkinCurve = [];
  for (let c = 1; c <= CHECKINS; c++) checkinCurve.push({ checkin: c, label: `M${c}`, value: count("checkin_completed", (e) => e.props?.checkin === c) });

  // Withdrawals as an exit branch, tagged by refund tier + the cancellation reason.
  const withdrawals = { total: count("withdrawn"), byTier: {}, byReason: {} };
  REFUND_TIERS.forEach((t) => { withdrawals.byTier[t] = count("withdrawn", (e) => e.props?.refundTier === t); });
  where("withdrawn").forEach((e) => {
    const r = e.props?.reason || "unspecified";
    withdrawals.byReason[r] = (withdrawals.byReason[r] || 0) + 1;
  });

  // Revenue = enrolled prices − refunds (cents).
  const grossCents = where("enrolled").reduce((s, e) => s + (e.props?.priceCents || 0), 0);
  const refundedCents = where("withdrawn").reduce((s, e) => s + (e.props?.refundCents || 0), 0);

  return {
    filter, counts, steps, overall,
    calls: { booked: callBooked, enrolledFromCall, enrolledDirect },
    weekCurve, checkinCurve, withdrawals,
    revenue: { grossCents, refundedCents, netCents: grossCents - refundedCents },
  };
}

// Per-season and per-track segment summaries, for side-by-side cohort comparison.
export function segments(events) {
  return {
    bySeason: SEASONS.map((s) => ({ key: s.key, label: s.label, summary: summarize(events, { season: s.key }) })),
    byTrack: TRACKS.map((t) => ({ key: t, label: t, summary: summarize(events, { track: t }) })),
  };
}

// ---- Traffic & engagement (the "before enrollment" picture) -------------------------------
//
// Aggregates the anonymous engagement stream — `visited` (carries a referrer `source`),
// `screen_view` (a `screen` + dwell `ms`), and `exit` (the last `screen` before leaving) — into:
//   • sources — where visits come from (referrer host / "direct"), most common first
//   • countries — visitor country (2-letter code, server-stamped from Vercel geo), most common first
//   • screens — per-screen view count + average time spent (ms), busiest first
//   • exits   — which screen people leave from, count + share of all exits, most common first
// Pure aggregate, no PII. Returns empty arrays when there's nothing yet.
export function engagement(events) {
  const evs = Array.isArray(events) ? events : [];

  // Visit sources (referrer host or "direct"), from the `visited` event.
  const srcCount = {};
  evs.forEach((e) => {
    if (e && e.event === "visited") {
      const s = (e.props && e.props.source) || "direct";
      srcCount[s] = (srcCount[s] || 0) + 1;
    }
  });
  const sources = Object.entries(srcCount)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Visit geography: 2-letter country code stamped server-side on `visited` (from Vercel's
  // x-vercel-ip-country header). Country-level only — no city/precise location. Most common first.
  const ctyCount = {};
  evs.forEach((e) => {
    if (e && e.event === "visited" && e.props && e.props.country) {
      const c = e.props.country;
      ctyCount[c] = (ctyCount[c] || 0) + 1;
    }
  });
  const countries = Object.entries(ctyCount)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);

  // Per-screen attention: count of views + mean dwell (ms), from `screen_view`.
  const agg = {}; // screen -> { views, totalMs }
  evs.forEach((e) => {
    if (e && e.event === "screen_view" && e.props && e.props.screen) {
      const s = e.props.screen;
      const ms = Number(e.props.ms) || 0;
      if (!agg[s]) agg[s] = { views: 0, totalMs: 0 };
      agg[s].views += 1;
      agg[s].totalMs += ms;
    }
  });
  const screens = Object.entries(agg)
    .map(([screen, v]) => ({ screen, views: v.views, avgMs: v.views ? Math.round(v.totalMs / v.views) : 0 }))
    .sort((a, b) => b.views - a.views);

  // Exit screens: where people leave the site, from `exit`.
  const exitCount = {};
  let exitTotal = 0;
  evs.forEach((e) => {
    if (e && e.event === "exit" && e.props && e.props.screen) {
      exitCount[e.props.screen] = (exitCount[e.props.screen] || 0) + 1;
      exitTotal += 1;
    }
  });
  const exits = Object.entries(exitCount)
    .map(([screen, count]) => ({ screen, count, pct: exitTotal ? count / exitTotal : 0 }))
    .sort((a, b) => b.count - a.count);

  // Why people hesitate on Enroll: the aggregate `reason` from the `hesitation` chip row. Raw
  // value + count (the UI maps the value to a human label); most common first.
  const hesCount = {};
  evs.forEach((e) => {
    if (e && e.event === "hesitation" && e.props && e.props.reason) {
      hesCount[e.props.reason] = (hesCount[e.props.reason] || 0) + 1;
    }
  });
  const hesitations = Object.entries(hesCount)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  return { sources, countries, screens, exits, exitTotal, hesitations };
}

// ---- Investor data-room exports -----------------------------------------------------------

const CSV_COLS = ["ts", "iso", "event", "season", "track", "batchId", "week", "checkin", "refundTier", "refundCents", "priceCents", "fromCall"];
const csvEsc = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

// Flat CSV of the raw (aggregate-only) event stream.
export function toCSV(events) {
  const rows = (events || []).map((e) => CSV_COLS.map((c) => {
    if (c === "ts") return csvEsc(e.ts);
    if (c === "iso") return csvEsc(e.ts ? new Date(e.ts).toISOString() : "");
    if (c === "event") return csvEsc(e.event);
    return csvEsc(e.props?.[c]);
  }).join(","));
  return [CSV_COLS.join(","), ...rows].join("\n");
}

// JSON bundle for the data room: raw events + the computed summary + segments.
export function toDataRoom(events) {
  return { generatedAt: new Date().toISOString(), eventCount: (events || []).length, summary: summarize(events), segments: segments(events), events: events || [] };
}
