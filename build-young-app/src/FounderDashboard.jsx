import React, { useState, useEffect, useRef, useMemo } from "react";
import { GraduationCap, ArrowRight, Check, CircleDollarSign, Video, Linkedin, Download, Users, Activity, Calendar, Clock, RefreshCw } from "lucide-react";
import { C, fmt, SUNIL_PHOTO } from "./theme.js";
import { Card, Mark, act, Stat } from "./ui.jsx";
import { CONFIG, track, useCohorts, validEmail, AUTH, downloadFile, HESITATION_REASONS } from "./lib.js";
import { cohortDays, cohortTime, nextClass, dayNum, classMeetingOn, REFUND_WINDOW, buildLessonSchedule, cohortEndDate, paceFromLessons } from "./courseDates.js";
import { seasonLabel, catalogSeasons, duplicateCohort } from "./cohorts.js";
import { WEEKS } from "./course.js";
import { HOMEWORK, OBJECTIVES, setHomework, setObjectives } from "./courseState.js";
import { cancelReasonLabel } from "./engine.js";
import { buildCertSvg, CertificateView } from "./Certificate.jsx";
import { certVerifyUrl, certDate } from "./cert.js";
import { scenarioLabel } from "./scenarios.js";
import { SITE_DEFAULTS, SETTINGS_FIELDS } from "./site.js";
import { STAGES, SCHOLARSHIP_STAGES, summarize, toCSV, toDataRoom, ratePct, TRACKS, engagement, journeys, monthsIn, eventsInMonth, weeklyTrend, TREND_METRICS, revenueBySource, settlementSummary } from "./funnel.js";
import { WEEK_PREP, WEEK_OBJECTIVES } from "./marketMedia.js";

const Charts = React.lazy(() => import("./Charts.jsx"));

// The hidden founder/admin console (?founder route): funnel analytics, traffic/engagement,
// teaching schedule, and the cohort/settings/admin/account editors. Founder-gated server-side.

const FUNNEL_COLORS = [C.emerald, C.turq, C.gold, C.sky, C.green];

// Render a 2-letter ISO country code as a readable name (CA → Canada, US → United States) so a
// COUNTRY is never mistaken for a US STATE code (CA = California) shown in the "US visits by state"
// line. Uses the platform's Intl region names; falls back to the raw code if unavailable.
const REGION_DISPLAY = (() => { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; } })();
const countryName = (code) => { if (!code) return "—"; try { return (REGION_DISPLAY && REGION_DISPLAY.of(code)) || code; } catch { return code; } };

// Friendly names for the internal route keys used as `screen` in engagement events.
const SCREEN_LABELS = { home: "Landing page", story: "Our story (/about)", curriculum: "How it works (/curriculum)", faq: "FAQ (/faq)", enroll: "Enroll flow", call: "Book a call", app: "Student dashboard", login: "Log in", setpw: "Set password", checkemail: "Check your email", founder: "Founder console", verify: "Certificate verify" };
const screenName = (s) => SCREEN_LABELS[s] || s || "—";
// Human dwell time from milliseconds: "0s" / "45s" / "2m 5s" / "1h 3m".
function fmtDwell(ms) {
  const sec = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60); return `${h}h ${m % 60}m`;
}

// Friendly, actionable status for founder-console saves: keep the user's edits, say what to do.
const ADMIN_NET_ERR = "Network error — check your connection and try again. Your changes are kept.";
function adminSaveErr(r, d, verb = "save") {
  if (r && r.status === 403) return `Your founder session expired — sign in again, then ${verb} once more.`;
  const why = (d && d.error) || `server error ${r ? r.status : ""}`.trim();
  return `Couldn't ${verb}: ${why}. Your changes are still here — try again.`;
}
// Status colour: in-progress (ends "…") muted, success (Saved/Cleared/✓) green, otherwise error red.
const adminStatusColor = (s) => (s.endsWith("…") ? C.muted : (/^(Saved|Cleared)/.test(s) || s.includes("✓")) ? C.green : C.rust);


// ============================ FOUNDER TEACHING SCHEDULE ============================
// The founder's daily driver: "what am I teaching today, and where do I pick up for each
// cohort?" Built to scale to many cohorts/day — each row says the time, which session of which
// week, and the topic. A date field lets the founder look ahead to any day. Pure client-side
// (live catalog via useCohorts + the date helpers above); no new endpoint.
function TeachingSchedule() {
  const BATCHES = useCohorts();
  const todayISO = new Date().toISOString().slice(0, 10);
  const [dateStr, setDateStr] = useState(todayISO);
  const day = useMemo(() => { const d = new Date(dateStr + "T12:00:00"); return isNaN(d.getTime()) ? new Date() : d; }, [dateStr]);
  const isToday = dateStr === todayISO;
  const longDay = day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Cohorts meeting on the chosen day, sorted by time-of-day label (best-effort string sort —
  // all current cohorts share one time, but this keeps order stable when times diverge).
  const teaching = BATCHES
    .map((b) => ({ b, meet: classMeetingOn(b, day) }))
    .filter((x) => x.meet)
    .sort((a, b) => cohortTime(a.b).localeCompare(cohortTime(b.b)));

  // Whole-roster pipeline: every cohort's state on the chosen day + its next session.
  const dn = dayNum(day);
  const roster = BATCHES.map((b) => {
    const startDay = b.start ? dayNum(new Date(b.start)) : null;
    const offset = startDay == null ? null : dn - startDay;
    let state, week = null;
    if (offset == null) state = "unknown";
    else if (offset < 0) state = "before";
    else if (Math.floor(offset / 7) + 1 > 12) state = "done";
    else { state = "active"; week = Math.floor(offset / 7) + 1; }
    return { b, state, week, next: nextClass(b, day) };
  }).sort((x, y) => {
    // "All cohorts" — SOONEST start first: the cohort starting next is on top (unparseable dates last).
    const tx = Date.parse(x.b.start || ""), ty = Date.parse(y.b.start || "");
    if (Number.isNaN(tx)) return Number.isNaN(ty) ? 0 : 1;
    if (Number.isNaN(ty)) return -1;
    return tx - ty;
  });

  const muted = { fontSize: 12.5, color: C.muted };
  const card = { padding: 16, marginBottom: 12 };
  const wk = (n) => WEEKS[n - 1] || {};
  const shortDate = (d) => d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—";

  return (
    <div>
      {/* date picker — defaults to today; founder can scan any day ahead */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: C.ink2 }}>
          <Calendar size={15} color={C.emerald} /> Day
          <input type="date" aria-label="Schedule day" value={dateStr} onChange={(e) => setDateStr(e.target.value || todayISO)}
            style={{ fontSize: 13.5, padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink }} />
        </label>
        {!isToday && <span {...act(() => setDateStr(todayISO))} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: C.emerald }}>↩ Back to today</span>}
        <span style={{ ...muted, fontWeight: 700 }}>{longDay}{isToday ? " · today" : ""}</span>
      </div>

      {/* Teaching today — the headline list */}
      {teaching.length === 0 ? (
        <Card style={{ ...card, background: "#eef3f0", borderColor: C.emerald }}>
          <b style={{ color: C.ink }}>No classes {isToday ? "today" : "that day"}. 🎉</b>
          <div style={{ ...muted, marginTop: 4 }}>Your next sessions are listed in the cohort pipeline below.</div>
        </Card>
      ) : (
        teaching.map(({ b, meet }) => {
          const w = wk(meet.week);
          return (
            <Card key={b.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 800, color: C.ink }}><Clock size={15} color={C.emerald} />{cohortTime(b) || "Time TBD"}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: C.turq, background: "#e6f2f3", borderRadius: 999, padding: "2px 9px" }}>Session {meet.session} of 2</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.ink2, marginTop: 4 }}><b>{b.track}</b> · {cohortDays(b)} · <span style={{ color: C.muted }}>{b.id}</span></div>
                </div>
                <a href={b.zoom} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flexShrink: 0 }}>
                  <button className="btn" style={{ background: C.emerald, color: "#fff", padding: "9px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7 }}><Video size={14} /> Open Zoom</button>
                </a>
              </div>
              {/* where to pick up */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: C.muted }}>Pick up at</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginTop: 3 }}>Week {meet.week} — {w.t}</div>
                {w.s && <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, marginTop: 3 }}>{w.s}</div>}
                {HOMEWORK[meet.week - 1] && (
                  <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: 8, background: C.paper2, border: `1px solid ${C.line}`, borderRadius: 5, padding: "8px 11px" }}>
                    <b style={{ color: C.ink }}>Students were asked to prep:</b> {HOMEWORK[meet.week - 1]}
                  </div>
                )}
              </div>
            </Card>
          );
        })
      )}

      {/* Whole-cohort pipeline — where every cohort stands + its next session */}
      <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, margin: "22px 0 10px" }}>All cohorts</div>
      <Card style={{ padding: 4 }}>
        {roster.map(({ b, state, week, next }, i) => (
          <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "11px 14px", borderTop: i ? `1px solid ${C.line}` : "none" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{b.track} · {seasonLabel(b.season)} <span style={{ color: C.muted, fontWeight: 600 }}>· {cohortDays(b)}</span></div>
              <div style={muted}>{cohortTime(b)} · {b.id}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {state === "active" && <span className="disp" style={{ fontSize: 14, fontWeight: 800, color: C.emerald }}>Week {week} of 12</span>}
              {state === "before" && <span style={{ fontSize: 13, fontWeight: 700, color: C.turq }}>Not started</span>}
              {state === "done" && <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>Completed</span>}
              <div style={muted}>{next ? <>Next: {shortDate(next.date)} · Wk {next.week} (s{next.session})</> : "No more sessions"}</div>
            </div>
          </div>
        ))}
      </Card>
      <div style={{ ...muted, marginTop: 8 }}>Times/days come from each cohort's <b>day</b> label and <b>start</b> date (edit them under <b>Cohorts &amp; course</b>). Sessions are the two weekly classes per cohort.</div>
    </div>
  );
}

// Per-browser "don't count my visits" flag (localStorage by:notrack), read by track(). Defaults ON
// the first time you open the founder console (reaching it means this is your browser), so your own
// testing doesn't pollute the funnel. Toggle off to let this browser count again.
function NoTrackToggle() {
  const [on, setOn] = useState(() => {
    try {
      const v = window.localStorage.getItem("by:notrack");
      if (v == null) { window.localStorage.setItem("by:notrack", "1"); return true; }
      return v === "1";
    } catch { return false; }
  });
  const toggle = () => { const next = !on; try { window.localStorage.setItem("by:notrack", next ? "1" : "0"); } catch (e) {} setOn(next); };
  return (
    <span {...act(toggle)} aria-pressed={on} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 4, padding: "6px 12px" }}>
      <span style={{ width: 30, height: 16, borderRadius: 999, background: on ? C.emerald : C.line, position: "relative", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 12, height: 12, borderRadius: 999, background: "#fff" }} />
      </span>
      Exclude my visits (this browser)
    </span>
  );
}

