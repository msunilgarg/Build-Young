// ============================ COHORTS (dependency-free) ============================
//
// The cohort catalog (SEASONS + BATCHES + CHECKINS). Kept React/lucide-free so the serverless
// cron scheduler (api/cron/market-news.js) and the funnel module can import the SAME source of
// truth. App.jsx imports + re-exports these unchanged.
//
// Build Young runs ONE combined teen track — "Builders" (ages 13–18). Each cohort meets TWICE a
// week (~3 hrs/week, two 90-min sessions) over the 12-week course; we run two cohorts per season
// on alternating day-pairs (Mon & Wed, Tue & Thu) so families can self-select a schedule.
//
// Each BATCH:
//   - id      — stable cohort id used in URLs + the roster (e.g. "fall-mw")
//   - season  — SEASONS key (groups the enroll dropdown + landing pills)
//   - track   — cohort label; "Builders" for all (single combined track)
//   - start   — WEEK 1 class date, e.g. "Sep 7, 2026" (Date-parseable). Week N's anchor is
//               start + (N-1)*7 days. The weekdays are echoed in `day`.
//   - day     — human label, e.g. "Mondays & Wednesdays · 5:00–6:30 PM PST"
//   - seats / price / zoom — enrollment + class details

// Monthly check-ins after the 12-week course (the prize is decided at the last one).
export const CHECKINS = 1;

export const SEASONS = [
  { key: "fall", label: "Fall 2026", note: "Enrolling now" },
  { key: "winter", label: "Winter 2027", note: "Enrolling now" },
  { key: "spring", label: "Spring 2027", note: "Enrolling now" },
];

// Each cohort carries its own `stripeLink` (the Payment Link URL; empty = demo checkout) so a
// cohort record is self-contained and live-editable in the founder dashboard.
export const BATCHES = [
  // Fall 2026
  { id: "fall-mw", season: "fall", track: "Builders", start: "Sep 7, 2026", day: "Mondays & Wednesdays · 5:00–6:30 PM PST", seats: 12, price: 999, zoom: "https://zoom.us/j/8801000001", stripeLink: "https://buy.stripe.com/test_bJeaEQfhgcXh9Vt2XmefC00" },
  { id: "fall-tt", season: "fall", track: "Builders", start: "Sep 8, 2026", day: "Tuesdays & Thursdays · 5:00–6:30 PM PST", seats: 12, price: 999, zoom: "https://zoom.us/j/8801000002", stripeLink: "" },
  // Winter 2027
  { id: "winter-mw", season: "winter", track: "Builders", start: "Jan 11, 2027", day: "Mondays & Wednesdays · 5:00–6:30 PM PST", seats: 12, price: 999, zoom: "https://zoom.us/j/8801000003", stripeLink: "" },
  { id: "winter-tt", season: "winter", track: "Builders", start: "Jan 12, 2027", day: "Tuesdays & Thursdays · 5:00–6:30 PM PST", seats: 12, price: 999, zoom: "https://zoom.us/j/8801000004", stripeLink: "" },
  // Spring 2027
  { id: "spring-mw", season: "spring", track: "Builders", start: "Apr 6, 2027", day: "Mondays & Wednesdays · 5:00–6:30 PM PST", seats: 12, price: 999, zoom: "https://zoom.us/j/8801000005", stripeLink: "" },
  { id: "spring-tt", season: "spring", track: "Builders", start: "Apr 7, 2027", day: "Tuesdays & Thursdays · 5:00–6:30 PM PST", seats: 12, price: 999, zoom: "https://zoom.us/j/8801000006", stripeLink: "" },
];

export const seasonLabel = (key) => (SEASONS.find((s) => s.key === key) || {}).label || "";
