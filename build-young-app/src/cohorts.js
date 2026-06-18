// ============================ COHORTS (dependency-free) ============================
//
// The cohort catalog (SEASONS + BATCHES + CHECKINS). Kept React/lucide-free so the serverless
// cron scheduler (api/cron/market-news.js) and the funnel module can import the SAME source of
// truth. App.jsx imports + re-exports these unchanged.
//
// Build Young runs ONE combined high-school track — "Builders". Each cohort meets TWICE a
// week (~3 hrs/week, two 90-min sessions) over the 12-week course; we run two cohorts per season
// on alternating day-pairs (Mon & Wed, Tue & Thu) so families can self-select a schedule.
//
// Each BATCH:
//   - id      — stable cohort id used in URLs + the roster (e.g. "fall-mw")
//   - season  — SEASONS key (groups the enroll dropdown + landing pills)
//   - track   — cohort label; "Builders" for all (single combined track)
//   - start   — WEEK 1 class date, e.g. "Sep 7, 2026" (Date-parseable). Week N's anchor is
//               start + (N-1)*7 days. The weekdays are echoed in `day`.
//   - day     — human label, e.g. "Mondays & Wednesdays · 5:00–6:30 PM PT"
//   - seats / price / zoom — enrollment + class details
//   - lessons (OPTIONAL) — the cohort's PACE: an array (one entry per 3-hr LESSON) of that lesson's
//                live-sitting day-offsets from `start`, e.g. `[[0,2],[7,9], …]`. 12 lessons = 36 hrs
//                (invariant); sittings-per-lesson is flexible (a lesson may be one 3-hr slot `[d]` or
//                two 90-min sittings `[d, d+2]` or more). Omit it for the flagship cadence (12 lessons,
//                twice-weekly day-pair → `[[0,2],[7,9], …, [77,79]]`); supply it for an accelerated
//                cohort (more lessons/week → fewer calendar weeks). All calendar/progression/refund
//                math derives from it — see `cohortLessons` in courseDates.js.
//   - manualLesson (OPTIONAL) — founder progress override: 0/absent = AUTO (follow the calendar),
//                1..12 = the cohort is on that lesson, 13 = graduated. The dashboard reads
//                `effectivePosition` (this when set, else the calendar) — see courseDates.js.

// Follow-up check-ins after the 12-week course. The program is now 12 weeks flat — the finale is
// the Week 12 capstone (no separate check-in call, no tuition prize) — so this is 0. Kept as a
// constant (not deleted) so the funnel/analytics + sim harness stay generic if it ever returns.
export const CHECKINS = 0;

// Seasons are listed so the landing can show what's coming; only seasons with BATCHES are
// bookable. Winter/Spring 2027 are intentionally NOT scheduled yet — they show as "Not yet
// scheduled" on the landing and are omitted from the enroll dropdown until cohorts are added.
export const SEASONS = [
  { key: "fall", label: "Fall 2026", note: "Enrolling now" },
  { key: "winter", label: "Winter 2027", note: "Not yet scheduled" },
  { key: "spring", label: "Spring 2027", note: "Not yet scheduled" },
];

// Each cohort carries its own `stripeLink` (the Payment Link URL; empty = demo checkout) and a
// `groupEmail` (a cohort-wide group/list address for student↔student + class communication) so a
// cohort record is self-contained and live-editable in the founder dashboard.
export const BATCHES = [
  // Fall 2026
  { id: "fall-mw", season: "fall", track: "Builders", start: "Sep 7, 2026", day: "Mondays & Wednesdays · 5:00–6:30 PM PT", seats: 10, price: 999, zoom: "https://zoom.us/j/8801000001", groupEmail: "fall-mw@build-young.com", stripeLink: "https://buy.stripe.com/test_bJeaEQfhgcXh9Vt2XmefC00" },
  { id: "fall-tt", season: "fall", track: "Builders", start: "Sep 8, 2026", day: "Tuesdays & Thursdays · 5:00–6:30 PM PT", seats: 10, price: 999, zoom: "https://zoom.us/j/8801000002", groupEmail: "fall-tt@build-young.com", stripeLink: "" },
  // Winter 2027 & Spring 2027 — NOT YET SCHEDULED (no open cohorts). When dates are set, add two
  // rows here per season (Mon & Wed, Tue & Thu) and the landing + enroll dropdown pick them up
  // automatically; the seasons already exist in SEASONS above so they render as "Not yet scheduled".
];