export function FounderDashboard({ onHome, onPreviewStudent }) {
  const liveBatches = useCohorts(); // live cohort catalog → segment seasons match the public site (incl. catalog-only seasons like Summer)
  const [events, setEvents] = useState(null); // null = loading
  const [founders, setFounders] = useState([]); // admin allowlist (effective: env ∪ KV)
  const [error, setError] = useState(null);
  const [seg, setSeg] = useState({ kind: "all", key: null }); // all | {season} | {track}
  const [tab, setTab] = useState("today"); // today | funnel | cohorts | students | settings — keeps the console short
  const [studentsView, setStudentsView] = useState("enrolled"); // Students tab sub-nav: enrolled | inbound — declutters the kitchen-sink (T34)
  const [resetMsg, setResetMsg] = useState("");
  const [period, setPeriod] = useState("all"); // "all" | "YYYY-MM" — scopes the funnel + trend to a month
  const [trendMetric, setTrendMetric] = useState("visited");
  const [refreshing, setRefreshing] = useState(false); // a manual Refresh re-pulls the funnel without a browser reload
  const [partners, setPartners] = useState([]); // full partner records (incl. cutPct + payments) — founder-only
  const [partnerEnrollments, setPartnerEnrollments] = useState([]); // partner seats across cohorts (T30 settlement)

  // Authorized by the session cookie (sent automatically): the server admits only a logged-in
  // founder (email on the allowlist). 401/403 → not signed in as a founder. Pulled on mount and
  // again whenever the founder hits Refresh, so new visits/enrollments show without a page reload.
  const loadFunnel = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch("/api/funnel");
      if (r.status === 401 || r.status === 403) { setError("Access denied — sign in with your founder account to view this."); return; }
      const data = await r.json();
      setError(null);
      setEvents(Array.isArray(data.events) ? data.events : []);
      setFounders(Array.isArray(data.founders) ? data.founders : []);
      // Partner registry + their enrollments — for the settlement view + the accounting export (T30).
      try { const pr = await fetch("/api/funnel?resource=partners"); const pd = pr.ok ? await pr.json() : {}; setPartners(Array.isArray(pd.partners) ? pd.partners : []); } catch { /* best-effort */ }
      try { const er = await fetch("/api/funnel?resource=partner-enrollments"); const ed = er.ok ? await er.json() : {}; setPartnerEnrollments(Array.isArray(ed.enrollments) ? ed.enrollments : []); } catch { /* best-effort */ }
    } catch (e) { setError("Couldn’t load analytics (network error)."); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { loadFunnel(); }, [loadFunnel]);

  const filter = seg.kind === "season" ? { season: seg.key } : seg.kind === "track" ? { track: seg.key } : seg.kind === "scholarship" ? { source: "free" } : null;
  const scoped = useMemo(() => eventsInMonth(events || [], period), [events, period]);
  const months = useMemo(() => monthsIn(events || []), [events]);
  const didDefaultPeriod = React.useRef(false);
  useEffect(() => { if (!didDefaultPeriod.current && months.length) { setPeriod(months[months.length - 1].key); didDefaultPeriod.current = true; } }, [months]); // default to the latest month so it reads as a monthly trend
  const summary = useMemo(() => summarize(scoped, filter), [scoped, seg.kind, seg.key]);
  const trendData = useMemo(() => weeklyTrend(scoped, { metric: trendMetric, filter, month: period }), [scoped, trendMetric, period, seg.kind, seg.key]);
  // Traffic & engagement is whole-site (not segmented by cohort) — it's the top-of-funnel picture.
  const eng = useMemo(() => engagement(events || []), [events]);
  const bySource = useMemo(() => revenueBySource(scoped), [scoped]);
  const settlement = useMemo(() => settlementSummary(partners, partnerEnrollments), [partners, partnerEnrollments]);
  const paths = useMemo(() => journeys(events || [], { limit: 12 }), [events]);

  const isSchol = seg.kind === "scholarship";                       // scholarship segment view (SPECS/020)
  const viewStages = isSchol ? SCHOLARSHIP_STAGES : STAGES;          // the scholarship spine when in that view
  const enrolledCount = isSchol ? summary.counts.awarded : summary.counts.enrolled; // "enrolled" is keyed "awarded" in the scholarship spine
  const funnelData = viewStages.map((st, i) => {
    const count = summary.counts[st.key];
    const annot = i === 0 ? count.toLocaleString() : `${count.toLocaleString()} · ${ratePct(summary.steps[i - 1].rate)}`;
    return { label: st.label, count, color: FUNNEL_COLORS[i % FUNNEL_COLORS.length], annot };
  });
  // Biggest leak = the step with the largest drop, only among steps the downstream stage has
  // actually been reached (toCount > 0). This ignores stages that simply haven't started yet
  // (e.g. Class started = 0 before a cohort begins), so it flags real drop-off, not timing.
  const leakSteps = summary.steps.filter((s) => s.toCount > 0);
  const biggestLeak = leakSteps.length ? leakSteps.reduce((a, b) => ((1 - b.rate) > (1 - a.rate) ? b : a)) : null;

  const segBtn = (label, active, onClick) => (
    <span {...act(onClick)} key={label} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, padding: "6px 12px", borderRadius: 4, border: `1px solid ${active ? C.emerald : C.line}`, background: active ? C.emerald : C.card, color: active ? "#fff" : C.ink2 }}>{label}</span>
  );

  const wrap = { maxWidth: 1080, margin: "0 auto", padding: "0 20px 80px", position: "relative", zIndex: 1 };
  const h2s = { fontSize: 17, fontWeight: 800, color: C.ink, margin: "30px 0 12px" };
  const muted = { fontSize: 12.5, color: C.muted };
  const resetFunnel = async () => {
    if (typeof window !== "undefined" && !window.confirm("Clear ALL funnel data (yours and everyone's) and start fresh? This can't be undone.")) return;
    setResetMsg("Clearing…");
    try {
      const r = await fetch("/api/funnel?resource=events", { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setEvents([]); setResetMsg("Funnel cleared ✓"); }
      else setResetMsg("Couldn't clear — try again.");
    } catch { setResetMsg("Network error."); }
  };

  return (
    <div style={{ minHeight: "100vh", paddingTop: 24 }}>
      <div style={wrap}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="disp" style={{ fontSize: 26, fontWeight: 800 }}><Mark size={22} />Founder console</div>
            <div style={muted}>Funnel, cohorts, admins &amp; account tools · aggregate data only (no student PII).</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span {...act(() => { if (!refreshing) loadFunnel(); })} aria-busy={refreshing} aria-label={refreshing ? "Refreshing" : "Refresh"} title="Re-pull the latest funnel data (no browser refresh needed)" style={{ cursor: refreshing ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 4, padding: "8px 12px", opacity: refreshing ? 0.6 : 1 }}><RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none", flexShrink: 0 }} /> Refresh</span>
            <span {...act(() => downloadFile("build-young-funnel.csv", toCSV(events || []), "text/csv"))} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 4, padding: "8px 12px" }}><Download size={14} /> CSV</span>
            <span {...act(() => downloadFile("build-young-funnel.json", JSON.stringify(toDataRoom(events || [], { settlement }), null, 2), "application/json"))} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 4, padding: "8px 12px" }}><Download size={14} /> JSON</span>
            {onPreviewStudent && <span {...act(onPreviewStudent)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#fff", background: C.emerald, borderRadius: 4, padding: "8px 12px" }}><GraduationCap size={14} /> Preview student dashboard</span>}
            <span {...act(onHome)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.muted, padding: "8px 6px" }}>← Home</span>
          </div>
        </div>

        {error && <Card style={{ padding: 18, marginTop: 24, borderColor: C.goldLite, background: "#fbeede" }}><b style={{ color: C.ink }}>{error}</b></Card>}
        {!error && events === null && <Card style={{ padding: 24, marginTop: 24, color: C.muted }}>Loading analytics…</Card>}

        {/* section tabs — keep the console short instead of one long scroll */}
        {!error && events !== null && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 22, borderBottom: `1px solid ${C.line}`, paddingBottom: 2 }}>
            {[["today", "Today"], ["funnel", "Funnel"], ["cohorts", "Cohorts & course"], ["students", "Students"], ["settings", "Settings"]].map(([k, label]) => (
              <span key={k} {...act(() => setTab(k))} style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 700, padding: "8px 14px", borderRadius: "4px 4px 0 0", color: tab === k ? C.ink : C.muted, borderBottom: `2px solid ${tab === k ? C.emerald : "transparent"}`, marginBottom: -2 }}>{label}</span>
            ))}
          </div>
        )}

        {!error && events !== null && tab === "today" && (<>
          <h2 style={h2s}>Teaching schedule</h2>
          <div style={{ ...muted, marginBottom: 12 }}>What you're teaching today and where to pick up for each cohort — pick any day to look ahead.</div>
          <TeachingSchedule />
        </>)}

        {!error && events !== null && tab === "funnel" && (<>
          {events.length === 0 && <Card style={{ padding: 14, marginTop: 18, ...muted }}>No events recorded yet — the funnel will populate as visitors move through the site.</Card>}

          {/* segment selector */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 22 }}>
            <span style={{ ...muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginRight: 4 }}>Segment</span>
            {segBtn("All", seg.kind === "all", () => setSeg({ kind: "all", key: null }))}
            {catalogSeasons(liveBatches).map((s) => segBtn(s.label, seg.kind === "season" && seg.key === s.key, () => setSeg({ kind: "season", key: s.key })))}
            {TRACKS.length > 1 && TRACKS.map((t) => segBtn(t, seg.kind === "track" && seg.key === t, () => setSeg({ kind: "track", key: t })))}
            {segBtn("Scholarship", seg.kind === "scholarship", () => setSeg({ kind: "scholarship", key: "free" }))}
          </div>
          {filter && seg.kind !== "scholarship" && <div style={{ ...muted, marginTop: 8 }}>Segmented views start at <b>Enrolled</b> — top-of-funnel events (visits, enroll-starts) aren’t tied to a cohort.</div>}
          {seg.kind === "scholarship" && <div style={{ ...muted, marginTop: 8 }}>The scholarship channel: <b>Applied</b> (write-ups submitted) → <b>Awarded</b> (funded seats), then the class journey. Funded seats are <b>$0</b>, so they don’t add revenue.</div>}

          {/* exclude this browser from tracking (the destructive "reset the stream" lives under Settings → Danger zone so it can't be clicked by mistake) */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
            <NoTrackToggle />
          </div>
          {/* period: slice the whole funnel to a calendar month */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
            <span style={{ ...muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginRight: 4 }}>Period</span>
            <select aria-label="Funnel period" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ fontSize: 13, padding: "6px 10px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.ink2, fontWeight: 700 }}>
              <option value="all">All time</option>
              {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            {period !== "all" && <span style={muted}>Funnel + trend scoped to this month.</span>}
          </div>
          {/* funnel + revenue */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginTop: 14, alignItems: "start" }} className="enroll-grid">
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: 14 }}>{isSchol ? "Scholarship funnel" : "The funnel"}</b>
                <span style={muted}>{ratePct(summary.overall)} {isSchol ? "applied → awarded" : "visited → enrolled"}</span>
              </div>
              <React.Suspense fallback={<div style={{ height: 280, display: "grid", placeItems: "center", color: C.muted, fontSize: 13 }}>Loading chart…</div>}>
                <Charts kind="funnel" data={funnelData} mutedColor={C.muted} fmt={fmt} />
              </React.Suspense>
            </Card>
            <div style={{ display: "grid", gap: 12 }}>
              <Stat label="Net revenue" value={fmt(summary.revenue.netCents / 100)} sub={`${fmt(summary.revenue.grossCents / 100)} gross − ${fmt(summary.revenue.refundedCents / 100)} refunded`} icon={CircleDollarSign} color={C.green} />
              <Stat label={isSchol ? "Awarded" : "Enrolled"} value={(enrolledCount || 0).toLocaleString()} sub={isSchol ? `${(summary.counts.applied || 0).toLocaleString()} applied · funded ($0 each)` : `${summary.calls.enrolledFromCall} via a booked call · ${summary.calls.enrolledDirect} direct`} icon={Users} color={C.emerald} />
              {!isSchol && <Stat label="Calls booked" value={summary.calls.booked.toLocaleString()} sub="“Talk to Sunil” — clicked to book a call" icon={Video} color={C.turq} />}
              {isSchol && <Stat label="Graduated" value={(summary.counts.graduated || 0).toLocaleString()} sub="scholarship students who finished" icon={Video} color={C.turq} />}
            </div>
          </div>

          {/* Revenue by source — direct vs each partner (SPECS/005). Partner seats count at NET; the
              topline above stays whole. Lets the founder/investors see the channel mix. */}
          {bySource.length > 0 && (
            <Card style={{ padding: 18, marginTop: 14 }}>
              <b style={{ fontSize: 14 }}>Revenue by source</b>
              <div style={{ ...muted, margin: "2px 0 10px" }}>Where enrollments came from — partner (marketplace/reseller) seats count at <b>net</b> (after their cut); direct is full tuition.</div>
              {bySource.map((s) => {
                const label = s.source === "free" ? "Scholarship (funded · $0)" : s.source.startsWith("partner:") ? `Partner · ${s.source.slice(8)}` : "Direct";
                return (
                  <div key={s.source} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "7px 0", borderTop: `1px solid ${C.line}`, fontSize: 13.5 }}>
                    <span style={{ color: C.ink2, fontWeight: 600 }}>{label}</span>
                    <span style={{ color: C.muted }}>{s.count} enrolled · <b style={{ color: C.ink }}>{fmt(s.cents / 100)}</b></span>
                  </div>
                );
              })}
            </Card>
          )}

          {/* weekly trend — calendar weeks on the x-axis (distinct from the course-week progression further down) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "26px 0 10px", flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ ...h2s, margin: 0 }}>Weekly trend{period !== "all" ? ` · ${(months.find((m) => m.key === period) || {}).label || ""}` : ""}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {TREND_METRICS.map((m) => segBtn(m.label, trendMetric === m.key, () => setTrendMetric(m.key)))}
            </div>
          </div>
          <Card style={{ padding: 18 }}>
            <div style={muted}>{(TREND_METRICS.find((m) => m.key === trendMetric) || {}).label} by week (Mon–Sun){period !== "all" ? ", across the month" : ", weeks with data"} — most recent on the right.</div>
            {trendData.length === 0 ? (
              <div style={{ ...muted, marginTop: 10 }}>No data in this period yet.</div>
            ) : (
              <React.Suspense fallback={<div style={{ height: 220, display: "grid", placeItems: "center", color: C.muted, fontSize: 13 }}>Loading chart…</div>}>
                <Charts kind="countline" data={trendData} color={C.emerald} mutedColor={C.muted} fmt={fmt} />
              </React.Suspense>
            )}
          </Card>

          {/* step conversions */}
          <h2 style={h2s}>Drop-off — where you lose people</h2>
          {biggestLeak && (
            <div style={{ fontSize: 13.5, color: C.ink2, marginBottom: 10 }}>
              Biggest drop-off: <b>{biggestLeak.fromLabel} → {biggestLeak.toLabel}</b> — <b style={{ color: C.pink }}>{ratePct(1 - biggestLeak.rate)} lost</b> ({Math.max(0, biggestLeak.fromCount - biggestLeak.toCount).toLocaleString()} of {biggestLeak.fromCount.toLocaleString()}).
            </div>
          )}
          <Card style={{ padding: 4 }}>
            {summary.steps.map((st, i) => {
              const lost = Math.max(0, st.fromCount - st.toCount);
              const isLeak = st === biggestLeak;
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: i ? `1px solid ${C.line}` : "none", background: isLeak ? "#fbeede" : "transparent" }}>
                  <span style={{ fontSize: 13.5, color: C.ink2 }}>{st.fromLabel} → {st.toLabel}{isLeak && <b style={{ color: C.gold, marginLeft: 8, fontSize: 10.5, letterSpacing: ".04em" }}>BIGGEST DROP-OFF</b>}</span>
                  <span style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={muted}>{st.fromCount.toLocaleString()} → {st.toCount.toLocaleString()}{st.fromCount > 0 ? ` · ${lost.toLocaleString()} lost` : ""}</span>
                    <span className="disp" style={{ fontSize: 16, fontWeight: 800, color: st.rate >= 0.5 ? C.green : st.rate >= 0.2 ? C.gold : C.pink, minWidth: 52, textAlign: "right" }}>{ratePct(st.rate)} kept</span>
                  </span>
                </div>
              );
            })}
          </Card>
          <div style={{ ...muted, marginTop: 8 }}><b>Class started</b> and later fill in as each cohort begins — a 0 there is timing, not drop-off.</div>

          {/* traffic & engagement — the "before enrollment" picture: who arrives, what holds
              attention, where they leave (explains the Visited → Enroll-started drop above). */}
          <h2 style={h2s}>Traffic &amp; engagement</h2>
          <div style={{ ...muted, marginBottom: 10 }}>Where visitors come from, which screens hold attention, and where they leave — the “before enrollment” view behind the drop-off above. Anonymous &amp; aggregate.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 18 }} className="enroll-grid">
            <Card style={{ padding: 16 }}>
              <b style={{ fontSize: 13.5 }}>Where visitors come from</b>
              <div style={{ fontSize: 11, color: C.muted, margin: "2px 0 2px" }}>Each source, broken down by country.</div>
              <div style={{ marginTop: 4 }}>
                {eng.sourceCountry.length === 0 && <div style={muted}>No visits yet.</div>}
                {eng.sourceCountry.map((s) => (
                  <div key={s.source} style={{ padding: "9px 0", borderTop: `1px solid ${C.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: C.ink, fontWeight: 600 }}>{s.source === "direct" ? "Direct / typed in" : s.source}</span>
                      <b>{s.count.toLocaleString()}</b>
                    </div>
                    {s.byCountry.length > 0 ? (
                      <div style={{ fontSize: 12, color: C.ink2, marginTop: 3, lineHeight: 1.5 }}>
                        {s.byCountry.slice(0, 6).map((c, i) => <span key={c.country}>{i > 0 ? " · " : ""}{countryName(c.country)} {c.count.toLocaleString()}</span>)}
                        {s.byCountry.length > 6 && <span style={{ color: C.muted }}> · +{s.byCountry.length - 6} more</span>}
                      </div>
                    ) : <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>No geography yet</div>}
                  </div>
                ))}
              </div>
              {eng.usStates && eng.usStates.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 3 }}>US visits by state</div>
                  <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.5 }}>
                    {eng.usStates.slice(0, 8).map((s, i) => <span key={s.region}>{i > 0 ? " · " : ""}{s.region} {s.count.toLocaleString()}</span>)}
                    {eng.usStates.length > 8 && <span style={{ color: C.muted }}> · +{eng.usStates.length - 8} more</span>}
                  </div>
                </div>
              )}
            </Card>
            <Card style={{ padding: 16 }}>
              <b style={{ fontSize: 13.5 }}>Which screens hold attention</b>
              <div style={{ fontSize: 11, color: C.muted, margin: "2px 0 2px" }}>How many times each screen was seen, and the average time on it.</div>
              <div style={{ marginTop: 8 }}>
                {eng.screens.length === 0 && <div style={muted}>No screen views recorded yet.</div>}
                {eng.screens.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", paddingBottom: 4 }}>
                    <span>Screen</span><span style={{ textAlign: "right", minWidth: 44 }}>Views</span><span style={{ textAlign: "right", minWidth: 56 }}>Avg time</span>
                  </div>
                )}
                {eng.screens.slice(0, 8).map((s) => (
                  <div key={s.screen} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
                    <span style={{ color: C.ink2 }}>{screenName(s.screen)}</span>
                    <b style={{ textAlign: "right", minWidth: 44 }}>{s.views.toLocaleString()}</b>
                    <b style={{ textAlign: "right", minWidth: 56 }}>{fmtDwell(s.avgMs)}</b>
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{ padding: 16 }}>
              <b style={{ fontSize: 13.5 }}>Where they leave</b>
              <div style={{ fontSize: 11, color: C.muted, margin: "2px 0 2px" }}>The last screen before leaving — how many left there, and that screen’s share of all exits.</div>
              <div style={{ marginTop: 8 }}>
                {eng.exits.length === 0 && <div style={muted}>No exits recorded yet.</div>}
                {eng.exits.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", paddingBottom: 4 }}>
                    <span>Screen</span><span style={{ textAlign: "right", minWidth: 44 }}>Exits</span><span style={{ textAlign: "right", minWidth: 56 }}>Share</span>
                  </div>
                )}
                {eng.exits.slice(0, 8).map((s) => (
                  <div key={s.screen} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
                    <span style={{ color: C.ink2 }}>{screenName(s.screen)}</span>
                    <b style={{ textAlign: "right", minWidth: 44 }}>{s.count.toLocaleString()}</b>
                    <b style={{ textAlign: "right", minWidth: 56 }}>{ratePct(s.pct)}</b>
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{ padding: 16 }}>
              <b style={{ fontSize: 13.5 }}>Why they hesitate</b>
              <div style={{ marginTop: 10 }}>
                {eng.hesitations.length === 0 && <div style={muted}>No one's told us yet <span>(from the “what's holding you back?” chips on Enroll).</span></div>}
                {eng.hesitations.slice(0, 8).map((h) => (
                  <div key={h.reason} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
                    <span style={{ color: C.ink2 }}>{(HESITATION_REASONS.find((r) => r.value === h.reason) || {}).label || h.reason}</span>
                    <b>{h.count.toLocaleString()}</b>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* top paths — the ordered screens each visit moves through (anonymous, stitched per visit
              by a random session id; explains the drop-off above as actual journeys). */}
          <h2 style={h2s}>Top paths through the site</h2>
          <div style={{ ...muted, marginBottom: 10 }}>The screens each visit moves through, in order — most common first. Stitched only by a random per-visit id (no PII); “left” marks where the visit ended.</div>
          <Card style={{ padding: 16 }}>
            {paths.sessions === 0 ? (
              <div style={muted}>No journeys recorded yet — paths appear once visitors move through a few screens.</div>
            ) : (
              <>
                <div style={{ ...muted, marginBottom: 6 }}>{paths.sessions.toLocaleString()} visit{paths.sessions === 1 ? "" : "s"} traced.</div>
                {paths.countries && paths.countries.length > 0 && (
                  <div style={{ ...muted, display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontWeight: 700 }}>Top countries:</span>
                    {paths.countries.slice(0, 6).map((c) => (
                      <span key={c.country || "unknown"}>{countryName(c.country)} {c.count.toLocaleString()}</span>
                    ))}
                  </div>
                )}
                {paths.paths.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 13 }}>
                      {p.steps.map((s, j) => (
                        <React.Fragment key={j}>
                          {j > 0 && <ArrowRight size={12} style={{ color: C.muted, flexShrink: 0 }} />}
                          <span style={{ color: C.ink2, fontWeight: 600 }}>{screenName(s)}</span>
                        </React.Fragment>
                      ))}
                      {p.left && <><ArrowRight size={12} style={{ color: C.muted, flexShrink: 0 }} /><span style={{ color: C.muted, fontStyle: "italic" }}>left</span></>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {p.byCountry && p.byCountry.length > 0 && (
                        <span style={{ fontSize: 11.5, color: C.muted }} title={p.byCountry.map((c) => `${countryName(c.country)} ${c.count}`).join(" · ")}>
                          {p.byCountry.slice(0, 3).map((c) => countryName(c.country)).join(" · ")}
                        </span>
                      )}
                      <b style={{ fontSize: 13 }}>{p.count.toLocaleString()}</b>
                    </div>
                  </div>
                ))}
              </>
            )}
          </Card>

          {/* curves */}
          <div style={{ display: "grid", gridTemplateColumns: summary.checkinCurve.length ? "1fr 1fr" : "1fr", gap: 18, marginTop: 8 }} className="enroll-grid">
            <div>
              <h2 style={h2s}>Week-by-week progression</h2>
              <Card style={{ padding: 16 }}>
                <div style={muted}>Students reaching each week (drop-off across the 12-week course).</div>
                <React.Suspense fallback={<div style={{ height: 200 }} />}>
                  <Charts kind="countline" data={summary.weekCurve} color={C.emerald} mutedColor={C.muted} fmt={fmt} />
                </React.Suspense>
              </Card>
            </div>
            {summary.checkinCurve.length > 0 && (
              <div>
                <h2 style={h2s}>Check-in retention</h2>
                <Card style={{ padding: 16 }}>
                  <div style={muted}>Follow-up check-ins completed after graduation (post-course retention).</div>
                  <React.Suspense fallback={<div style={{ height: 200 }} />}>
                    <Charts kind="countline" data={summary.checkinCurve} color={C.turq} mutedColor={C.muted} fmt={fmt} />
                  </React.Suspense>
                </Card>
              </div>
            )}
          </div>

          {/* withdrawals exit branch */}
          <h2 style={h2s}>Withdrawals (exit branch)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }} className="enroll-grid">
            <Stat label="Total" value={summary.withdrawals.total.toLocaleString()} icon={Activity} color={C.pink} />
            <Stat label="Full refund" value={summary.withdrawals.byTier.full.toLocaleString()} sub="before class started" color={C.ink} />
            <Stat label="Prorated" value={summary.withdrawals.byTier.prorated.toLocaleString()} sub={`within the ${REFUND_WINDOW}`} color={C.ink} />
            <Stat label="No refund" value={summary.withdrawals.byTier.none.toLocaleString()} sub="after the window" color={C.ink} />
          </div>
          {summary.withdrawals.total > 0 && (
            <Card style={{ padding: 16, marginTop: 12 }}>
              <b style={{ fontSize: 13.5 }}>Why they cancelled</b>
              <div style={{ marginTop: 8 }}>
                {Object.entries(summary.withdrawals.byReason).sort((a, b) => b[1] - a[1]).map(([r, n], i) => (
                  <div key={r} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
                    <span style={{ color: C.ink2 }}>{cancelReasonLabel(r) || (r === "unspecified" ? "Unspecified" : r)}</span>
                    <b>{n.toLocaleString()}</b>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>)}

        {!error && events !== null && tab === "cohorts" && (<>
          <h2 style={h2s}>Cohorts &amp; schedule</h2>
          <CohortEditor />
          <h2 style={h2s}>Class recordings</h2>
          <RecordingsEditor />
          <h2 style={h2s}>Class objectives</h2>
          <ObjectivesEditor />
          <h2 style={h2s}>Homework</h2>
          <HomeworkEditor />
          <h2 style={h2s}>Next-cohort interest</h2>
          <InterestAdmin />
        </>)}

        {!error && events !== null && tab === "students" && (<>
          {/* Sub-nav: split the (formerly 10-section) kitchen sink into two clusters so the tab opens
              compact — actual ENROLLED students vs. INBOUND leads/requests. One cluster shows at a time. */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
            <span style={{ ...muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginRight: 4 }}>View</span>
            {segBtn("Enrolled students", studentsView === "enrolled", () => setStudentsView("enrolled"))}
            {segBtn("Inbound · leads & requests", studentsView === "inbound", () => setStudentsView("inbound"))}
          </div>
          {studentsView === "enrolled" ? (<>
            <h2 style={h2s}>Free applications</h2>
            <FreeApplicationsAdmin />
            <h2 style={h2s}>Partner enrollments</h2>
            <PartnerEnrollAdmin />
            <h2 style={h2s}>Certificates</h2>
            <CertificatesAdmin />
            <h2 style={h2s}>Student plans</h2>
            <BuildPlansAdmin />
            <h2 style={h2s}>Student showcase</h2>
            <ShowcaseAdmin />
            <h2 style={h2s}>Refunds to issue</h2>
            <RefundsAdmin />
            <h2 style={h2s}>Failed payments</h2>
            <PaymentFailuresAdmin />
            <h2 style={h2s}>Reset a test account</h2>
            <AccountReset />
          </>) : (<>
            <h2 style={h2s}>Tutor applications</h2>
            <TutorInterestAdmin />
            <h2 style={h2s}>Partner inquiries</h2>
            <PartnerLeadsAdmin />
            <h2 style={h2s}>Questions from visitors</h2>
            <QuestionsAdmin />
            <h2 style={h2s}>Schedule requests</h2>
            <ScheduleRequestsAdmin />
          </>)}
        </>)}

        {!error && events !== null && tab === "settings" && (<>
          <h2 style={h2s}>Site settings</h2>
          <SettingsEditor />
          <h2 style={h2s}>Funnel simulation agent</h2>
          <ScenarioAgentEditor />
          <h2 style={h2s}>Admins</h2>
          <FoundersEditor founders={founders} />
          <h2 style={h2s}>Partners (third-party enrollment)</h2>
          <PartnersEditor />
          <h2 style={h2s}>Partner settlement</h2>
          <SettlementAdmin summary={settlement} partners={partners} onSaved={loadFunnel} />
          <h2 style={h2s}>System status</h2>
          <SystemStatus />
          <h2 style={h2s}>Danger zone</h2>
          <Card style={{ padding: 18, borderColor: C.rust }}>
            <b style={{ fontSize: 13.5, color: C.ink }}>Reset funnel data</b>
            <div style={{ ...muted, margin: "4px 0 12px" }}>Permanently clears ALL funnel events (yours and everyone’s) and starts fresh. This can’t be undone — it lives here, out of the way, so it isn’t clicked by mistake.</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span {...act(resetFunnel)} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#fff", background: C.rust, borderRadius: 4, padding: "8px 14px" }}>Reset funnel data</span>
              {resetMsg && <span style={{ fontSize: 12.5, fontWeight: 700, color: C.muted }}>{resetMsg}</span>}
            </div>
          </Card>
        </>)}
      </div>
    </div>
  );
}

// Read an uploaded image File and return a small square JPEG data URI (center-cropped "cover",
// 360px @ q0.85 ≈ the bundled default's ~18 KB) — so an unbounded camera photo never bloats the
// publicly-shipped settings blob. Resizing happens here in the browser; the server also caps it.
function fileToSquareDataUrl(file, size = 360, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("not an image"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2; // center crop
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        canvas.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// One settings field that's an image (the founder photo): a live preview + upload + reset-to-default.
function ImageSettingField({ field, value, onChange }) {
  const [err, setErr] = useState("");
  const inputRef = useRef(null);
  const onPick = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setErr("");
    try { onChange(await fileToSquareDataUrl(file)); }
    catch { setErr("Couldn't read that image — try a JPG or PNG."); }
    if (inputRef.current) inputRef.current.value = ""; // allow re-picking the same file
  };
  const lab = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 4 };
  return (
    <div>
      <span style={lab}>{field.label}</span>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <img src={value || SUNIL_PHOTO} alt="Founder photo preview"
          style={{ width: 72, height: 72, borderRadius: 6, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.line}` }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={() => inputRef.current && inputRef.current.click()}
            style={{ background: C.paper2, color: C.ink, border: `1px solid ${C.line}`, padding: "8px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700 }}>
            {value ? "Replace photo" : "Upload photo"}
          </button>
          {value && <button type="button" className="btn" onClick={() => onChange("")}
            style={{ background: "transparent", color: C.muted, border: "none", padding: "8px 4px", borderRadius: 4, fontSize: 13, fontWeight: 700 }}>Use default</button>}
          <input ref={inputRef} type="file" accept="image/*" aria-label={field.label} onChange={onPick} style={{ display: "none" }} />
        </div>
      </div>
      {field.hint && <span style={{ fontSize: 12, color: C.muted, display: "block", marginTop: 6 }}>{field.hint}</span>}
      {err && <span style={{ fontSize: 12, color: C.pink, display: "block", marginTop: 4, fontWeight: 700 }}>{err}</span>}
    </div>
  );
}

// Live site-settings editor — the founder-editable runtime values (booking link, contact email,
// LinkedIn). Reads the current settings from /api/cohorts and saves via the founder-gated
// PUT /api/funnel?resource=settings. Changes show on the public site without a redeploy.
function SettingsEditor() {
  const [vals, setVals] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/cohorts");
        const cat = await r.json();
        if (live) setVals({ ...SITE_DEFAULTS, ...(cat && cat.settings ? cat.settings : {}) });
      } catch { if (live) setVals({ ...SITE_DEFAULTS }); }
    })();
    return () => { live = false; };
  }, []);

  if (vals === null) return <Card style={{ padding: 18, color: C.muted }}>Loading settings…</Card>;

  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel?resource=settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vals),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setVals(d.settings); Object.assign(CONFIG, d.settings); setStatus("Saved — live now ✓");
      } else setStatus(adminSaveErr(r, d, "save settings"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };

  const lab = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 4 };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>These take effect on the public site immediately (no redeploy). Leave the booking link empty to use the built-in demo scheduler.</div>
      <div style={{ display: "grid", gap: 14 }}>
        {SETTINGS_FIELDS.map((f) => f.type === "image" ? (
          <ImageSettingField key={f.key} field={f} value={vals[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
        ) : f.type === "boolean" ? (
          <label key={f.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" aria-label={f.label} checked={!!vals[f.key]} onChange={(e) => set(f.key, e.target.checked)}
              style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0, accentColor: C.emerald, cursor: "pointer" }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, display: "block" }}>{f.label}{vals[f.key] ? " · ON" : " · off"}</span>
              {f.hint && <span style={{ fontSize: 12, color: C.muted, display: "block", marginTop: 2 }}>{f.hint}</span>}
            </span>
          </label>
        ) : (
          <label key={f.key} style={{ display: "block" }}>
            <span style={lab}>{f.label}</span>
            <input aria-label={f.label} type="text" value={vals[f.key] ?? ""} placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
              style={{ fontSize: 14, padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, width: "100%", boxSizing: "border-box" }} />
            {f.hint && <span style={{ fontSize: 12, color: C.muted, display: "block", marginTop: 4 }}>{f.hint}</span>}
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Save settings</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Founder-editable settings for the Week-9 funnel agent (on/off + which model). Saved to the same
// private ops blob (/api/funnel?resource=ops) — saveOps merges, so this won't clobber notifyEmail.
// The API KEY stays a host env var (ANTHROPIC_API_KEY) — never edited or shown here.
const SCENARIO_MODEL_OPTS = [
  ["claude-haiku-4-5", "Haiku 4.5 — cheapest (~<1¢ / generation) · recommended"],
  ["claude-sonnet-4-6", "Sonnet 4.6 — balanced"],
  ["claude-opus-4-8", "Opus 4.8 — most capable, priciest (~3–5¢ / generation)"],
];
function ScenarioAgentEditor() {
  const [ops, setOps] = useState(null);
  const [keyPresent, setKeyPresent] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/funnel?resource=ops"); const d = r.ok ? await r.json() : {};
        const o = d.ops || {};
        if (live) { setKeyPresent(!!d.anthropicKeyPresent); setOps({ enabled: o.scenarioAgentEnabled !== false, model: o.scenarioModel || "claude-haiku-4-5" }); }
      } catch { if (live) setOps({ enabled: true, model: "claude-haiku-4-5" }); }
    })();
    return () => { live = false; };
  }, []);
  if (ops === null) return <Card style={{ padding: 18, color: C.muted }}>Loading…</Card>;
  const liveOn = keyPresent && ops.enabled;
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel?resource=ops", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioAgentEnabled: ops.enabled, scenarioModel: ops.model }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setOps({ enabled: d.ops.scenarioAgentEnabled !== false, model: d.ops.scenarioModel }); setStatus("Saved — live now ✓"); }
      else setStatus(adminSaveErr(r, d, "save scenario agent"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };
  const lab = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 4 };
  const fieldS = { fontSize: 14, padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, width: "100%", maxWidth: 460, boxSizing: "border-box" };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Week 9's <b>“Simulate more advanced scenarios”</b> button uses AI to generate funnels from each student's own metrics. If it's off or no key is set, students still get the built-in practice funnels (free). You're billed per generation on whatever Anthropic key you set.</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, border: `1px solid ${liveOn ? C.green : C.line}`, background: liveOn ? "#eef3f0" : C.paper2, borderRadius: 6, padding: "10px 12px", marginBottom: 14 }}>
        <b style={{ color: liveOn ? C.green : C.ink2 }}>Currently: {liveOn ? "AI generation (billed)" : "Free built-in funnels — no charge"}</b>
        <div style={{ color: C.muted, marginTop: 4 }}>
          {keyPresent
            ? <>An <code>ANTHROPIC_API_KEY</code> is set on the host. {ops.enabled ? "The agent is live — each click bills your key." : "Flip the toggle on to use it."}</>
            : <>No <code>ANTHROPIC_API_KEY</code> detected, so this stays free. To turn it on: get a key from the <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700 }}>Anthropic Console</a> (console.anthropic.com → Settings → API Keys → Create Key), then add it as <code>ANTHROPIC_API_KEY</code> in <b>Vercel → your project → Settings → Environment Variables</b> and redeploy. It's a secret, so it lives on the host — not in this dashboard.</>}
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, color: C.ink, cursor: "pointer", marginBottom: 14 }}>
        <input type="checkbox" checked={ops.enabled} onChange={(e) => setOps({ ...ops, enabled: e.target.checked })} style={{ width: 17, height: 17, accentColor: C.emerald }} />
        <span>Enable AI scenario generation</span>
      </label>
      <label style={{ display: "block" }}>
        <span style={lab}>Model</span>
        <select aria-label="Scenario model" value={ops.model} onChange={(e) => setOps({ ...ops, model: e.target.value })} style={fieldS} disabled={!ops.enabled}>
          {SCENARIO_MODEL_OPTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Save</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Read-only view of the deploy-time switches that CAN'T live in a web console (they depend on
// host secrets — Resend key, AUTH_SECRET, the KV vars). Surfaced so the founder sees the full
// config picture in one place and knows what to flip on the host vs. here.
function SystemStatus() {
  const Row = ({ label, on, note }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
      <span style={{ color: C.ink2 }}>{label}<span style={{ color: C.muted, marginLeft: 8, fontSize: 12 }}>{note}</span></span>
      <b style={{ color: on ? C.green : C.muted }}>{on ? "On" : "Off"}</b>
    </div>
  );
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 4 }}>Set on the host (environment variables), not here — they hold secrets. Shown read-only so you can see the whole picture.</div>
      <Row label="Email delivery" on={CONFIG.emailEnabled} note="needs RESEND_API_KEY" />
      <Row label="Accounts &amp; login" on={CONFIG.authEnabled} note="needs AUTH_SECRET + KV" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
        <span style={{ color: C.ink2 }}>Brand domain</span><b>{CONFIG.brandDomain}</b>
      </div>
    </Card>
  );
}

