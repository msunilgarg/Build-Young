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

// Whether a "Talk to Sunil" call was booked earlier this session — tags the call→enroll branch.
let _callBookedThisSession = false;

/* ============================ UI BITS ============================ */

// Conceptual "starting young compounds" graphic for the philosophy section

/* ============================ ENROLL ============================ */
// Source-cited "why this matters" stats — social proof for the enroll/call pages.
// Source-cited "why this matters" stats. Each links to its PRIMARY source — keep these
// honest and current; update the numbers AND links together if you refresh them.
// Why this matters — said by the people actually building the AI era. Each quote is verbatim and
// links to its PRIMARY source (per the stats-integrity bar). The thread: the barrier to building
// just collapsed, so the edge is starting young — which is exactly what Build Young teaches.
const WHY_STATS = [
  { quote: "The hottest new programming language is English.", who: "Andrej Karpathy", role: "OpenAI co-founding member", src: "@karpathy, 2023", url: "https://x.com/karpathy/status/1617979122625712128" },
  { quote: "A one-person billion-dollar company would have been unimaginable without AI — and now it will happen.", who: "Sam Altman", role: "OpenAI CEO", src: "Fortune, 2024", url: "https://fortune.com/2024/02/04/sam-altman-one-person-unicorn-silicon-valley-founder-myth/" },
  { quote: "Everyone is a programmer — now, you just have to say something to the computer.", who: "Jensen Huang", role: "NVIDIA CEO", src: "Computex, 2023", url: "https://www.cnbc.com/2023/05/30/everyone-is-a-programmer-with-generative-ai-nvidia-ceo-.html" },
];
function WhyStrip() {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 14 }}>Why this matters — from the people building it</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        {WHY_STATS.map((s, i) => {
          const c = [C.emerald, C.turq, C.gold, C.green][i % 4];
          return (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: "16px 18px", borderTop: `3px solid ${c}`, display: "flex", flexDirection: "column" }}>
              <div aria-hidden="true" className="disp" style={{ fontSize: 34, fontWeight: 800, color: c, lineHeight: .6, height: 18 }}>“</div>
              <div className="disp" style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginTop: 6, lineHeight: 1.35 }}>{s.quote}</div>
              <div style={{ fontSize: 12.5, color: C.ink2, marginTop: 10, fontWeight: 700 }}>{s.who}</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{s.role}</div>
              <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", fontSize: 10.5, color: C.muted, marginTop: 8, textDecoration: "underline", textDecorationColor: C.line }}>{s.src} ↗</a>
            </div>
          );
        })}
      </div>
      <p style={{ textAlign: "center", fontSize: 11.5, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>The edge isn't a credential anymore — it's what you can build, and the time to start is now.</p>
    </div>
  );
}

