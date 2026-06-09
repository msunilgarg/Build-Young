import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import {
  TrendingUp, LineChart as LineIcon, GraduationCap, ArrowRight, Check, Lock, Newspaper,
  CircleDollarSign, Sparkles, Video, Mail, Briefcase,
  Anchor, Linkedin, BookOpen, Download, Users, Activity, Award, Calendar, Clock, Flag, RefreshCw,
} from "lucide-react";
// The 12 weekly lesson titles + the per-week homework/prep text live in a dependency-free
// module (no React/lucide) so the serverless cron can share the same copy.
import { WEEK_PREP, WEEK_OBJECTIVES } from "./marketMedia.js";
import { C, FONTS, fmt, SUNIL_PHOTO } from "./theme.js";
import { Card, Mark, Pill, act, PageBackdrop, Stat } from "./ui.jsx";
// recharts is heavy (~344 KB) and only used in the dashboard — load it on demand
// so the landing/enroll/call pages don't pay for it.
const Charts = React.lazy(() => import("./Charts.jsx"));


// Lightweight email check — good enough to gate the UI (server-side validation is authoritative).

/* ============================ DATA ============================ */
// Cohorts (SEASONS + BATCHES + seasonLabel) live in ./cohorts.js — a dependency-free
// module shared with the cron scheduler — and are imported here + re-exported below.
import { SEASONS, BATCHES, seasonLabel, CHECKINS } from "./cohorts.js";
export { BATCHES, CHECKINS } from "./cohorts.js";
import { SITE_DEFAULTS, SETTINGS_FIELDS } from "./site.js";
import { certName, certVerifyUrl, linkedInAddUrl, certDate, CERT_ORG } from "./cert.js";
import { SCENARIO_GROUPS, scenarioLabel } from "./scenarios.js";
// Funnel analytics: stage definitions + conversion/curve/revenue math (single source of truth).
import { STAGES, summarize, segments, toCSV, toDataRoom, ratePct, TRACKS, engagement, journeys, monthsIn, eventsInMonth, weeklyTrend, TREND_METRICS } from "./funnel.js";
// Pure course-calendar + refund math now lives in ./courseDates.js (dependency-free; shared with
// the cron + tests). Imported for use here and re-exported so existing importers keep working.
import { CHECKIN_TIME, checkinDateLabel, nextClassLabel, classDateLabel, cohortStartInfo, dayNum, classMeetingOn, sessionDate, enrollClosed, cohortClosed, nextClass, PROGRAM_TZ, coursePosition, cohortTime, cohortDays, refundFor, REFUND_WEEKS, REFUND_WINDOW, canWithdrawNow } from "./courseDates.js";
export { CHECKIN_TIME, checkinDateLabel, nextClassLabel, classDateLabel, cohortStartInfo, classMeetingOn, sessionDate, enrollClosed, cohortClosed, nextClass, PROGRAM_TZ, coursePosition, cohortTime, cohortDays, refundFor, REFUND_WEEKS, REFUND_WINDOW, canWithdrawNow } from "./courseDates.js";
import { CONFIG, validEmail, cohortMetaFrom, CohortsContext, useCohorts, postJson, AUTH, sendEmail, setPendingEnroll, readPendingEnroll, clearPendingEnroll, track, trackVisitOnce, sessionId } from "./lib.js";
export { CONFIG, validEmail };
import { Login, SetPassword, CheckEmail } from "./auth.jsx";
export { Login, SetPassword };
import { WEEKS, ACTS } from "./course.js";
import { Landing } from "./Landing.jsx";
import { HOMEWORK, OBJECTIVES, setHomework, setObjectives } from "./courseState.js";
import { MAIL_FROM, welcomeEmail, followupEmail, CANCEL_REASONS, cancelReasonLabel, withdrawalEmail, newState, advance } from "./engine.js";
export { withdrawalEmail, newState, advance, CANCEL_REASONS, cancelReasonLabel };
import { downloadFile } from "./lib.js";
import { buildCertSvg, CertificateView, CertificateCard, CertifyVerify } from "./Certificate.jsx";
import { Platform } from "./Platform.jsx";
import { HESITATION_REASONS } from "./lib.js";
import { FounderDashboard } from "./FounderDashboard.jsx";
export { FounderDashboard };
import { WhyStrip, HesitationStrip } from "./WhyStrip.jsx";
import { LegalModal } from "./Legal.jsx";
import { callBooked } from "./lib.js";
import { Enroll } from "./Enroll.jsx";
import { BookCall } from "./BookCall.jsx";