// Per-week class-recording links, per cohort. Stored in the cohort catalog (recordings map) and
// saved via the same founder-gated PUT /api/funnel. A student's "Rewatch" uses the week's recording
// when present, else the live class link.
function RecordingsEditor() {
  const [cat, setCat] = useState(null); // { batches, checkins }
  const [idx, setIdx] = useState(0);    // selected cohort
  const [status, setStatus] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/cohorts"); const c = await r.json(); if (live) setCat({ batches: Array.isArray(c.batches) ? c.batches : [], checkins: c.checkins ?? 1 }); }
      catch { if (live) setStatus("Couldn't load cohorts (network). Refresh to try again."); }
    })();
    return () => { live = false; };
  }, []);

  if (cat === null && !status) return <Card style={{ padding: 18, color: C.muted }}>Loading…</Card>;
  if (!cat || !cat.batches.length) return <Card style={{ padding: 18, color: C.muted }}>{status || "Add a cohort first (above), then you can post its recordings here."}</Card>;

  const b = cat.batches[idx] || cat.batches[0];
  const setRec = (w, url) => setCat((c) => ({ ...c, batches: c.batches.map((bb, j) => (j === idx ? { ...bb, recordings: { ...(bb.recordings || {}), [String(w)]: url } } : bb)) }));
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batches: cat.batches, checkins: cat.checkins }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setCat({ batches: d.catalog.batches, checkins: d.catalog.checkins }); setStatus("Saved — live now ✓"); }
      else setStatus(adminSaveErr(r, d, "save recordings"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };
  const inp = { fontSize: 12.5, padding: "7px 9px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, width: "100%", boxSizing: "border-box" };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Paste each session's <b>Zoom cloud-recording link</b>. When set, a student's "Rewatch" for that week opens the recording (otherwise the live class link). Goes live immediately.</div>
      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 5 }}>Cohort</span>
        <select aria-label="Cohort" value={idx} onChange={(e) => setIdx(Number(e.target.value))} style={inp}>
          {cat.batches.map((bb, j) => <option key={bb.id || j} value={j}>{bb.id} — {bb.season} · {bb.day}</option>)}
        </select>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="enroll-grid">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
          <label key={w} style={{ display: "block" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 3 }}>Week {w} recording</span>
            <input aria-label={`Week ${w} recording URL`} type="text" placeholder="https://…/rec/share/…" value={(b.recordings && b.recordings[String(w)]) || ""} onChange={(e) => setRec(w, e.target.value)} style={inp} />
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Save recordings</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Founder editor for the 12 weeks' homework/prep text (week-completion email + class reminder).
// KV-backed via PUT /api/funnel?resource=homework; live immediately.
function HomeworkEditor() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/cohorts"); const c = await r.json(); if (live) setRows(Array.isArray(c.homework) && c.homework.length === 12 ? c.homework : WEEK_PREP.slice(0, 12)); }
      catch { if (live) setRows(WEEK_PREP.slice(0, 12)); }
    })();
    return () => { live = false; };
  }, []);
  if (rows === null) return <Card style={{ padding: 18, color: C.muted }}>Loading…</Card>;
  const set = (i, v) => setRows((rs) => rs.map((r, j) => (j === i ? v : r)));
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel?resource=homework", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ homework: rows }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setRows(d.homework); setHomework(d.homework); setStatus("Saved — live now ✓"); }
      else setStatus(adminSaveErr(r, d, "save homework"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Homework for each week — sent in the week-completion email (prep for the next week) and the 2-days-before class reminder. Leave a week blank to skip its homework.</div>
      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((v, i) => (
          <label key={i} style={{ display: "block" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>Week {i + 1} · {WEEKS[i].t}</span>
            <textarea aria-label={`Week ${i + 1} homework`} value={v} onChange={(e) => set(i, e.target.value)} rows={2} style={{ width: "100%", boxSizing: "border-box", fontSize: 13.5, padding: "9px 11px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 }} />
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Save homework</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Founder editor for the 12 weeks' class objectives ("What you'll learn this class" — the in-dashboard
// kickoff shown at the top of each week). KV-backed via PUT /api/funnel?resource=objectives; live
// immediately. One objective per line.
function ObjectivesEditor() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/cohorts"); const c = await r.json(); if (live) setRows(Array.isArray(c.objectives) && c.objectives.length === 12 ? c.objectives : WEEK_OBJECTIVES.slice(0, 12)); }
      catch { if (live) setRows(WEEK_OBJECTIVES.slice(0, 12)); }
    })();
    return () => { live = false; };
  }, []);
  if (rows === null) return <Card style={{ padding: 18, color: C.muted }}>Loading…</Card>;
  const set = (i, v) => setRows((rs) => rs.map((r, j) => (j === i ? v : r)));
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel?resource=objectives", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objectives: rows }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setRows(d.objectives); setObjectives(d.objectives); setStatus("Saved — live now ✓"); }
      else setStatus(adminSaveErr(r, d, "save objectives"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>What students see at the top of each week — the class kickoff (instead of a slide). The <b>first line</b> is the connective intro (last week → this week → what's next); the rest are the takeaways, one per line. Leave a week blank to hide its card.</div>
      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((v, i) => (
          <label key={i} style={{ display: "block" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>Week {i + 1} · {WEEKS[i].t}</span>
            <textarea aria-label={`Week ${i + 1} objectives`} value={v} onChange={(e) => set(i, e.target.value)} rows={3} style={{ width: "100%", boxSizing: "border-box", fontSize: 13.5, padding: "9px 11px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 }} />
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Save objectives</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Live cohort editor — add / edit / remove batches (dates, days, seats, price, Zoom, Stripe link)
// and the check-in count. Reads the current catalog from /api/cohorts and saves via the
// founder-gated PUT /api/funnel. Changes show on the public site without a redeploy.
function CohortEditor() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/cohorts");
        const cat = await r.json();
        if (live) setRows(Array.isArray(cat.batches) ? cat.batches : []);
      } catch { if (live) setRows([]); }
    })();
    return () => { live = false; };
  }, []);

  if (rows === null) return <Card style={{ padding: 18, color: C.muted }}>Loading cohorts…</Card>;

  const update = (i, key, val) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: val } : r)));
  const remove = (i) => setRows((rs) => rs.filter((_, j) => j !== i));
  const add = () => setRows((rs) => [...rs, { id: "", season: "fall", track: "Builders", start: "", day: "", seats: 12, price: 999, zoom: "", groupEmail: "", stripeLink: "" }]);
  // Duplicate a cohort as a starting point for a new one (SPECS/018): insert a clone right below it with a
  // fresh unique id + cleared per-instance fields. The founder sets a new start date (+ Stripe link), then Saves.
  const duplicate = (i) => {
    setRows((rs) => { const clone = duplicateCohort(rs[i], rs.map((r) => r.id)); return [...rs.slice(0, i + 1), clone, ...rs.slice(i + 1)]; });
    setStatus("Duplicated below — set a new start date" + ((rows[i].price || 0) === 0 ? "" : " + Stripe link") + ", then Save changes.");
  };
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batches: rows }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) { setRows(data.catalog.batches); setStatus("Saved — live now ✓"); }
      else setStatus(adminSaveErr(r, data, "save cohorts"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };

  const inp = { fontSize: 12.5, padding: "6px 8px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, width: "100%", boxSizing: "border-box" };
  const lab = { fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 3 };
  const field = (i, key, label, type = "text", w = "1fr") => (
    <label style={{ gridColumn: `span 1`, minWidth: 0 }}><span style={lab}>{label}</span>
      <input aria-label={`${label} for cohort ${i + 1}`} type={type} value={rows[i][key] ?? ""} onChange={(e) => update(i, key, type === "number" ? e.target.value : e.target.value)} style={inp} /></label>
  );

  // The cohort `start` is stored as a human, Date-parseable string ("Sep 7, 2026") that the card +
  // all the date math read directly. The editor offers a native calendar PICKER instead of free text:
  // we convert the stored string ↔ the input's ISO "yyyy-mm-dd" on the fly, and keep STORING the human
  // form so nothing downstream changes. ISO is built from local Y/M/D (and ISO input passes through) so
  // no timezone off-by-one. Unparseable/blank → empty picker.
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad2 = (n) => String(n).padStart(2, "0");
  const startToISO = (s) => {
    const t = String(s || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t; // already ISO
    const d = new Date(t);
    return isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };
  const isoToStart = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : ""; // e.g. "Sep 7, 2026"
  };
  const startField = (i) => (
    <label style={{ gridColumn: `span 1`, minWidth: 0 }}><span style={lab}>Start date</span>
      <input type="date" aria-label={`Start date for cohort ${i + 1}`} value={startToISO(rows[i].start)} onChange={(e) => update(i, "start", isoToStart(e.target.value))} style={inp} /></label>
  );

  // The cohort `day` stores ONE full label ("Mondays & Wednesdays · 5:00–6:30 PM PT"). Here we edit
  // it as days+time TEXT + a timezone DROPDOWN, recomposing on change so `day` stays a single string
  // (nothing downstream — display, emails, cron — has to change). Picker enforces a consistent tz.
  const TZS = ["PT", "MT", "CT", "ET", "AKT", "HT", "GMT", "CET", "IST"];
  const TZ_KNOWN = new Set([...TZS, "PST", "PDT", "MST", "MDT", "CST", "CDT", "EST", "EDT", "AKST", "AKDT", "HST", "UTC"]);
  const splitDay = (day) => {
    const d = String(day || "").trim();
    const m = d.match(/\s([A-Za-z]{2,4})$/);
    const tz = m ? m[1].toUpperCase() : "";
    return (m && TZ_KNOWN.has(tz)) ? { time: d.slice(0, m.index).trim(), tz } : { time: d, tz: "" };
  };
  const setDay = (i, time, tz) => update(i, "day", `${time}${tz ? ` ${tz}` : ""}`.trim());
  const dayField = (i) => {
    const { time, tz } = splitDay(rows[i].day);
    const opts = (tz && !TZS.includes(tz)) ? [tz, ...TZS] : TZS; // keep a legacy tz selectable
    return (<>
      <label style={{ gridColumn: "span 1", minWidth: 0 }}><span style={lab}>Days &amp; time</span>
        <input aria-label={`Days and time for cohort ${i + 1}`} value={time} onChange={(e) => setDay(i, e.target.value, tz)} placeholder="Mondays & Wednesdays · 5:00–6:30 PM" style={inp} /></label>
      <label style={{ gridColumn: "span 1", minWidth: 0 }}><span style={lab}>Timezone</span>
        <select aria-label={`Timezone for cohort ${i + 1}`} value={tz} onChange={(e) => setDay(i, time, e.target.value)} style={inp}>
          <option value="">—</option>
          {opts.map((t) => <option key={t} value={t}>{t}</option>)}
        </select></label>
    </>);
  };

  // PACE — every cohort runs the same 12 lessons (3 hrs each); a cohort optionally carries a `lessons`
  // schedule (per-lesson sitting day-offsets) so the founder can run them at ANY cadence, not just
  // weekly. The two inputs (lessons/week + sittings/lesson) generate that schedule via
  // buildLessonSchedule; "Use weekly default" drops `lessons` so the flagship 12-week cadence returns.
  // `_lpw`/`_spl` are UI-only (the server's sanitizeCatalog drops unknown keys, so they never persist).
  const genSchedule = (i) => update(i, "lessons", buildLessonSchedule({ lessonsPerWeek: Number(rows[i]._lpw || 1), sittingsPerLesson: Number(rows[i]._spl || 2) }));
  const clearSchedule = (i) => setRows((rs) => rs.map((r, j) => { if (j !== i) return r; const { lessons, ...rest } = r; return rest; }));
  const endDate = (b) => {
    const d = cohortEndDate(b);
    return d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "";
  };
  const paceBlock = (i) => {
    const b = rows[i], custom = Array.isArray(b.lessons) && b.lessons.length > 0;
    const sittings = custom ? b.lessons.reduce((n, s) => n + s.length, 0) : null;
    // The inputs reflect the cohort's REAL pace — derived from its saved schedule (the inverse of
    // Generate) — not a fixed 1/2 default, so a founder editing an accelerated cohort sees its actual
    // lessons/week + sittings/lesson. A pending manual edit (`_lpw`/`_spl`) still wins while typing.
    const pace = paceFromLessons(b.lessons);
    return (
      <div style={{ marginTop: 8, padding: "8px 10px", background: C.paper2, borderRadius: 4, border: `1px dashed ${C.line}` }}>
        <span style={lab}>Pace — 12 lessons (3 hrs each = 36 hrs); set how fast they run</span>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 4 }}>
          <label style={{ minWidth: 0 }}><span style={lab}>Lessons / week</span>
            <input type="number" min="1" max="7" aria-label={`Lessons per week for cohort ${i + 1}`} value={b._lpw ?? pace.lessonsPerWeek} onChange={(e) => update(i, "_lpw", e.target.value)} style={{ ...inp, width: 92 }} /></label>
          <label style={{ minWidth: 0 }}><span style={lab}>Sittings / lesson</span>
            <input type="number" min="1" max="3" aria-label={`Sittings per lesson for cohort ${i + 1}`} value={b._spl ?? pace.sittingsPerLesson} onChange={(e) => update(i, "_spl", e.target.value)} style={{ ...inp, width: 92 }} /></label>
          <button type="button" className="btn" onClick={() => genSchedule(i)} style={{ background: C.emerald, color: "#fff", padding: "7px 12px", borderRadius: 4, fontSize: 12.5, fontWeight: 700 }}>Generate schedule</button>
          {custom && <button type="button" className="btn" onClick={() => clearSchedule(i)} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.muted, padding: "7px 12px", borderRadius: 4, fontSize: 12.5 }}>Use weekly default</button>}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
          {custom
            ? <>Custom schedule · {b.lessons.length} lessons · {sittings} sittings{endDate(b) ? <> · ends <b style={{ color: C.ink }}>{endDate(b)}</b></> : <> · set a start date to preview the end</>}</>
            : <>Weekly default — the flagship 12-week cadence (2 sittings/week){endDate(b) ? <> · ends <b style={{ color: C.ink }}>{endDate(b)}</b></> : ""}.</>}
        </div>
      </div>
    );
  };

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Edits go live on the public site immediately (no redeploy). Each cohort's <b>id</b> must be unique and stable; its Stripe link's metadata/redirect should use that id. Set <b>Price ($)</b> to <b>0</b> to create a <b>scholarship cohort</b> — only do this <b>when you have funding/sponsorship to cover the seats</b>, since it's the only thing that makes them free. Scholarship cohorts enroll <b>by application</b> (a write-up you approve under Students → Free applications); no Stripe link needed.</div>
      {rows.map((b, i) => (
        <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: 12, marginBottom: 10, background: C.paper }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }} className="enroll-grid">
            {field(i, "id", "Cohort id")}
            {field(i, "season", "Season key")}
            {field(i, "track", "Track")}
            {startField(i)}
            {dayField(i)}
            {field(i, "price", "Price ($)", "number")}
            {field(i, "seats", "Seats", "number")}
            {field(i, "zoom", "Zoom URL")}
            {field(i, "groupEmail", "Group email (whole cohort)")}
            {field(i, "stripeLink", "Stripe Payment Link")}
            {field(i, "audience", "Card badge audience")}
            {field(i, "format", "Card format line")}
            {field(i, "sortOrder", "Display order (0 = by date)", "number")}
          </div>
          <label style={{ display: "block", marginTop: 8 }}><span style={lab}>Card description (shown in full on the cohort card) — leave blank for the default</span>
            <textarea aria-label={`Card description for cohort ${i + 1}`} value={rows[i].blurb ?? ""} onChange={(e) => update(i, "blurb", e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} placeholder="Build a product you believe people would pay for, take it live, …" /></label>
          {paceBlock(i)}
          <label style={{ display: "block", marginTop: 8 }}>
            <span style={lab}>Progress override — where this cohort actually is (use if class ran ahead/behind its dates)</span>
            <select aria-label={`Progress override for cohort ${i + 1}`} value={Number(rows[i].manualLesson) || 0}
              onChange={(e) => update(i, "manualLesson", Number(e.target.value))} style={{ ...inp, maxWidth: 320 }}>
              <option value={0}>Auto — follow the calendar</option>
              {Array.from({ length: 12 }, (_, k) => <option key={k + 1} value={k + 1}>On lesson {k + 1}</option>)}
              <option value={13}>Graduated (course complete)</option>
            </select>
          </label>
          <div style={{ textAlign: "right", marginTop: 8, display: "flex", gap: 18, justifyContent: "flex-end" }}>
            <span {...act(() => duplicate(i))} style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.emerald }}>Duplicate</span>
            <span {...act(() => remove(i))} style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.rust }}>Remove cohort</span>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
        <span {...act(add)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.emerald, border: `1px solid ${C.emerald}`, borderRadius: 4, padding: "8px 14px" }}>+ Add cohort</span>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700, marginLeft: "auto" }}>Save changes</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Founder tool: manage the admin allowlist — add/remove the emails that get founder access.
