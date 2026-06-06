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

export const seasonLabel = (key) => (SEASONS.find((s) => s.key === key) || {}).label || "";
