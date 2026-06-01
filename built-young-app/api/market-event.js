// ============================ /api/market-event ============================
//
// Returns the SINGLE current market event for a requested {phase, week, checkin}. This is
// how the browser app learns what's happening "now" WITHOUT the full future schedule ever
// shipping in the client bundle (the schedule lives server-only in _lib/marketSchedule.js).
// Keeping future events off the client is the anti-gaming guard for the tuition prize
// (see CLAUDE.md) — students can no longer read upcoming events out of devtools.
//
// Contract (intentionally narrow):
//   GET /api/market-event?phase=course&week=3            → { event: { h, d, e, media } }
//   GET /api/market-event?phase=checkin&checkin=0        → { event: { h, d, e } }
//   The client only ever requests its OWN current step. We return exactly ONE event and
//   NEVER the array — there is deliberately no "all events" mode. (Returning one arbitrary
//   {phase,week,checkin} is fine: the client can only act on its current state anyway, and a
//   single lookup leaks at most that one event, not the schedule.)
//
//   `media` (analog/watch/question/resources) is included for COURSE weeks that have authored
//   media, so the client can render the pre-class drip + the Course-hub resources for the
//   current/past weeks it's entitled to — same content the cron emails.
//
// Dependency-free; mirrors the existing handler style (GET-only here, since it's a read).

import { marketEventFor, MEDIA } from "./_lib/marketSchedule.js";

// Course is 12 weeks; check-ins are 0-indexed (0..5 in the sim, but we accept any
// non-negative integer and let marketEventFor wrap, matching the engine's `% length`).
const MAX_WEEK = 12;
const MAX_CHECKIN = 1000; // generous upper bound; marketEventFor wraps via modulo anyway

function readParams(req) {
  // Support both a parsed `req.query` (Vercel) and a raw URL (defensive for other hosts).
  if (req.query) return req.query;
  try {
    const url = new URL(req.url, "http://localhost");
    return Object.fromEntries(url.searchParams.entries());
  } catch {
    return {};
  }
}

export default function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const q = readParams(req);
  const phase = q.phase;

  if (phase !== "course" && phase !== "checkin") {
    res.status(400).json({ error: "phase must be 'course' or 'checkin'" });
    return;
  }

  if (phase === "course") {
    const week = Number(q.week);
    if (!Number.isInteger(week) || week < 1 || week > MAX_WEEK) {
      res.status(400).json({ error: `week must be an integer 1-${MAX_WEEK}` });
      return;
    }
    const ev = marketEventFor("course", week, 0);
    const media = MEDIA[ev.h]; // present only for live-market weeks (3–12) with authored media
    res.status(200).json({ event: media ? { ...ev, media } : { ...ev } });
    return;
  }

  // phase === "checkin"
  const checkin = Number(q.checkin);
  if (!Number.isInteger(checkin) || checkin < 0 || checkin > MAX_CHECKIN) {
    res.status(400).json({ error: `checkin must be an integer 0-${MAX_CHECKIN}` });
    return;
  }
  const ev = marketEventFor("checkin", 0, checkin);
  res.status(200).json({ event: { ...ev } });
}