// Env-bootstrap founders are permanent (the server keeps them even if removed here).
function FoundersEditor({ founders }) {
  const [list, setList] = useState(founders || []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => { setList(founders || []); }, [founders]);

  const add = () => {
    const e = email.trim().toLowerCase();
    if (!validEmail(e)) { setStatus("Enter a valid email"); return; }
    if (!list.includes(e)) setList([...list, e]);
    setEmail(""); setStatus("");
  };
  const remove = (e) => setList(list.filter((x) => x !== e));
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel?resource=founders", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails: list }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setList(d.founders);
        // SPECS/015: new admins are auto-emailed a set-password invite; surface who got one (or couldn't).
        const invited = Array.isArray(d.invited) ? d.invited : [];
        const failed = Array.isArray(d.inviteFailed) ? d.inviteFailed : [];
        let msg = "Saved ✓";
        if (invited.length) msg += ` — set-password invite sent to ${invited.join(", ")}`;
        if (failed.length) msg += ` — couldn't email ${failed.join(", ")} (check email is configured; they can use “Forgot password?”)`;
        setStatus(msg);
      } else setStatus(adminSaveErr(r, d, "save admins"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>Anyone here gets admin access when they sign in. (Bootstrap admins set via env can't be removed.)</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {list.map((e) => (
          <span key={e} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 12px", fontSize: 13, color: C.ink2 }}>
            {e}<span {...act(() => remove(e))} aria-label={`remove ${e}`} style={{ cursor: "pointer", color: C.rust, fontWeight: 800 }}>×</span>
          </span>
        ))}
        {list.length === 0 && <span style={{ fontSize: 13, color: C.muted }}>No admins yet.</span>}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input aria-label="add admin email" type="email" placeholder="newadmin@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          style={{ fontSize: 14, padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, flex: 1, minWidth: 220 }} />
        <span {...act(add)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.emerald, border: `1px solid ${C.emerald}`, borderRadius: 4, padding: "9px 14px" }}>+ Add</span>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Save admins</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Partners (marketplace/reseller) editor — the third-party-enrollment channel registry (SPECS/005+006).