export const seasonLabel = (key) => (SEASONS.find((s) => s.key === key) || {}).label || titleCase(key);
// Title-case a raw season key for display when it's not one of the predefined SEASONS (e.g. a founder
// adds a "summer" cohort → "Summer"). Keeps custom seasons readable without a hardcoded label.
function titleCase(k) {
  return String(k || "").replace(/\b\w/g, (c) => c.toUpperCase());
}
// The seasons to DISPLAY (landing tabs + enroll dropdown): the predefined SEASONS plus any season key
// that actually appears in the live catalog but isn't predefined — so a founder-created cohort in a new
// season (e.g. "summer") shows up instead of being orphaned. Ordered CHRONOLOGICALLY by each season's
// earliest cohort start (so a Summer 2026 cohort precedes Fall 2026); seasons with no cohort yet
// (winter/spring "soon") sort last, keeping their predefined order. A catalog-only season's label gets
// the year from its earliest cohort ("summer" + 2026 → "Summer 2026"). Each entry is `{ key, label, note }`.
export function catalogSeasons(batches) {
  const list = batches || [];
  const keys = [...SEASONS.map((s) => s.key), ...list.map((b) => b && b.season).filter(Boolean)];
  const seen = new Set();
  const out = [];
  for (const k of keys) {
    if (seen.has(k)) continue;
    seen.add(k);
    const starts = list.filter((b) => b && b.season === k).map((b) => Date.parse(b.start || "")).filter((t) => !Number.isNaN(t));
    const earliest = starts.length ? Math.min(...starts) : Infinity;
    const predefined = SEASONS.find((s) => s.key === k);
    const year = starts.length ? new Date(earliest).getFullYear() : "";
    const label = predefined ? predefined.label : `${titleCase(k)}${year ? ` ${year}` : ""}`;
    out.push({ key: k, label, note: predefined ? predefined.note : "", _ord: earliest });
  }
  out.sort((a, b) => a._ord - b._ord); // chronological by earliest cohort; no-cohort seasons (∞) last, stable
  return out.map(({ _ord, ...s }) => s);
}

// Editable cohort-card COPY — the parts of the enroll/landing card that aren't structural data.
// Each is an OPTIONAL per-cohort string (`audience`/`format`/`blurb`); these are the DEFAULTS used
// when a cohort leaves them blank, so the card is identical until a founder overrides it from the
// dashboard. (The duration/hours line is computed from the cohort's pace — see cohortSummary — not
// edited here.) `blurb` is the WHOLE card description (no auto prefix) — the card renders exactly this.
export const CARD_DEFAULTS = {
  audience: "high school", // badge suffix: "Builders · high school"
  format: "Live online · Zoom", // the format line (the "~N hrs/week" is appended, computed)
  blurb: "Build a product you believe people would pay for, take it live, grow it with a funnel and metrics, and go to market for your first customers. In an AI world, the edge isn't a degree; it's what you can build.",
};

// Display order for cohort lists (landing cards + enroll dropdown), founder-controlled: a cohort with
// an explicit `sortOrder` (> 0) leads, ascending; the rest fall back to START DATE ascending — so an
// August cohort appears before a September one automatically, and the founder can pin an explicit
// order when needed. Unparseable dates sort last. Pure (returns a new array).
export function sortCohorts(list) {
  const key = (b) => {
    const so = Number(b && b.sortOrder) || 0;
    const t = Date.parse((b && b.start) || "");
    return [so > 0 ? 0 : 1, so, Number.isNaN(t) ? Infinity : t];
  };
  return [...(list || [])].sort((a, c) => {
    const ka = key(a), kc = key(c);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kc[i]) return ka[i] - kc[i];
    return 0;
  });
}