// Whether a "Talk to Sunil" call was booked earlier this session — tags the call→enroll branch.

/* ============================ UI BITS ============================ */

// Conceptual "starting young compounds" graphic for the philosophy section

/* ============================ ENROLL ============================ */
// Source-cited "why this matters" stats — social proof for the enroll/call pages.
// Source-cited "why this matters" stats. Each links to its PRIMARY source — keep these
// honest and current; update the numbers AND links together if you refresh them.
// Why this matters — said by the people actually building the AI era. Each quote is verbatim and
// links to its PRIMARY source (per the stats-integrity bar). The thread: the barrier to building
// just collapsed, so the edge is starting young — which is exactly what Build Young teaches.

export default function App() {
  const [route, setRoute] = useState("home"); // home | enroll | call | app | login | setpw | checkemail | founder
  const [history, setHistory] = useState([]); // stack of routes we navigated from
  const [preselect, setPreselect] = useState(null);
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [legal, setLegal] = useState(null); // null | "privacy" | "terms"
  const [setpwToken, setSetpwToken] = useState(null);   // token from a ?setpw= link (auth mode)
  const [enrolledTrack, setEnrolledTrack] = useState(""); // cohort track for the check-email screen
  const [enrolledEmail, setEnrolledEmail] = useState(""); // recipient of the set-password email (shown on check-email)
  const [isFounder, setIsFounder] = useState(false); // signed-in user is an admin/founder (from /api/auth/me)
  const [me, setMe] = useState(null); // the signed-in user record (name/email/isFounder) from /api/auth/me
  const [verifyId, setVerifyId] = useState(""); // cert id for the public /verify/<id> page
  const [batches, setBatches] = useState(BATCHES); // live cohort catalog (hydrated from /api/cohorts)
  const [testimonials, setTestimonials] = useState([]); // public consented student showcase
  const [, bumpCfg] = useState(0); // bump to re-render after CONFIG hydration (settings are mutated in place)
  // Hydrate the live, founder-editable config once on mount — the cohort catalog AND the runtime
  // settings (booking link, contact email, LinkedIn) — so founder edits show without a redeploy.
  // Falls back to the code defaults on any failure (offline/demo/tests).
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/cohorts");
        if (!r.ok) return;
        const cat = await r.json();
        if (!live) return;
        if (cat && Array.isArray(cat.batches) && cat.batches.length) setBatches(cat.batches);
        if (cat && Array.isArray(cat.testimonials)) setTestimonials(cat.testimonials);
        if (cat && Array.isArray(cat.homework) && cat.homework.length === 12) setHomework(cat.homework);
        if (cat && Array.isArray(cat.objectives) && cat.objectives.length === 12) setObjectives(cat.objectives);
        if (cat && cat.settings && typeof cat.settings === "object") {
          Object.assign(CONFIG, cat.settings); // mutate the shared CONFIG, then re-render to pick it up
          bumpCfg((n) => n + 1);
        }
      } catch (e) { /* keep code defaults */ }
    })();
    return () => { live = false; };
  }, []);
  // Traffic & engagement: record dwell time per screen (anonymous, aggregate). On each route
  // change we log a `screen_view` for the screen just left; on tab-close/hide we flush the current
  // screen + an `exit`. No-op in tests (track() is). See engagement() in src/funnel.js.
  const screenRef = useRef(null);
  useEffect(() => {
    if (!loaded) return;
    const now = Date.now();
    if (screenRef.current) track("screen_view", { screen: screenRef.current.screen, ms: now - screenRef.current.at, sid: sessionId() });
    screenRef.current = { screen: route, at: now };
  }, [route, loaded]);
  useEffect(() => {
    if (!loaded) return;
    const flush = () => {
      if (!screenRef.current) return;
      const { screen, at } = screenRef.current;
      const sid = sessionId();
      track("screen_view", { screen, ms: Date.now() - at, sid });
      track("exit", { screen, sid });
      screenRef.current = { screen, at: Date.now() }; // reset so a return visit doesn't double-count
    };
    const onVis = () => { if (typeof document !== "undefined" && document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", onVis); };
  }, [loaded]);
  // Reflect the SPA route in the URL so Vercel Web Analytics records a pageview + time-on-page
  // per screen. Uses replaceState (NOT pushState) — no new browser-history entry, so the in-app
  // Back stack + scroll restoration are untouched. Gated on `loaded` so it never strips the
  // ?enrolled= / ?setpw= / ?founder= params before the load effect reads them.
  useEffect(() => {
    if (!loaded) return;
    if (route === "verify") return; // keep the /verify/<id> URL intact (id lives in the path)
    const PATHS = { home: "/", enroll: "/enroll", call: "/book-call", app: "/dashboard", login: "/login", setpw: "/set-password", checkemail: "/enrolled", founder: "/admin" };
    try { window.history.replaceState({}, "", PATHS[route] || "/"); } catch (e) { /* ignore */ }
    // Per-route <title> + meta description so each screen reads as its own page for crawlers, browser
    // tabs, and link shares (the SPA otherwise reuses index.html's landing title everywhere).
    const META = {
      home: { t: "Build Young — build a real product with AI, then grow it into a business", d: "Build Young is a live, hands-on program where teens build a real product with AI, grow it into a business, and go get their first customers. In an AI world, the edge isn't a degree — it's what you can build. Raising builders, not consumers." },
      enroll: { t: "Enroll — Build Young", d: "Reserve your seat in a Build Young cohort — 12 weeks, live and online, where teens build a real product with AI and learn to grow it." },
      call: { t: "Talk to us — Build Young", d: "Book a free 15-minute call to see whether Build Young is the right fit for your teen." },
    };
    const m = META[route];
    if (m) {
      try {
        document.title = m.t;
        const el = document.querySelector('meta[name="description"]');
        if (el) el.setAttribute("content", m.d);
      } catch (e) { /* ignore */ }
    }
  }, [route, loaded]);
  // remember scroll position per route so Back lands where you left off
  const pendingScroll = useRef(null); // px to restore after next render (null = scroll to top)
  const scrollTo = (y) => { try { window.scrollTo(0, y); } catch (e) {} };
  // single-flight lock: a route transition takes one frame; ignore re-fires within it
  // (prevents double-click races — history desync, double-enroll, duplicate emails).
  const navLock = useRef(false);
  const previewRef = useRef(false); // founder is previewing the student dashboard → don't persist
  const guard = (fn) => {
    if (navLock.current) return;
    navLock.current = true;
    try { fn(); } finally { requestAnimationFrame(() => { navLock.current = false; }); }
  };
  // navigate forward, remembering where we came from + our scroll position
  const nav = (to) => guard(() => {
    const y = typeof window !== "undefined" ? window.scrollY || window.pageYOffset || 0 : 0;
    setHistory((h) => [...h, { route, scroll: y }]);
    pendingScroll.current = 0; // new page starts at the top
    setRoute(to);
  });
  const goBack = () => guard(() => {
    const prev = history.length ? history[history.length - 1] : { route: "home", scroll: 0 };
    pendingScroll.current = prev.scroll || 0; // restore where we were
    setRoute(prev.route);
    setHistory((h) => h.slice(0, -1));
  });
  const goHome = () => guard(() => { if (previewRef.current) { previewRef.current = false; setState(null); } pendingScroll.current = 0; setHistory([]); setRoute("home"); });
  const goFounder = () => guard(() => { pendingScroll.current = 0; setHistory([]); setRoute("founder"); });
  // Logged-in "home" target: a founder w/o a student sim → admin console; otherwise the app dashboard.
  const goDashboard = () => guard(() => { pendingScroll.current = 0; setHistory([]); setRoute(isFounder && !state ? "founder" : "app"); });
  // Founder-only: walk the STUDENT dashboard with a throwaway demo state. `previewRef` skips the
  // persist effect so it never writes a demo over the founder's account. previewAllWeeks unlocks
  // every week so all content (Weeks 1–12) is reviewable.
  const previewStudent = () => guard(() => {
    const b = batches[0] || BATCHES[0];
    previewRef.current = true;
    pendingScroll.current = 0; setHistory([]);
    setState(newState({ name: (me && me.name) || "Sample Student", email: (me && me.email) || "preview@build-young.com", batch: b.id, track: b.track }));
    setRoute("app");
  });
  // apply the pending scroll after the route's content has rendered
  useLayoutEffect(() => {
    if (pendingScroll.current == null) return;
    const y = pendingScroll.current;
    pendingScroll.current = null;
    // one rAF lets the (taller) page lay out before we restore position
    requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(y)));
  }, [route]);

  // Sign-in succeeded (login or set-password): pull the student's server state (or seed a fresh
  // one from their account) and open the dashboard.
  const hydrateFromServer = async (user) => {
    setIsFounder(!!(user && user.isFounder)); setMe(user || null); // admin elevation comes from the server (FOUNDER_EMAILS)
    let srv = await AUTH.getState();
    // A founder who isn't enrolled (no cohort + no saved sim) lands on the ADMIN dashboard —
    // not a fabricated student cohort. (Founders who also enrolled keep the student view + Admin link.)
    if (!srv && user && user.isFounder && !user.batchId) {
      pendingScroll.current = 0; setHistory([]); setRoute("founder"); return;
    }
    if (!srv) {
      const b = batches.find((x) => x.id === user.batchId) || batches[0];
      srv = newState({ name: user.name || "", email: user.email, batch: b.id, track: b.track });
      AUTH.putState(srv);
    }
    pendingScroll.current = 0; setHistory([]); setState(srv); setRoute("app");
  };

  // load persisted state — and handle Stripe payment return (?enrolled=) + set-password (?setpw=)
  const didLoad = useRef(false);
  useEffect(() => {
    if (didLoad.current) return; // run once even under StrictMode double-invoke
    didLoad.current = true;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const paidBatch = params.get("enrolled");
        const setpw = params.get("setpw");

        // ---- PUBLIC CERTIFICATE VERIFICATION: /verify/<id> (no auth, opened from LinkedIn) ----
        const vm = window.location.pathname.match(/^\/verify\/(.+)$/);
        if (vm) { setVerifyId(decodeURIComponent(vm[1])); setRoute("verify"); setLoaded(true); return; }

        // ---- FOUNDER/ADMIN DASHBOARD: hidden route, gated by the session cookie (FOUNDER_EMAILS) ----
        if (params.has("founder")) { setRoute("founder"); setLoaded(true); return; }

        trackVisitOnce(); // top of funnel — once per browser session

        // ---- AUTH MODE: dashboard requires login; state lives server-side ----
        if (CONFIG.authEnabled) {
          if (setpw) {
            window.history.replaceState({}, "", window.location.pathname);
            setSetpwToken(setpw); setRoute("setpw"); setLoaded(true); return;
          }
          if (paidBatch) {
            // The Stripe webhook provisioned the account + emailed the set-password link.
            // Recover what they entered at enroll (prefilled into Stripe): their email AND their real
            // cohort. A SHARED Payment Link has one static ?enrolled= for everyone, so prefer the
            // student's actual cohort from the pending-enroll record; fall back to the URL param.
            const p = readPendingEnroll(); // localStorage, then the cross-subdomain cookie
            const realBatch = (p && p.batch) || paidBatch;
            const pendingEmail = p ? (p.email || "") : "";
            track("enrolled", { ...cohortMetaFrom(batches, realBatch), fromCall: callBooked }); // funnel: payment completed
            const b = batches.find((x) => x.id === realBatch);
            clearPendingEnroll();
            window.history.replaceState({}, "", window.location.pathname);
            setEnrolledTrack(b ? b.track : ""); setEnrolledEmail(pendingEmail); setRoute("checkemail"); setLoaded(true); return;
          }
          const user = await AUTH.me();
          if (user) {
            setIsFounder(!!user.isFounder); setMe(user);
            // Respect the URL on load (refresh/bookmark): the app/admin paths restore that view;
            // marketing paths (/, /enroll, …) stay put — a logged-in user is NOT bounced off the
            // home page (the nav shows "Admin →" / "My dashboard →" to get back in).
            const path = window.location.pathname;
            if (path === "/admin") { pendingScroll.current = 0; setRoute("founder"); }
            else if (path === "/dashboard") { await hydrateFromServer(user); }
          }
          setLoaded(true); return;
        }

        // ---- DEMO MODE: self-contained localStorage flow (no login) ----
        if (paidBatch) {
          const pending = readPendingEnroll();
          // Prefer the student's real cohort captured at enroll (a shared link's static ?enrolled=
          // can't vary per cohort); fall back to the URL param.
          const realBatch = (pending && pending.batch) || paidBatch;
          const b = batches.find((x) => x.id === realBatch);
          if (b) {
            const student = pending && pending.batch === realBatch
              ? pending
              : { name: "", email: (pending && pending.email) || "", batch: realBatch, track: b.track };
            clearPendingEnroll();
            window.history.replaceState({}, "", window.location.pathname);
            track("enrolled", { ...cohortMetaFrom(batches, realBatch), fromCall: callBooked }); // funnel: payment completed
            // mirror the demo flow: send the welcome email on a real (Stripe) enrollment too
            const w = welcomeEmail(student);
            sendEmail(student.email, w.subject, w.body);
            setState(newState(student)); setRoute("app"); setLoaded(true);
            return;
          }
        }
        if (typeof window !== "undefined" && window.storage) {
          const r = await window.storage.get("by:state");
          if (r && r.value) { setState(JSON.parse(r.value)); setRoute("app"); }
        }
      } catch (e) { /* no saved state */ }
      setLoaded(true);
    })();
  }, []);

  // persist state — server-side (debounced) in auth mode, else local window.storage.
  // Skipped entirely while a founder previews the student dashboard (throwaway demo state).
  useEffect(() => {
    if (!loaded || !state || previewRef.current) return;
    if (CONFIG.authEnabled) {
      const id = setTimeout(() => AUTH.putState(state), 600);
      return () => clearTimeout(id);
    }
    try { if (window.storage) window.storage.set("by:state", JSON.stringify(state)); } catch (e) { }
  }, [state, loaded]);

  const startEnroll = (batchId) => {
    const id = typeof batchId === "string" ? batchId : null;
    track("enroll_started", { ...(id ? cohortMetaFrom(batches, id) : {}), fromCall: callBooked });
    setPreselect(id); nav("enroll");
  };
  const startCall = () => nav("call");
  const finishEnroll = (student) => guard(() => {
    // Funnel: payment completed (demo path — the Stripe path fires `enrolled` on the ?enrolled= return).
    track("enrolled", { ...cohortMetaFrom(batches, student.batch), fromCall: callBooked });
    if (CONFIG.authEnabled) {
      // Account creation happens server-side (Stripe webhook → set-password email); send the
      // student to the check-email screen rather than straight into the dashboard.
      pendingScroll.current = 0; setHistory([]); setEnrolledTrack(student.track || ""); setEnrolledEmail(student.email || ""); setRoute("checkemail");
      return;
    }
    const w = welcomeEmail(student);
    sendEmail(student.email, w.subject, w.body);
    pendingScroll.current = 0; setHistory([]); setState(newState(student)); setRoute("app");
  });
  const exitApp = () => guard(() => {
    // Founder previewing the student dashboard → drop the throwaway state, back to the console.
    if (previewRef.current) { previewRef.current = false; pendingScroll.current = 0; setHistory([]); setState(null); setRoute("founder"); return; }
    if (CONFIG.authEnabled) { AUTH.logout(); }
    else { try { if (window.storage) window.storage.delete("by:state"); } catch (e) { } }
    pendingScroll.current = 0; setHistory([]); setState(null); setRoute("home");
  });

  // auth handlers passed to the Login / SetPassword screens
  const doLogin = async (email, password) => {
    const res = await AUTH.login(email, password);
    if (res.ok && res.user) await hydrateFromServer(res.user);
    return res;
  };
  const doSetPassword = async (token, password) => {
    const res = await AUTH.setPassword(token, password);
    if (res.ok && res.user) await hydrateFromServer(res.user);
    return res;
  };
  const goLogin = () => guard(() => { pendingScroll.current = 0; setHistory([]); setRoute("login"); });

  return (
    <CohortsContext.Provider value={batches}>
    <div className="flp" style={{ minHeight: "100vh", background: C.paper }}>
      <style>{FONTS}</style>
      {route === "home" && <Landing onEnroll={startEnroll} onCall={startCall} onLegal={setLegal} onLogin={CONFIG.authEnabled ? goLogin : null} onDashboard={(isFounder || state) ? goDashboard : null} dashLabel={isFounder ? "Admin" : "My dashboard"} testimonials={testimonials} />}
      {route === "enroll" && <Enroll preselect={preselect} onDone={finishEnroll} onBack={goBack} onCall={startCall} onHome={goHome} />}
      {route === "call" && <BookCall onBack={goBack} onHome={goHome} onEnroll={() => startEnroll()} />}
      {route === "app" && state && <Platform state={state} setState={setState} onExit={exitApp} onFounder={isFounder ? goFounder : null} onHome={goHome} />}
      {route === "login" && <Login onLogin={doLogin} onReset={AUTH.requestReset} onHome={goHome} onEnroll={() => startEnroll()} />}
      {route === "setpw" && <SetPassword token={setpwToken} onSetPassword={doSetPassword} onHome={goHome} />}
      {route === "checkemail" && <CheckEmail track={enrolledTrack} email={enrolledEmail} onHome={goHome} />}
      {route === "founder" && <FounderDashboard onHome={goHome} onPreviewStudent={previewStudent} />}
      {route === "verify" && <CertifyVerify certId={verifyId} onHome={goHome} />}
      {legal && <LegalModal kind={legal} onClose={() => setLegal(null)} />}
    </div>
    </CohortsContext.Provider>
  );
}