// Each partner has a cut % (commission, FOUNDER-ONLY) + public display fields for the showcase. Loaded
// via GET /api/funnel?resource=partners (full records), saved via founder-gated PUT ?resource=partners.
// The public site only ever sees FEATURED partners' display fields (publicPartners) — cut % stays here.
function PartnersEditor() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=partners"); const d = r.ok ? await r.json() : {}; if (live) setRows(Array.isArray(d.partners) ? d.partners : []); }
      catch { if (live) setRows([]); }
    })();
    return () => { live = false; };
  }, []);
  const update = (i, field, val) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [field]: val } : r)));
  const add = () => setRows((rs) => [...(rs || []), { id: "", name: "", cutPct: 0, displayName: "", logo: "", publicUrl: "", blurb: "", featureOnSite: false }]);
  const remove = (i) => setRows((rs) => rs.filter((_, j) => j !== i));
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel?resource=partners", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partners: rows }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setRows(d.partners); setStatus("Saved ✓"); } else setStatus(adminSaveErr(r, d, "save partners"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };
  if (rows === null) return <Card style={{ padding: 16 }}><div style={{ fontSize: 13, color: C.muted }}>Loading…</div></Card>;
  const lab = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 3 };
  const inp = { width: "100%", padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontSize: 13.5, marginTop: 2 };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Marketplaces/resellers that bring you students (e.g. Outschool). The <b>cut %</b> is their commission — your net per seat is price × (1 − cut%). It's <b>founder-only</b> and never shown publicly. Turn on <b>Feature on site</b> to show a partner in the public "Where to find us" strip (only the display fields go public).</div>
      {rows.map((p, i) => (
        <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: 12, marginBottom: 10, background: C.paper }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }} className="enroll-grid">
            <label><span style={lab}>Partner id</span><input aria-label={`Partner id ${i + 1}`} value={p.id} onChange={(e) => update(i, "id", e.target.value)} style={inp} /></label>
            <label><span style={lab}>Name (internal)</span><input aria-label={`Partner name ${i + 1}`} value={p.name} onChange={(e) => update(i, "name", e.target.value)} style={inp} /></label>
            <label><span style={lab}>Cut % (commission)</span><input type="number" min="0" max="100" aria-label={`Partner cut percent ${i + 1}`} value={Math.round((Number(p.cutPct) || 0) * 100)} onChange={(e) => update(i, "cutPct", Math.min(1, Math.max(0, (Number(e.target.value) || 0) / 100)))} style={inp} /></label>
            <label><span style={lab}>Display name (public)</span><input aria-label={`Partner display name ${i + 1}`} value={p.displayName} onChange={(e) => update(i, "displayName", e.target.value)} style={inp} /></label>
            <label><span style={lab}>Listing URL (public)</span><input aria-label={`Partner listing URL ${i + 1}`} value={p.publicUrl} onChange={(e) => update(i, "publicUrl", e.target.value)} style={inp} /></label>
            <label><span style={lab}>Logo URL (public)</span><input aria-label={`Partner logo URL ${i + 1}`} value={p.logo} onChange={(e) => update(i, "logo", e.target.value)} style={inp} /></label>
          </div>
          <label style={{ display: "block", marginTop: 8 }}><span style={lab}>Blurb (public)</span><input aria-label={`Partner blurb ${i + 1}`} value={p.blurb} onChange={(e) => update(i, "blurb", e.target.value)} style={inp} /></label>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: C.ink2, fontWeight: 600 }}>
              <input type="checkbox" aria-label={`Feature ${p.id || i + 1} on site`} checked={!!p.featureOnSite} onChange={(e) => update(i, "featureOnSite", e.target.checked)} /> Feature on site
            </label>
            <span {...act(() => remove(i))} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: C.rust }}>Remove</span>
          </div>
        </div>
      ))}
      {rows.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>No partners yet.</div>}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
        <span {...act(add)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.emerald, border: `1px solid ${C.emerald}`, borderRadius: 4, padding: "9px 14px" }}>+ Add partner</span>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Save partners</button>
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
    </Card>
  );
}

