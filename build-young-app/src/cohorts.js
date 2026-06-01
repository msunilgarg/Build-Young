// ============================ COHORTS (dependency-free) ============================
//
// The cohort catalog (SEASONS + BATCHES). Kept React/lucide-free so the serverless cron
// scheduler (api/cron/market-news.js) can import the SAME source of truth for class dates,
// rather than duplicating the schedule. App.jsx imports + re-exports these unchanged.
//
// Each BATCH:
//   - id      — stable cohort id used in URLs + the roster (e.g. "fall-hs-wed")
//   - season  — SEASONS key (groups the enroll dropdown + landing pills)
//   - track   — "Middle School" | "High School"
//   - start   — WEEK 1 class date, e.g. "Sep 9, 2026" (Date-parseable). Week N class is
//               start + (N-1)*7 days. The weekday is implied by `start` and echoed in `day`.
//   - day     — human label, e.g. "Wednesdays · 5:00–6:30 PM PST"
//   - seats / price / zoom — enrollment + class details

export const SEASONS = [
  { key: "fall", label: "Fall 2026", note: "Enrolling now" },
  { key: "winter", label: "Winter 2027", note: "Enrolling now" },
  { key: "spring", label: "Spring 2027", note: "Enrolling now" },
];

export const BATCHES = [
  // Fall 2026
  { id: "fall-ms-mon", season: "fall", track: "Middle School", start: "Sep 7, 2026", day: "Mondays · 5:00–6:30 PM PST", seats: 10, price: 899, zoom: "https://zoom.us/j/8801000001" },
  { id: "fall-ms-tue", season: "fall", track: "Middle School", start: "Sep 8, 2026", day: "Tuesdays · 5:00–6:30 PM PST", seats: 10, price: 899, zoom: "https://zoom.us/j/8801000002" },
  { id: "fall-hs-wed", season: "fall", track: "High School", start: "Sep 9, 2026", day: "Wednesdays · 5:00–6:30 PM PST", seats: 10, price: 899, zoom: "https://zoom.us/j/8801000003" },
  { id: "fall-hs-thu", season: "fall", track: "High School", start: "Sep 10, 2026", day: "Thursdays · 5:00–6:30 PM PST", seats: 10, price: 899, zoom: "https://zoom.us/j/8801000004" },
  // Winter 2027
  { id: "winter-ms-mon", season: "winter", track: "Middle School", start: "Jan 11, 2027", day: "Mondays · 5:00–6:30 PM PST", seats: 10, price: 899, zoom: "https://zoom.us/j/8801000005" },
  { id: "winter-ms-tue", season: "winter", track: "Middle School", start: "Jan 12, 2027", day: "Tuesdays · 5:00–6:30 PM PST", seats: 10, price: 899, zoom: "https://zoom.us/j/8801000006" },
  { id: "winter-hs-wed", season: "winter", track: "High School", start: "Jan 13, 2027", day: "Wednesdays · 5:00–6:30 PM PST", seats: 10, price: 899, zoom: "https://zoom.us/j/8801000007" },
  { id: "winter-hs-thu", season: "winter", track: "High School", start: "Jan 14, 2027", day: "Thursdays · 5:00–6:30 PM PST", seats: 10, price: 899, zoom: "https://zoom.us/j/8801000008" },
  // Spring 2027
  { id: "spring-ms-mon", season: "spring", track: "Middle School", start: "Apr 5, 2027", day: "Mondays · 5:00–6:30 PM PST", seats: 10, price: 899, zoom: "https://zoom.us/j/8801000009" },
  { id: "spring-ms-tue", season: "spring", track: "Middle School", start: "Apr 6, 2027", day: "Tuesdays · 5:00–6:30 PM PST", seats: 10, price: 899, zoom: "https://zoom.us/j/8801000010" },
  { id: "spring-hs-wed", season: "spring", track: "High School", start: "Apr 7, 2027", day: "Wednesdays · 5:00–6:30 PM PST", seats: 10, price: 899, zoom: "https://zoom.us/j/8801000011" },
  { id: "spring-hs-thu", season: "spring", track: "High School", start: "Apr 8, 2027", day: "Thursdays · 5:00–6:30 PM PST", seats: 10, price: 899, zoom: "https://zoom.us/j/8801000012" },
];

export const seasonLabel = (key) => (SEASONS.find((s) => s.key === key) || {}).label || "";