// Drop-off capture on the Enroll page: a one-tap "what's holding you back?" chip row. The picked
// `reason` is an aggregate-safe value (in the funnel ALLOWED_PROPS) — no PII — so the founder can
// see WHY people stall at the decision point. Fires once per session, then thanks the visitor.
function HesitationStrip() {
  const [picked, setPicked] = useState("");
  const choose = (value) => {
    if (picked) return; // fire once
    setPicked(value);
    track("hesitation", { reason: value });
  };
  return (
    <div style={{ marginTop: 24, textAlign: "center" }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>{picked ? "Thanks — that helps. Take your time; I'm here when you're ready." : "Still deciding? What's holding you back?"}</div>
      {!picked && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {HESITATION_REASONS.map((r) => (
            <span key={r.value} {...act(() => choose(r.value))}
              style={{ fontSize: 12.5, color: C.ink2, background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}>
              {r.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Enroll({ preselect, onDone, onBack, onCall, onHome }) {
  const BATCHES = useCohorts(); // live catalog
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age15, setAge15] = useState(false); // eligibility gate — a parent confirms the student is in high school
  const [batch, setBatch] = useState(preselect || BATCHES[0].id);
  const [notified, setNotified] = useState(false); // captured interest for a full cohort
  const b = BATCHES.find((x) => x.id === batch) || BATCHES[0];
  const closed = cohortClosed(b); // sold out, or past the enrollment cutoff (day before start)
  const canContinue = name.trim() && validEmail(email) && age15 && !closed;
  const canNotify = name.trim() && validEmail(email);
  // A full cohort doesn't take a waitlist (no mid-course additions) — we capture interest for the
  // NEXT cohort instead, so the founder sees real overflow demand.
  const submitInterest = async () => {
    try { await fetch("/api/funnel?resource=interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, batchId: b.id, season: b.season, track: b.track }) }); } catch (e) {}
    setNotified(true);
  };
  const acc = b.id.includes("mw") ? C.emerald : C.green;
  const inputS = { width: "100%", padding: "12px 14px", borderRadius: 4, border: `1.5px solid ${C.line}`, background: C.paper2, fontSize: 15, marginTop: 6 };
  const label = { fontSize: 13, fontWeight: 700, color: C.ink2 };
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <PageBackdrop tint="#e7f3ee" />
      <div style={{ position: "relative", zIndex: 2, maxWidth: step === 1 ? 880 : 540, margin: "0 auto", padding: "26px 5vw 60px", transition: "max-width .2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="disp" {...act(() => onHome && onHome())} aria-label="Build Young — home" style={{ fontWeight: 900, fontSize: 18, cursor: "pointer" }}><Mark size={20} /> Build Young</div>
        <button className="btn" onClick={() => (step > 1 ? setStep(step - 1) : onBack())} style={{ background: "transparent", color: C.muted, fontSize: 14 }}>← Back</button>
      </div>
      <Card style={{ padding: 28 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[1, 2, 3].map((n) => <div key={n} style={{ height: 5, flex: 1, borderRadius: 4, background: step >= n ? C.emerald : C.line }} />)}
        </div>

        {step === 1 && (
          <div className="rise">
            <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Reserve your seat</h2>
            <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Choose a batch and tell us who's joining. Takes about a minute.</p>
            {onCall && (
              <div {...act(onCall)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#eaf3fb", border: `1px solid ${C.emeraldLite}`, borderRadius: 4, padding: "10px 12px", marginTop: 14, cursor: "pointer" }}>
                <Video size={15} color={C.emerald} /><span style={{ fontSize: 12.5, color: C.ink2 }}>Want to talk first? <b style={{ color: C.emerald }}>Book a free 15-minute call with us →</b></span>
              </div>
            )}
            <div className="enroll-grid" style={{ marginTop: 18 }}>
              {/* form column */}
              <div>
                <div><div style={label}>Batch</div>
                  <select aria-label="Batch" value={batch} onChange={(e) => { setBatch(e.target.value); setNotified(false); }} style={inputS}>
                    {SEASONS.filter((s) => BATCHES.some((x) => x.season === s.key)).map((s) => (
                      <optgroup key={s.key} label={s.label}>
                        {BATCHES.filter((x) => x.season === s.key).map((x) => (
                          <option key={x.id} value={x.id}>{x.day.split(" · ")[0]} (starts {x.start}){cohortClosed(x) ? " — ENROLLMENT FULL" : ""}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div style={{ marginTop: 14 }}><div style={label}>Student name</div><input aria-label="Student name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Rivera" style={inputS} /></div>
                <div style={{ marginTop: 14 }}><div style={label}>Email <span style={{ color: C.muted, fontWeight: 500 }}>— this is your username</span></div><input aria-label="Email (your username)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={inputS} /></div>
                {closed ? (
                  notified ? (
                    <div style={{ marginTop: 16, padding: 14, background: "#e7f3ee", border: `1px solid ${C.green}`, borderRadius: 4, fontSize: 13.5, color: C.ink2, lineHeight: 1.5 }}>
                      <b style={{ color: C.green }}>You're on the list ✓</b> We'll email you the moment a new {b.track} cohort opens. Thanks for your interest!
                    </div>
                  ) : (<>
                    <div style={{ marginTop: 16, padding: 12, background: "#fbeede", border: `1px solid ${C.goldLite}`, borderRadius: 4, fontSize: 13, color: C.ink2, lineHeight: 1.5 }}>
                      {b.full
                        ? <>Enrollment for this cohort is <b>full</b>.</>
                        : <>Enrollment for this cohort has <b>closed</b> — it starts {b.start}.</>}{" "}
                      Leave your name + email and we'll tell you the moment the next cohort opens. <span style={{ color: C.muted }}>(No waitlist — students don't join mid-course.)</span>
                    </div>
                    <button className="btn" disabled={!canNotify} onClick={submitInterest} style={{ width: "100%", marginTop: 14, background: canNotify ? C.emerald : C.line, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, cursor: canNotify ? "pointer" : "not-allowed" }}>Notify me about the next cohort →</button>
                  </>)
                ) : (<>
                  <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 14, fontSize: 13, color: C.ink2, cursor: "pointer", lineHeight: 1.45 }}>
                    <input type="checkbox" checked={age15} onChange={(e) => setAge15(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: C.emerald, flexShrink: 0 }} />
                    <span>I'm the parent/guardian enrolling, and I confirm the student is <b>in high school</b>. <span style={{ color: C.muted }}>Build Young is for high schoolers.</span></span>
                  </label>
                  <div style={{ marginTop: 12, fontSize: 12, color: C.muted, lineHeight: 1.5, background: C.paper, borderRadius: 6, padding: "9px 12px" }}>
                    <b style={{ color: C.ink2 }}>A note on costs:</b> beyond tuition, your child will need <b>Claude Pro</b> (about <b>$20/month</b>) — the AI that builds the app alongside them — for the build weeks; a free account won't keep up. Everything else we use (GitHub, Vercel, Resend for email) is <b>free</b>. Later, a custom web address (domain) is <b>optional</b> and runs about <b>$10–20/year</b> if you want one.
                  </div>
                  <button className="btn" disabled={!canContinue} onClick={() => setStep(2)} style={{ width: "100%", marginTop: 18, background: canContinue ? C.emerald : C.line, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, cursor: canContinue ? "pointer" : "not-allowed" }}>Continue to payment →</button>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 12, color: C.muted, fontSize: 12.5 }}>
                    <Lock size={13} /> Secure checkout · no charge until the next step
                  </div>
                </>)}
              </div>
              {/* summary column */}
              <aside style={{ background: C.paper2, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ height: 4, background: acc }} />
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".05em" }}>YOUR ENROLLMENT</div>
                  <div className="disp" style={{ fontWeight: 800, fontSize: 17, marginTop: 4 }}>{seasonLabel(b.season)} · {b.track}</div>
                  <div style={{ fontSize: 13, color: C.ink2, marginTop: 2 }}>Starts {b.start}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: acc, fontSize: 12.5, fontWeight: 600, marginTop: 6 }}><Video size={13} /> {b.day} · live on Zoom</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12 }}>
                    <span style={{ fontSize: 13, color: C.muted }}>Tuition</span>
                    <span className="disp" style={{ fontSize: 26, fontWeight: 800 }}>${b.price}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
                    <b style={{ color: C.ink2 }}>Full refund</b> if you cancel before {b.start}. After classes begin, a <b style={{ color: C.ink2 }}>prorated refund</b> is available through the first week; non-refundable after.
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 8, fontWeight: 700, letterSpacing: ".04em" }}>WHAT YOU GET FROM ME</div>
                  <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
                    {[
                      "12 weeks of live classes — 2 sessions a week (~3 hrs), taught by me",
                      "Your own student dashboard",
                      "Build a real product, grow it, and get your first customers",
                      "A certificate of completion you can add to LinkedIn",
                      "A shot at the builder prize — land a real paying customer in a year, get your tuition back",
                    ].map((t, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: C.ink2 }}>
                        <Check size={14} color={acc} style={{ flexShrink: 0, marginTop: 1 }} /> {t}
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12, display: "grid", gap: 7 }}>
                    {[
                      { icon: Video, t: "100% live online over Zoom" },
                      { icon: Lock, t: "A safe place to build for real" },
                      { icon: GraduationCap, t: "Capped at 10 students" },
                    ].map((x, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.muted, fontWeight: 600 }}>
                        <x.icon size={13} color={C.muted} /> {x.t}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
            <WhyStrip />
            <HesitationStrip />
          </div>
        )}

        {step === 2 && (() => {
          const stripeLink = (b && b.stripeLink) || CONFIG.stripeLink; // cohort link, else the shared one
          if (stripeLink) {
            return (
              <div className="rise">
                <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Checkout</h2>
                <div style={{ background: C.paper, borderRadius: 4, padding: 14, marginTop: 14, display: "flex", justifyContent: "space-between" }}>
                  <div><div style={{ fontWeight: 700 }}>{b.track} cohort</div><div style={{ fontSize: 13, color: C.muted }}>Starts {b.start}</div></div>
                  <div className="disp" style={{ fontSize: 24, fontWeight: 800 }}>${b.price}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#eef3f0", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 12px", marginTop: 14 }}>
                  <Lock size={15} color={C.emerald} /><span style={{ fontSize: 12.5, color: C.ink2 }}>Secure payment processed by <b>Stripe</b>. You'll be returned here once payment completes.</span>
                </div>
                <button className="btn" onClick={() => {
                  setPendingEnroll({ name, email, batch, track: b.track });
                  // client_reference_id carries the cohort id through Stripe so the webhook maps the
                  // payment back to the right cohort (this is what lets ONE shared link serve all cohorts).
                  // We pack the cohort + STUDENT name as "byq_<base64url JSON>" so the set-password email
                  // greets the student, not the card-holder. Stripe only allows [A-Za-z0-9_-] in a Payment
                  // Link's client_reference_id, so base64url + the "byq_" marker keep it valid (a "." would
                  // make Stripe drop the whole value). The ?enrolled= return URL is still a fallback.
                  let ref = batch;
                  try {
                    const payload = JSON.stringify({ b: batch, n: (name || "").trim() });
                    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(payload))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
                    ref = `byq_${b64}`;
                  } catch { ref = batch; }
                  const sep = stripeLink.includes("?") ? "&" : "?";
                  window.location.href = `${stripeLink}${sep}prefilled_email=${encodeURIComponent(email)}&client_reference_id=${encodeURIComponent(ref)}`;
                }} style={{ width: "100%", marginTop: 22, background: C.emerald, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16 }}>Pay ${b.price} securely →</button>
              </div>
            );
          }
          return (
          <div className="rise">
            <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Checkout</h2>
            <div style={{ background: C.paper, borderRadius: 4, padding: 14, marginTop: 14, display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontWeight: 700 }}>{b.track} cohort</div><div style={{ fontSize: 13, color: C.muted }}>Starts {b.start}</div></div>
              <div className="disp" style={{ fontSize: 24, fontWeight: 800 }}>${b.price}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#fbeede", border: `1px solid ${C.goldLite}`, borderRadius: 4, padding: "10px 12px", marginTop: 14 }}>
              <Lock size={15} color={C.gold} /><span style={{ fontSize: 12.5, color: C.ink2 }}><b>Demo checkout.</b> No real card is charged or stored. Connect a Stripe Payment Link in config to take real payments here.</span>
            </div>
            <div style={{ marginTop: 14 }}><div style={label}>Card number</div><input aria-label="Card number" placeholder="4242 4242 4242 4242" style={inputS} /></div>
            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              <div style={{ flex: 1 }}><div style={label}>Expiry</div><input aria-label="Card expiry" placeholder="12/28" style={inputS} /></div>
              <div style={{ flex: 1 }}><div style={label}>CVC</div><input aria-label="Card CVC" placeholder="123" style={inputS} /></div>
            </div>
            <button className="btn" onClick={() => setStep(3)} style={{ width: "100%", marginTop: 22, background: C.ink, color: C.paper2, padding: 14, borderRadius: 4, fontSize: 16 }}>Pay ${b.price} (demo) →</button>
          </div>
          );
        })()}

        {step === 3 && (
          <div className="rise" style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 4, background: C.emerald, display: "grid", placeItems: "center", margin: "8px auto 16px" }}><Check size={32} color="#fff" /></div>
            <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>You're enrolled, {name.split(" ")[0]}!</h2>
            <p style={{ color: C.muted, fontSize: 14, marginTop: 6 }}>Your seat in the {b.track} cohort ({b.day}) is reserved. Your class <b>Zoom link</b> is waiting in your dashboard — the same link works for every class.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", background: "#eef3f0", border: `1px solid ${C.line}`, borderRadius: 4, padding: "9px 12px", marginTop: 12 }}>
              <Mail size={15} color={C.emerald} /><span style={{ fontSize: 12.5, color: C.ink2 }}>A welcome email has been sent to <b>{email}</b>.</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, textAlign: "left", background: "#eef3f0", border: `1px solid ${C.green}`, borderRadius: 6, padding: "10px 13px", marginTop: 10 }}>
              <Award size={16} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} /><span style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5 }}><b style={{ color: C.green }}>One to aim for — the builder prize.</b> The first builder in your cohort to land a real paying customer within a year gets their <b>tuition refunded</b> (real sale + a short video). <span style={{ color: C.muted }}>See Terms.</span></span>
            </div>
            <button className="btn" onClick={() => onDone({ name, email, batch, track: b.track })} style={{ width: "100%", marginTop: 22, background: C.emerald, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16 }}>Open my dashboard →</button>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}

/* ============================ BOOK A CALL ============================ */
const CALL_SLOTS = ["Mon · 5:00 PM PT", "Tue · 5:00 PM PT", "Wed · 5:00 PM PT", "Thu · 5:00 PM PT", "Fri · 5:00 PM PT", "Sat · 5:00 PM PT"];

function BookCall({ onBack, onHome, onEnroll }) {
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [slot, setSlot] = useState(null);
  const inputS = { width: "100%", padding: "12px 14px", borderRadius: 4, border: `1.5px solid ${C.line}`, background: C.paper2, fontSize: 15, marginTop: 6 };
  const label = { fontSize: 13, fontWeight: 700, color: C.ink2 };
  const A = C.turq;
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <PageBackdrop tint="#e3f1f1" />
      <div style={{ position: "relative", zIndex: 2, maxWidth: done ? 540 : 860, margin: "0 auto", padding: "26px 5vw 60px", transition: "max-width .2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="disp" {...act(() => onHome && onHome())} aria-label="Build Young — home" style={{ fontWeight: 900, fontSize: 18, cursor: "pointer" }}><Mark size={20} /> Build Young</div>
        <button className="btn" onClick={onBack} style={{ background: "transparent", color: C.muted, fontSize: 14 }}>← Back</button>
      </div>
      <Card style={{ padding: 28 }}>
        {!done ? (
          <div className="rise">
            <Pill bg={A}>Free · 15 minutes · over Zoom</Pill>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
              <img src={SUNIL_PHOTO} alt="Sunil Garg" style={{ width: 56, height: 56, borderRadius: 6, objectFit: "cover" }} />
              <div><div style={{ fontWeight: 700, fontSize: 15 }}>Sunil Garg</div><div style={{ fontSize: 12.5, color: C.muted }}>Founder, Build Young · ex-Microsoft (20 years)</div></div>
            </div>
            <h2 className="disp" style={{ fontSize: 27, fontWeight: 800, margin: "14px 0 0" }}>Talk to us first</h2>
            <p style={{ color: C.ink2, fontSize: 14.5, lineHeight: 1.55, marginTop: 8, maxWidth: 560 }}>
              Before you sign up for anything, let's talk. We do a free 15-minute call with every family — bring your questions, meet Sunil, and decide whether Build Young is right for your kid. No pitch, no pressure.
            </p>
            <div className="enroll-grid" style={{ marginTop: 20 }}>
              {/* scheduler column */}
              <div>
                {CONFIG.calendlyUrl ? (
                  <a className="btn" href={CONFIG.calendlyUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", textDecoration: "none", background: A, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, fontWeight: 600 }}>Pick a time on our calendar →</a>
                ) : (
                  <>
                    <div style={label}>Pick a time <span style={{ color: C.muted, fontWeight: 500 }}>(Pacific)</span></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      {CALL_SLOTS.map((sl) => (
                        <button key={sl} className="btn" onClick={() => setSlot(sl)} style={{ padding: "11px 10px", borderRadius: 4, fontSize: 14, fontWeight: 600, textAlign: "center", background: slot === sl ? A : C.paper2, color: slot === sl ? "#fff" : C.ink, border: `1.5px solid ${slot === sl ? A : C.line}` }}>{sl}</button>
                      ))}
                    </div>
                    <div style={{ marginTop: 16 }}><div style={label}>Your name</div><input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Rivera" style={inputS} /></div>
                    <div style={{ marginTop: 14 }}><div style={label}>Email</div><input aria-label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={inputS} /></div>
                    <button className="btn" disabled={!(slot && name.trim() && validEmail(email))} onClick={() => { _callBookedThisSession = true; track("call_booked", {}); setDone(true); }} style={{ width: "100%", marginTop: 20, background: (slot && name.trim() && validEmail(email)) ? A : C.line, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, cursor: (slot && name.trim() && validEmail(email)) ? "pointer" : "not-allowed" }}>Book my call →</button>
                    <p style={{ color: C.muted, fontSize: 12, textAlign: "center", marginTop: 10 }}>Already sure? You can <span {...act(onEnroll)} style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}>enroll directly</span> instead.</p>
                  </>
                )}
              </div>
              {/* what-to-expect aside */}
              <aside style={{ background: C.paper2, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden", alignSelf: "start" }}>
                <div style={{ height: 4, background: A }} />
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".05em" }}>WHAT YOU'LL GET</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 9 }}>
                    {[
                      "Ask us about the program, the format, or your kid",
                      "We'll figure out together if it's the right fit",
                      "You'll meet Sunil face to face on Zoom",
                      "No pitch, no pressure — you have our word",
                    ].map((t, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: C.ink2 }}>
                        <Check size={14} color={A} style={{ flexShrink: 0, marginTop: 1 }} /> {t}
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
                    I'm <b style={{ color: C.ink2 }}>Sunil</b> — I spent 20 years in product at Microsoft, I'm a dad of two daughters, and I built this for my own kids first.
                    <a href={CONFIG.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, color: A, fontWeight: 700, textDecoration: "none" }}><Linkedin size={13} /> See my LinkedIn</a>
                  </div>
                  <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12, display: "grid", gap: 7 }}>
                    {[
                      { icon: Check, t: "100% free — no obligation" },
                      { icon: Video, t: "15 minutes, over Zoom" },
                    ].map((x, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.muted, fontWeight: 600 }}>
                        <x.icon size={13} color={C.muted} /> {x.t}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
            <WhyStrip />
          </div>
        ) : (
          <div className="rise" style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 4, background: A, display: "grid", placeItems: "center", margin: "8px auto 16px" }}><Video size={30} color="#fff" /></div>
            <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>You're booked, {name.split(" ")[0]}!</h2>
            <p style={{ color: C.ink2, fontSize: 14.5, marginTop: 8 }}>Our 15-minute call is set for <b>{slot}</b>. I'm looking forward to meeting you. <span style={{ color: C.muted }}>— Sunil</span></p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", background: "#eef3f0", border: `1px solid ${C.line}`, borderRadius: 4, padding: "9px 12px", marginTop: 12 }}>
              <Mail size={15} color={C.emerald} /><span style={{ fontSize: 12.5, color: C.ink2 }}>A calendar invite and Zoom link are on the way to <b>{email}</b>.</span>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="btn" onClick={onHome} style={{ flex: 1, background: C.paper2, color: C.ink, border: `1px solid ${C.line}`, padding: 13, borderRadius: 4, fontSize: 15 }}>Back home</button>
              <button className="btn" onClick={onEnroll} style={{ flex: 1, background: C.emerald, color: "#fff", padding: 13, borderRadius: 4, fontSize: 15 }}>I'm ready — enroll</button>
            </div>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}

// Pre-class setup checklist. In Act 1 (Weeks 1–7) the student builds their OWN app with AI as the
// tool, so they need the same builder's "workshop" set up first — the same accounts/tools used to
// build Build Young itself. Each item says WHEN it's needed so nothing's a surprise; a parent can
// help with sign-ups (several services require an adult under 18). Students tick these off and the
// state persists (s.prereqs). Edit here to change the list.

/* ============================ ROOT ============================ */
/* ============================ LEGAL (in-app, works everywhere) ============================ */
const LEGAL = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["Who we are", `Build Young provides live, online entrepreneurship classes for teenagers. You can reach us at ${CONFIG.contactEmail}.`],
      ["Eligibility — high school students", "Build Young is intended for high school students, enrolled by a parent or guardian. We do not knowingly create accounts for, or collect personal information from, children under 13. If you believe a child under 13 has provided us information, contact us and we will delete it."],
      ["What we collect", "To enroll a student and run the class, we collect the enrolling adult's name and email, the student's first name or chosen display name, the selected class, and payment confirmation (processed by our payment provider — we do not store full card numbers). During class activities, the student builds a real product in a hands-on, project-based class."],
      ["How we use it", "We use this information to deliver the class, send class logistics and reminders, process enrollment and refunds, and improve the program. We send a confirmation email at enrollment and follow-ups tied to class sessions."],
      ["What we do not do", "We do not sell or rent personal information. We do not share it for third-party targeted advertising. We do not use student information to train artificial-intelligence models."],
      ["Sharing with service providers", "We rely on vetted providers to operate — for example payment processing, scheduling, video conferencing, and email delivery. They receive only what they need to perform their service and are bound to protect it."],
      ["Your choices", "You may request a copy of, correction to, or deletion of your information by emailing us. You can unsubscribe from non-essential email at any time."],
      ["Data retention & security", "We keep information only as long as needed for the purposes above and apply reasonable safeguards to protect it."],
      ["Changes", "We may update this policy and will post the new date above."],
    ],
  },
  terms: {
    title: "Terms of Service",
    sections: [
      ["The program", "Build Young offers a live, online program — a 12-week course meeting twice a week, so 24 live sessions in all — delivered over video conference. Students build a product, take it live, learn to grow it, and go to market for their first customers. Classes are live, hands-on, and project-based."],
      ["Eligibility", "Students must be in high school. An adult (parent or guardian) completes enrollment and payment on the student's behalf."],
      ["Education, not professional advice", "Build Young is hands-on entrepreneurship education. It is not licensed business, financial, or legal advice. Students build their own product; any revenue it may earn belongs to the student and their family — Build Young does not collect, hold, or manage it."],
      ["Payment", "Tuition is shown at enrollment and charged through our payment provider at the price listed for the selected cohort."],
      ["Refund policy", "Cancel any time before your cohort's first session for a full refund. Once the program has started, you may withdraw for a prorated refund through the end of the first week — the refund equals the tuition multiplied by the fraction of the program's weeks not yet held. After the first week, tuition is non-refundable."],
      ["First-year builder prize", "In each cohort, the FIRST enrolled student to make a real, arms-length sale of their own product or service — a genuine paying customer, not a friend or family member — within one year of their enrollment date is eligible to have their tuition refunded. To claim, the student must (1) provide proof of the sale (e.g., a payment receipt from Stripe, PayPal, or a similar processor) for Build Young to verify, and (2) submit a short video (about 2 minutes) describing their product and experience, together with a parent or guardian's written consent for Build Young to use the student's name, likeness, and the video for promotional purposes. One award per cohort, to the first student who both qualifies and completes these steps; Build Young verifies eligibility and resolves any questions in good faith, and its decision is final. The award equals the tuition paid for that cohort and is issued after verification. Build Young may modify or discontinue the prize for future cohorts; the terms in effect at your enrollment apply. (This is a draft; because the prize is a contest involving minors and the use of a minor's name and likeness, it — and an appropriate parental media-release — must be reviewed by counsel before launch.)"],
      ["Conduct", "We ask students and families to be respectful in live sessions. We may remove anyone whose conduct disrupts the class, consistent with the refund policy above."],
      ["Changes & contact", `We may update these terms and will post the new date above. Questions: ${CONFIG.contactEmail}.`],
    ],
  },
};
function LegalModal({ kind, onClose }) {
  const doc = LEGAL[kind];
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!doc) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(36,36,36,.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "5vh 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="rise" style={{ background: "#fff", borderRadius: 10, maxWidth: 720, width: "100%", padding: "28px 30px 34px", boxShadow: "0 30px 70px -20px rgba(0,0,0,.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>{doc.title}</h2>
          <button className="btn" onClick={onClose} aria-label="Close" style={{ background: C.paper2, border: `1px solid ${C.line}`, borderRadius: 4, width: 32, height: 32, fontSize: 18, color: C.muted, flexShrink: 0 }}>×</button>
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>Last updated: [set before launch]</div>
        <div style={{ background: "#fbeede", border: `1px solid ${C.goldLite}`, borderRadius: 4, padding: "11px 13px", fontSize: 13, color: C.ink2, marginTop: 14 }}>
          <b>Draft template — not legal advice.</b> Have an attorney review and finalize this before launch.
        </div>
        {doc.sections.map(([h, p], i) => (
          <div key={i} style={{ marginTop: 20 }}>
            <h3 className="disp" style={{ fontSize: 17, fontWeight: 700, margin: "0 0 5px" }}>{h}</h3>
            <p style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.6, margin: 0 }}>{p}</p>
          </div>
        ))}
        <button className="btn" onClick={onClose} style={{ marginTop: 26, background: C.ink, color: C.paper2, padding: "11px 22px", borderRadius: 4, fontSize: 14 }}>Close</button>
      </div>
    </div>
  );
}


/* ===================== FOUNDER FUNNEL DASHBOARD (hidden route: ?founder=<token>) =====================
 * Not in the public nav. Reads the aggregate funnel stream from /api/funnel (gated by a founder session),
 * aggregates it via src/funnel.js (the single source of truth), and renders the connected funnel:
 * stage counts + step conversions, season/track segmentation, the week & check-in curves, revenue,
 * the withdrawal exit branch, and CSV/JSON exports for an investor data room. Aggregate data only. */

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
            track("enrolled", { ...cohortMetaFrom(batches, realBatch), fromCall: _callBookedThisSession }); // funnel: payment completed
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
            track("enrolled", { ...cohortMetaFrom(batches, realBatch), fromCall: _callBookedThisSession }); // funnel: payment completed
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
    track("enroll_started", { ...(id ? cohortMetaFrom(batches, id) : {}), fromCall: _callBookedThisSession });
    setPreselect(id); nav("enroll");
  };
  const startCall = () => nav("call");
  const finishEnroll = (student) => guard(() => {
    // Funnel: payment completed (demo path — the Stripe path fires `enrolled` on the ?enrolled= return).
    track("enrolled", { ...cohortMetaFrom(batches, student.batch), fromCall: _callBookedThisSession });
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