// Per-partner SETTLEMENT (SPECS/005 T30): what each partner owes Build Young (net of their cut, over
// their ONBOARDED seats) vs. what they've paid, with the outstanding balance. The founder records a
// dated payment received (bookkeeping only — no money moves); it appends to that partner's `payments`
// and saves the partners list. `summary` (settlementSummary) + `partners` (full records) are passed in
// from the parent so the figures match the accounting export. `onSaved` re-pulls after a payment.
function SettlementAdmin({ summary, partners, onSaved }) {
  const [open, setOpen] = useState(""); // partner id with the record-payment form open
  const [form, setForm] = useState({ date: "", amount: "", note: "" });
  const [status, setStatus] = useState("");
  const rows = Array.isArray(summary) ? summary : [];
  const record = async (partnerId) => {
    const amountCents = Math.round((Number(form.amount) || 0) * 100);
    if (amountCents <= 0) { setStatus("Enter an amount"); return; }
    setStatus("Saving…");
    // Append the payment to the target partner's ledger, keep the rest, and save the full list.
    const next = (partners || []).map((p) => p.id === partnerId
      ? { ...p, payments: [...(Array.isArray(p.payments) ? p.payments : []), { date: form.date.trim() || new Date().toISOString().slice(0, 10), amountCents, note: form.note.trim() }] }
      : p);
    try {
      const r = await fetch("/api/funnel?resource=partners", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partners: next }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setStatus("Payment recorded ✓"); setForm({ date: "", amount: "", note: "" }); setOpen(""); if (onSaved) await onSaved(); }
      else setStatus(d.error || adminSaveErr(r, d, "record payment"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };
  const money = (cents) => fmt((cents || 0) / 100);
  const inp = { padding: "7px 9px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontSize: 13 };
  if (rows.length === 0) return <Card style={{ padding: 16 }}><div style={{ fontSize: 13, color: C.muted }}>No partners yet — add one under Partners above. Settlement appears once a partner has onboarded seats.</div></Card>;
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>What each partner owes (net of their cut, over <b>onboarded</b> seats) vs. what they've paid. Recording a payment is a <b>bookkeeping</b> entry — no money moves. The ledger is included in the funnel <b>JSON export</b>.</div>
      {rows.map((s) => (
        <div key={s.id} style={{ borderTop: `1px solid ${C.line}`, padding: "10px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontWeight: 700, color: C.ink }}>{s.name}</span>
            <span style={{ fontSize: 13, color: C.ink2 }}>{s.seats} seats · gross {money(s.grossCents)} · cut {money(s.cutCents)} · <b>owed {money(s.netOwedCents)}</b> · received {money(s.receivedCents)} · <b style={{ color: s.outstandingCents > 0 ? C.rust : C.green }}>outstanding {money(s.outstandingCents)}</b></span>
          </div>
          {open === s.id ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
              <input aria-label={`Payment date for ${s.id}`} placeholder="2026-09-01" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={{ ...inp, width: 120 }} />
              <input aria-label={`Payment amount for ${s.id}`} type="number" min="0" step="0.01" placeholder="Amount $" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} style={{ ...inp, width: 110 }} />
              <input aria-label={`Payment note for ${s.id}`} placeholder="Note (optional)" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} style={{ ...inp, flex: 1, minWidth: 140 }} />
              <button className="btn" onClick={() => record(s.id)} style={{ background: C.ink, color: C.paper2, padding: "7px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700 }}>Record</button>
              <span {...act(() => { setOpen(""); setForm({ date: "", amount: "", note: "" }); })} style={{ cursor: "pointer", fontSize: 12.5, color: C.muted }}>Cancel</span>
            </div>
          ) : (
            <span {...act(() => { setOpen(s.id); setStatus(""); })} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: C.emerald, display: "inline-block", marginTop: 6 }}>+ Record a payment</span>
          )}
        </div>
      ))}
      {status && <div style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status), marginTop: 10 }}>{status}</div>}
    </Card>
  );
}

// Manually create a PENDING partner (third-party) enrollment (SPECS/005). Saving is INERT — it sends
// NO email, provisions NO access, adds NOTHING to the Resend audience, and is NOT counted as enrolled;
// it just records the seat. The explicit "Start onboarding" step (T28) activates the student later.
// Lists existing partner enrollments with their status (Pending / Onboarded).
function PartnerEnrollAdmin() {
  const BATCHES = useCohorts();
  const [partners, setPartners] = useState([]);
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", batchId: "", partner: "", externalRef: "" });
  const [status, setStatus] = useState("");
  const reload = async () => {
    try { const r = await fetch("/api/funnel?resource=partner-enrollments"); const d = r.ok ? await r.json() : {}; setList(Array.isArray(d.enrollments) ? d.enrollments : []); }
    catch { setList([]); }
  };
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=partners"); const d = r.ok ? await r.json() : {}; if (live) setPartners(Array.isArray(d.partners) ? d.partners : []); } catch { /* ignore */ }
      if (live) await reload();
    })();
    return () => { live = false; };
  }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState("");
  const onboard = async (e) => {
    const key = `${e.email}|${e.batchId}`;
    setBusy(key);
    try {
      const r = await fetch("/api/funnel?resource=partner-onboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e.email, batchId: e.batchId }) });
      const d = await r.json().catch(() => ({}));
      setStatus(r.ok && d.ok ? (e.onboarded ? "Invite re-sent ✓" : "Onboarding started ✓ (welcome email sent)") : (d.error || adminSaveErr(r, d, "start onboarding")));
      await reload();
    } catch { setStatus(ADMIN_NET_ERR); }
    setBusy("");
  };
  const remove = async (e) => {
    if (!window.confirm(`Remove ${e.email} from ${e.batchId}? They lose course access and the seat stops counting in settlement. No Build Young refund is issued (partner refunds are the partner's policy).`)) return;
    const key = `${e.email}|${e.batchId}`;
    setBusy(key);
    try {
      const r = await fetch("/api/funnel?resource=partner-remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e.email, batchId: e.batchId }) });
      const d = await r.json().catch(() => ({}));
      setStatus(r.ok && d.ok ? "Removed ✓ (no refund issued)" : (d.error || adminSaveErr(r, d, "remove")));
      await reload();
    } catch { setStatus(ADMIN_NET_ERR); }
    setBusy("");
  };
  const save = async () => {
    if (!validEmail(form.email)) { setStatus("Enter a valid email"); return; }
    if (!form.batchId) { setStatus("Pick a cohort"); return; }
    if (!form.partner) { setStatus("Pick a partner"); return; }
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel?resource=partner-enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setStatus("Saved — pending (nothing sent). Use Start onboarding to send the welcome email."); setForm({ name: "", email: "", batchId: "", partner: "", externalRef: "" }); await reload(); }
      else setStatus(d.error || adminSaveErr(r, d, "save enrollment"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };
  const lab = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 3 };
  const inp = { width: "100%", padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontSize: 13.5, marginTop: 2 };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Add a student who enrolled through a <b>partner</b> (marketplace/reseller). Saving just records them — it sends <b>nothing</b>. Onboarding (the welcome email + dashboard access) is a separate <b>Start onboarding</b> step. Configure partners + their cut % under <b>Settings → Partners</b>.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }} className="enroll-grid">
        <label><span style={lab}>Student name</span><input aria-label="Partner student name" value={form.name} onChange={(e) => set("name", e.target.value)} style={inp} /></label>
        <label><span style={lab}>Student email</span><input aria-label="Partner student email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} style={inp} /></label>
        <label><span style={lab}>Cohort</span>
          <select aria-label="Partner enrollment cohort" value={form.batchId} onChange={(e) => set("batchId", e.target.value)} style={inp}>
            <option value="">Pick a cohort…</option>
            {BATCHES.map((b) => <option key={b.id} value={b.id}>{b.id} — {b.season} (starts {b.start})</option>)}
          </select></label>
        <label><span style={lab}>Partner</span>
          <select aria-label="Partner enrollment partner" value={form.partner} onChange={(e) => set("partner", e.target.value)} style={inp}>
            <option value="">Pick a partner…</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name || p.displayName || p.id}</option>)}
          </select></label>
        <label><span style={lab}>External ref (optional)</span><input aria-label="Partner external ref" value={form.externalRef} onChange={(e) => set("externalRef", e.target.value)} style={inp} /></label>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
        <button className="btn" onClick={save} style={{ background: C.ink, color: C.paper2, padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Add partner enrollment</button>
        {partners.length === 0 && <span style={{ fontSize: 12.5, color: C.muted }}>No partners yet — add one under Settings → Partners.</span>}
        {status && <span style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status) }}>{status}</span>}
      </div>
      {Array.isArray(list) && list.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {list.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
              <span style={{ color: C.ink2 }}>{e.email} · {e.batchId} · {e.partner}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: e.onboarded ? C.green : C.muted }}>{e.onboarded ? "Onboarded" : "Pending"}</span>
                <button className="btn" disabled={busy === `${e.email}|${e.batchId}`} onClick={() => onboard(e)} style={{ background: e.onboarded ? "transparent" : C.emerald, color: e.onboarded ? C.muted : "#fff", border: e.onboarded ? `1px solid ${C.line}` : "none", padding: "6px 12px", borderRadius: 4, fontSize: 12.5, fontWeight: 700 }}>
                  {busy === `${e.email}|${e.batchId}` ? "Working…" : (e.onboarded ? "Resend invite" : "Start onboarding")}
                </button>
                <span {...act(() => remove(e))} aria-label={`Remove ${e.email}`} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: C.rust }}>Remove</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Free / scholarship applications (SPECS/016). Applicants self-apply with a write-up from the public site
// ($0 cohorts); the founder reviews here and APPROVES (→ runs the SAME onboarding as Stripe/partner, at $0:
// account + welcome/set-password email + class audience + an `enrolled` event) or DECLINES (silent remove).
function FreeApplicationsAdmin() {
  const [list, setList] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState("");
  const reload = async () => {
    try { const r = await fetch("/api/funnel?resource=free-enrollments"); const d = r.ok ? await r.json() : {}; setList(Array.isArray(d.enrollments) ? d.enrollments : []); }
    catch { setList([]); }
  };
  useEffect(() => { let live = true; (async () => { if (live) await reload(); })(); return () => { live = false; }; }, []);
  const approve = async (e) => {
    const key = `${e.email}|${e.batchId}`; setBusy(key);
    try {
      const r = await fetch("/api/funnel?resource=free-approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e.email, batchId: e.batchId }) });
      const d = await r.json().catch(() => ({}));
      setStatus(r.ok && d.ok ? (e.onboarded ? "Invite re-sent ✓" : "Approved ✓ — welcome email sent") : (d.error || adminSaveErr(r, d, "approve")));
      await reload();
    } catch { setStatus(ADMIN_NET_ERR); }
    setBusy("");
  };
  const decline = async (e) => {
    if (!window.confirm(`Decline ${e.email}'s application for ${e.batchId}? This removes it${e.onboarded ? " and ends their course access" : ""}. No email is sent.`)) return;
    const key = `${e.email}|${e.batchId}`; setBusy(key);
    try {
      const r = await fetch("/api/funnel?resource=free-remove", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e.email, batchId: e.batchId }) });
      const d = await r.json().catch(() => ({}));
      setStatus(r.ok && d.ok ? "Removed ✓" : (d.error || adminSaveErr(r, d, "decline")));
      await reload();
    } catch { setStatus(ADMIN_NET_ERR); }
    setBusy("");
  };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Students apply for <b>free / scholarship seats</b> ($0 cohorts) with a write-up from the public site. <b>Approve</b> runs the full onboarding (account + welcome/set-password email + class audience) at $0; <b>Decline</b> removes the application silently (no email).</div>
      {!Array.isArray(list) ? <span style={{ fontSize: 13, color: C.muted }}>Loading…</span>
        : list.length === 0 ? <span style={{ fontSize: 13, color: C.muted }}>No free applications yet.</span>
        : list.map((e, i) => (
          <div key={i} style={{ padding: "12px 0", borderTop: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13.5, color: C.ink2, fontWeight: 700 }}>{e.name || "—"} <span style={{ fontWeight: 400, color: C.muted }}>· {e.email} · {e.batchId}</span></span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: e.onboarded ? C.green : C.muted }}>{e.onboarded ? "Approved" : "Pending"}</span>
                <button className="btn" disabled={busy === `${e.email}|${e.batchId}`} onClick={() => approve(e)} style={{ background: e.onboarded ? "transparent" : C.emerald, color: e.onboarded ? C.muted : "#fff", border: e.onboarded ? `1px solid ${C.line}` : "none", padding: "6px 12px", borderRadius: 4, fontSize: 12.5, fontWeight: 700 }}>
                  {busy === `${e.email}|${e.batchId}` ? "Working…" : (e.onboarded ? "Resend invite" : "Approve")}
                </button>
                <span {...act(() => decline(e))} aria-label={`Decline ${e.email}`} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: C.rust }}>Decline</span>
              </span>
            </div>
            {e.writeup && <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: 8, background: C.paper, borderRadius: 6, padding: "9px 12px", whiteSpace: "pre-wrap" }}>{e.writeup}</div>}
          </div>
        ))}
      {status && <div style={{ fontSize: 13, fontWeight: 700, color: adminStatusColor(status), marginTop: 12 }}>{status}</div>}
    </Card>
  );
}

// Founder tool: wipe a test account (user record + sim state) so an email can re-run enrollment.
function AccountReset() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const reset = async () => {
    if (!validEmail(email)) { setStatus("Enter a valid email"); return; }
    setStatus("Resetting…");
    try {
      const r = await fetch(`/api/funnel?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      setStatus(r.ok && d.ok ? `Cleared ${email} ✓ (they can re-enroll fresh)` : adminSaveErr(r, d, "reset"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input aria-label="email to reset" type="email" placeholder="student@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ fontSize: 14, padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, flex: 1, minWidth: 220 }} />
        <button className="btn" onClick={reset} style={{ background: C.rust, color: "#fff", padding: "9px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Reset account</button>
      </div>
      {status && <div style={{ fontSize: 13, fontWeight: 600, color: adminStatusColor(status), marginTop: 8 }}>{status}</div>}
    </Card>
  );
}

/* ============================ COMPLETION CERTIFICATE (client) ============================
 * The visual certificate + the "Add to LinkedIn" / download / verify actions. The cert is minted
 * + emailed server-side on graduation (api/_lib/cert.js via /api/state); the client fetches it
 * with AUTH.getCert() and the public /verify/<id> page reads it from /api/cohorts?cert=<id>. */

// Standalone SVG of the certificate, for download (crisp + printable, no canvas needed).

// Founder console: preview the certificate design + see every issued certificate (founder-gated
// read via /api/funnel?resource=certs). Aggregate-only (name + cohort + date + id).
function CertificatesAdmin() {
  const [certs, setCerts] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/funnel?resource=certs");
        const d = r.ok ? await r.json() : {};
        if (live) setCerts(Array.isArray(d.certs) ? d.certs : []);
      } catch { if (live) setCerts([]); }
    })();
    return () => { live = false; };
  }, []);
  const sample = { name: "Sample Student", track: "Builders", completedAt: Date.now(), certId: "sample" };
  return (
    <>
      <Card style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Exactly how a student's certificate looks. It's issued automatically when they complete the 12 weeks, shown on their dashboard, and emailed to them.</div>
        <CertificateView cert={sample} compact />
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => downloadFile("build-young-certificate-sample.svg", buildCertSvg(sample), "image/svg+xml")} style={{ background: C.emerald, color: "#fff", padding: "9px 16px", borderRadius: 4, fontSize: 14, fontWeight: 600 }}>Download sample</button>
        </div>
      </Card>
      <Card style={{ padding: 16 }}>
        <b style={{ fontSize: 13.5 }}>Issued certificates{certs ? ` (${certs.length})` : ""}</b>
        {certs === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
        {certs && certs.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>None issued yet — they appear here as students complete the course.</div>}
        {certs && certs.map((c) => (
          <div key={c.certId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
            <span style={{ minWidth: 0 }}><b style={{ color: C.ink }}>{c.name || "—"}</b> <span style={{ color: C.muted }}>· {c.track} · {certDate(c.completedAt)}</span></span>
            <a href={certVerifyUrl(`https://${CONFIG.brandDomain}`, c.certId)} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, whiteSpace: "nowrap" }}>View ↗</a>
          </div>
        ))}
      </Card>
    </>
  );
}

// Founder console: read every student's "Your build" plan (idea + pain + press release) for
// coaching. Founder-gated read via /api/funnel?resource=builds.
function BuildPlansAdmin() {
  const [builds, setBuilds] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/funnel?resource=builds");
        const d = r.ok ? await r.json() : {};
        if (live) setBuilds(Array.isArray(d.builds) ? d.builds : []);
      } catch { if (live) setBuilds([]); }
    })();
    return () => { live = false; };
  }, []);

  const idea = (b) => (b.scenario === "custom" ? (b.custom || "Custom idea") : (scenarioLabel(b.scenario) || "—"));
  const block = { fontSize: 13, color: C.ink2, lineHeight: 1.5, whiteSpace: "pre-wrap", background: C.paper, border: `1px solid ${C.line}`, borderRadius: 4, padding: "8px 10px", marginTop: 4 };
  const lab = { fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em" };

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>What each student chose to build, the customer pain they named, and their press release — for coaching. Updates as students write on their dashboard.</div>
      {builds === null && <div style={{ fontSize: 13, color: C.muted }}>Loading…</div>}
      {builds && builds.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>No plans yet — they appear here as students fill in their plan.</div>}
      {builds && builds.map((b, i) => (
        <div key={b.email || i} style={{ borderTop: i ? `1px solid ${C.line}` : "none", padding: "14px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <b style={{ fontSize: 14, color: C.ink }}>{b.name || b.email || "Student"}</b>
            <span style={{ fontSize: 11.5, color: C.muted }}>{b.batchId || ""}{b.email ? ` · ${b.email}` : ""}</span>
          </div>
          <div style={{ marginTop: 6 }}><span style={lab}>Idea</span><div style={block}>{idea(b)}</div></div>
          {b.pain && b.pain.trim() && <div style={{ marginTop: 8 }}><span style={lab}>Customer pain</span><div style={block}>{b.pain}</div></div>}
          {b.pr && b.pr.trim() && <div style={{ marginTop: 8 }}><span style={lab}>Press release</span><div style={block}>{b.pr}</div></div>}
          {b.productSuccess && b.productSuccess.trim() && <div style={{ marginTop: 8 }}><span style={lab}>Product success</span><div style={block}>{b.productSuccess}</div></div>}
          {b.financialSuccess && b.financialSuccess.trim() && <div style={{ marginTop: 8 }}><span style={lab}>Financial success</span><div style={block}>{b.financialSuccess}</div></div>}
        </div>
      ))}
    </Card>
  );
}

// Founder view: families who registered interest for the next cohort (a full-cohort signal). They're
// emailed automatically when a new cohort is added; the list clears afterward. Founder-gated read.
const interestCsv = (rows) => ["name,email,batchId,season,track,date",
  ...rows.map((r) => ["name", "email", "batchId", "season", "track", "date"].map((c) =>
    `"${String(c === "date" ? (r.ts ? new Date(r.ts).toISOString() : "") : (r[c] ?? "")).replace(/"/g, '""')}"`).join(","))].join("\n");

function InterestAdmin() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=interest"); const d = r.ok ? await r.json() : {}; if (live) setList(Array.isArray(d.interest) ? d.interest : []); }
      catch { if (live) setList([]); }
    })();
    return () => { live = false; };
  }, []);
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12.5, color: C.muted, maxWidth: 640 }}>Families who asked to hear about the next cohort (because one was full) — your overflow demand. They're emailed automatically when you add a new cohort, then this list clears.</div>
        {list && list.length > 0 && <span {...act(() => downloadFile("build-young-interest.csv", interestCsv(list), "text/csv"))} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: C.emerald, whiteSpace: "nowrap" }}>Download CSV</span>}
      </div>
      {list === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
      {list && list.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No interest captured yet — this fills as cohorts sell out.</div>}
      {list && list.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
          <span style={{ minWidth: 0 }}><b style={{ color: C.ink }}>{r.name || "—"}</b> <span style={{ color: C.muted }}>· {r.email}</span></span>
          <span style={{ color: C.muted, whiteSpace: "nowrap" }}>{r.batchId || r.season || ""}{r.ts ? ` · ${new Date(r.ts).toLocaleDateString()}` : ""}</span>
        </div>
      ))}
    </Card>
  );
}

// Founder view of prospective live tutors (Careers → "Teach with us"). Read-only; they're also
// emailed to the founder's inbox as they come in.
// "Partner with us" inquiries (006-B) — orgs that want to carry Build Young. Mirror of TutorInterestAdmin.
function PartnerLeadsAdmin() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=partner-lead"); const d = r.ok ? await r.json() : {}; if (live) setList(Array.isArray(d.leads) ? d.leads : []); }
      catch { if (live) setList([]); }
    })();
    return () => { live = false; };
  }, []);
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, maxWidth: 640 }}>Organizations that asked to carry Build Young (“Partner with us”). They're also emailed to your inbox as they come in.</div>
      {list === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
      {list && list.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No partner inquiries yet.</div>}
      {list && list.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
          <span style={{ minWidth: 0, display: "flex", flexWrap: "wrap", gap: "2px 8px", alignItems: "baseline" }}>
            <b style={{ color: C.ink }}>{r.org}</b>
            <a href={`mailto:${r.email}`} style={{ color: C.emerald, fontWeight: 700 }}>{r.email}</a>
            {r.note && <span style={{ color: C.muted }}>· {r.note}</span>}
          </span>
          <span style={{ color: C.muted, whiteSpace: "nowrap" }}>{r.ts ? new Date(r.ts).toLocaleDateString() : ""}</span>
        </div>
      ))}
    </Card>
  );
}

function TutorInterestAdmin() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=tutor"); const d = r.ok ? await r.json() : {}; if (live) setList(Array.isArray(d.tutors) ? d.tutors : []); }
      catch { if (live) setList([]); }
    })();
    return () => { live = false; };
  }, []);
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, maxWidth: 640 }}>People who applied to teach live (Careers → “Teach with us”). They're also emailed to your inbox as they come in.</div>
      {list === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
      {list && list.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No tutor applications yet.</div>}
      {list && list.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
          <span style={{ minWidth: 0, display: "flex", flexWrap: "wrap", gap: "2px 8px", alignItems: "baseline" }}>
            <b style={{ color: C.ink }}>{r.email}</b>
            {r.linkedin && <a href={r.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><Linkedin size={12} /> LinkedIn ↗</a>}
          </span>
          <span style={{ color: C.muted, whiteSpace: "nowrap" }}>{r.ts ? new Date(r.ts).toLocaleDateString() : ""}</span>
        </div>
      ))}
    </Card>
  );
}

// Founder view of schedule/timezone requests from the landing ("Tell us your ideal schedule").
// Read-only demand signal; also emailed to your inbox, and these people are auto-notified when new
// cohorts open.
function QuestionsAdmin() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=questions"); const d = r.ok ? await r.json() : {}; if (live) setList(Array.isArray(d.questions) ? d.questions : []); }
      catch { if (live) setList([]); }
    })();
    return () => { live = false; };
  }, []);
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, maxWidth: 640 }}>Questions visitors submitted from the FAQ ("don't see your question?"). Emailed to you as they arrive — reply directly. A recurring one is a good candidate to add to the FAQ.</div>
      {list === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
      {list && list.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No questions yet.</div>}
      {list && list.map((r, i) => (
        <div key={i} style={{ padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <b style={{ color: C.ink }}>{r.email}</b>
            <span style={{ color: C.muted, whiteSpace: "nowrap" }}>{r.ts ? new Date(r.ts).toLocaleDateString() : ""}</span>
          </div>
          <div style={{ color: C.ink2, marginTop: 2 }}>{r.question}</div>
        </div>
      ))}
    </Card>
  );
}

function ScheduleRequestsAdmin() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=schedule"); const d = r.ok ? await r.json() : {}; if (live) setList(Array.isArray(d.schedule) ? d.schedule : []); }
      catch { if (live) setList([]); }
    })();
    return () => { live = false; };
  }, []);
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, maxWidth: 640 }}>Visitors asking for a different schedule/timezone — a signal for future cohorts. Emailed to your inbox as they arrive, and auto-notified when you open new cohorts.</div>
      {list === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
      {list && list.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No schedule requests yet.</div>}
      {list && list.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
          <span style={{ minWidth: 0 }}>
            <b style={{ color: C.ink }}>{r.email}</b>
            {(r.preference || r.timezone) && <span style={{ color: C.ink2 }}> — {[r.preference, r.timezone].filter(Boolean).join(" · ")}</span>}
          </span>
          <span style={{ color: C.muted, whiteSpace: "nowrap" }}>{r.ts ? new Date(r.ts).toLocaleDateString() : ""}</span>
        </div>
      ))}
    </Card>
  );
}

// Founder view of pending refunds. The app is keyless (Payment Links), so it can't refund via the
// Stripe API — each cancellation lands here AND is emailed to you to issue manually in Stripe.
function RefundsAdmin() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=refunds"); const d = r.ok ? await r.json() : {}; if (live) setList(Array.isArray(d.refunds) ? d.refunds : []); }
      catch { if (live) setList([]); }
    })();
    return () => { live = false; };
  }, []);
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, maxWidth: 640 }}>Students who cancelled. The app can't refund automatically (keyless Payment Links), so issue each one in the <b>Stripe dashboard</b> (Payments → find the payment → Refund). You're emailed each one as it comes in; once refunded in Stripe, the seat frees automatically.</div>
      {list === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
      {list && list.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No refunds to issue. 🎉</div>}
      {list && list.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
          <span style={{ minWidth: 0 }}>
            <b style={{ color: C.ink }}>{r.name || r.email}</b>
            <span style={{ color: C.ink2 }}> — {fmt((Number(r.refundCents) || 0) / 100)} ({r.tier}) · {r.batchId}{r.week ? ` · wk ${r.week}` : ""}</span>
            {r.reason && <span style={{ display: "block", color: C.muted }}>{r.reason}</span>}
          </span>
          <span style={{ color: C.muted, whiteSpace: "nowrap" }}>{r.ts ? new Date(r.ts).toLocaleDateString() : ""}</span>
        </div>
      ))}
    </Card>
  );
}

// Founder view of FAILED Stripe payments (T36). The keyless webhook records each decline + emails you;
// this lists them so a bounced family is visible in-app (not just the Stripe dashboard). Visibility
// only — nothing was charged, there's nothing to refund; follow up by re-sending the payment link.
function PaymentFailuresAdmin() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=payment-failures"); const d = r.ok ? await r.json() : {}; if (live) setList(Array.isArray(d.failures) ? d.failures : []); }
      catch { if (live) setList([]); }
    })();
    return () => { live = false; };
  }, []);
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, maxWidth: 640 }}>Enrollment payments that <b>failed</b> (declined/expired card), so the student did NOT enroll. Nothing was charged and there's nothing to refund — but you may want to reach out and re-send their payment link. Full details are in the <b>Stripe dashboard</b> (Payments → filter by Failed). You're emailed each one as it comes in.</div>
      {list === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
      {list && list.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No failed payments. 🎉</div>}
      {list && list.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
          <span style={{ minWidth: 0 }}>
            <b style={{ color: C.ink }}>{r.name || r.email || "(unknown)"}</b>
            <span style={{ color: C.ink2 }}> — {r.amountCents ? fmt((Number(r.amountCents) || 0) / 100) : "—"} · {r.batchId || "—"}</span>
            {r.email && r.name && <span style={{ display: "block", color: C.muted }}>{r.email}</span>}
            {r.reason && <span style={{ display: "block", color: C.muted }}>{r.reason}{r.code ? ` [${r.code}]` : ""}</span>}
          </span>
          <span style={{ color: C.muted, whiteSpace: "nowrap" }}>{r.ts ? new Date(r.ts).toLocaleDateString() : ""}</span>
        </div>
      ))}
    </Card>
  );
}

// Founder view of student showcase submissions (capstone "share your build" — link + feedback).
// Opt-in; `consent` flags whether the student confirmed parental OK to feature it publicly.
function ShowcaseAdmin() {
  const [list, setList] = useState(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try { const r = await fetch("/api/funnel?resource=showcase"); const d = r.ok ? await r.json() : {}; if (live) setList(Array.isArray(d.showcase) ? d.showcase : []); }
      catch { if (live) setList([]); }
    })();
    return () => { live = false; };
  }, []);
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, maxWidth: 660 }}>What graduating students shared at the capstone — their product link + feedback (potential testimonials). “Consent” = they confirmed a parent/guardian is OK to feature it. <b>Get explicit parental consent before any public use</b> (they're minors). Enable/disable collection under <b>Settings → Student showcase capture</b>.</div>
      {list === null && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>}
      {list && list.length === 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No submissions yet.</div>}
      {list && list.map((r, i) => (
        <div key={i} style={{ padding: "10px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
            <span style={{ display: "flex", flexWrap: "wrap", gap: "2px 8px", alignItems: "baseline", minWidth: 0 }}>
              <b style={{ color: C.ink, fontSize: 13.5 }}>{r.name || "—"}</b>
              {r.batchId && <span style={{ fontSize: 12, color: C.muted }}>· {r.batchId}</span>}
              {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, fontSize: 12.5 }}>Open build ↗</a>}
              {r.videoLink && <a href={r.videoLink} target="_blank" rel="noopener noreferrer" style={{ color: C.turq, fontWeight: 700, fontSize: 12.5 }}>▶ Video ↗</a>}
              {r.claimingPrize && <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "#fff", background: C.green, borderRadius: 999, padding: "2px 8px" }}>🏆 Prize claim — verify sale</span>}
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: r.consent ? C.green : C.gold, background: r.consent ? "#e7f3ee" : "#fbeede", borderRadius: 999, padding: "2px 8px" }}>{r.consent ? "Consent ✓" : "No consent"}</span>
            </span>
            <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{r.ts ? new Date(r.ts).toLocaleDateString() : ""}</span>
          </div>
          {r.feedback && <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, marginTop: 5, fontStyle: "italic" }}>“{r.feedback}”</div>}
        </div>
      ))}
    </Card>
  );
}
