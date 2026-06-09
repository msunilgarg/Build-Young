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
const HESITATION_REASONS = [
  { value: "cost", label: "The price" },
  { value: "schedule", label: "Schedule or timing" },
  { value: "fit", label: "Not sure it's a fit" },
  { value: "ask_teen", label: "Need to ask my teen" },
  { value: "exploring", label: "Just exploring" },
];
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
const FUNNEL_COLORS = [C.emerald, C.turq, C.gold, C.sky, C.green];

// Friendly names for the internal route keys used as `screen` in engagement events.
const SCREEN_LABELS = { home: "Landing page", enroll: "Enroll flow", call: "Book a call", app: "Student dashboard", login: "Log in", setpw: "Set password", checkemail: "Check your email", founder: "Founder console" };
const screenName = (s) => SCREEN_LABELS[s] || s || "—";
// 2-letter country code → flag emoji (regional indicator symbols); "" for anything malformed.
const flagEmoji = (cc) => (/^[A-Za-z]{2}$/.test(cc || "") ? cc.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65)) : "");
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
  const [events, setEvents] = useState(null); // null = loading
  const [founders, setFounders] = useState([]); // admin allowlist (effective: env ∪ KV)
  const [error, setError] = useState(null);
  const [seg, setSeg] = useState({ kind: "all", key: null }); // all | {season} | {track}
  const [tab, setTab] = useState("today"); // today | funnel | cohorts | students | settings — keeps the console short
  const [resetMsg, setResetMsg] = useState("");
  const [period, setPeriod] = useState("all"); // "all" | "YYYY-MM" — scopes the funnel + trend to a month
  const [trendMetric, setTrendMetric] = useState("visited");
  const [refreshing, setRefreshing] = useState(false); // a manual Refresh re-pulls the funnel without a browser reload

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
    } catch (e) { setError("Couldn’t load analytics (network error)."); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { loadFunnel(); }, [loadFunnel]);

  const filter = seg.kind === "season" ? { season: seg.key } : seg.kind === "track" ? { track: seg.key } : null;
  const scoped = useMemo(() => eventsInMonth(events || [], period), [events, period]);
  const months = useMemo(() => monthsIn(events || []), [events]);
  const didDefaultPeriod = React.useRef(false);
  useEffect(() => { if (!didDefaultPeriod.current && months.length) { setPeriod(months[months.length - 1].key); didDefaultPeriod.current = true; } }, [months]); // default to the latest month so it reads as a monthly trend
  const summary = useMemo(() => summarize(scoped, filter), [scoped, seg.kind, seg.key]);
  const trendData = useMemo(() => weeklyTrend(scoped, { metric: trendMetric, filter, month: period }), [scoped, trendMetric, period, seg.kind, seg.key]);
  // Traffic & engagement is whole-site (not segmented by cohort) — it's the top-of-funnel picture.
  const eng = useMemo(() => engagement(events || []), [events]);
  const paths = useMemo(() => journeys(events || [], { limit: 12 }), [events]);

  const funnelData = STAGES.map((st, i) => {
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
            <span {...act(() => downloadFile("build-young-funnel.json", JSON.stringify(toDataRoom(events || []), null, 2), "application/json"))} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 4, padding: "8px 12px" }}><Download size={14} /> JSON</span>
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
            {SEASONS.map((s) => segBtn(s.label, seg.kind === "season" && seg.key === s.key, () => setSeg({ kind: "season", key: s.key })))}
            {TRACKS.length > 1 && TRACKS.map((t) => segBtn(t, seg.kind === "track" && seg.key === t, () => setSeg({ kind: "track", key: t })))}
          </div>
          {filter && <div style={{ ...muted, marginTop: 8 }}>Segmented views start at <b>Enrolled</b> — top-of-funnel events (visits, enroll-starts) aren’t tied to a cohort.</div>}

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
                <b style={{ fontSize: 14 }}>The funnel</b>
                <span style={muted}>{ratePct(summary.overall)} visited → enrolled</span>
              </div>
              <React.Suspense fallback={<div style={{ height: 280, display: "grid", placeItems: "center", color: C.muted, fontSize: 13 }}>Loading chart…</div>}>
                <Charts kind="funnel" data={funnelData} mutedColor={C.muted} fmt={fmt} />
              </React.Suspense>
            </Card>
            <div style={{ display: "grid", gap: 12 }}>
              <Stat label="Net revenue" value={fmt(summary.revenue.netCents / 100)} sub={`${fmt(summary.revenue.grossCents / 100)} gross − ${fmt(summary.revenue.refundedCents / 100)} refunded`} icon={CircleDollarSign} color={C.green} />
              <Stat label="Enrolled" value={summary.counts.enrolled.toLocaleString()} sub={`${summary.calls.enrolledFromCall} via a booked call · ${summary.calls.enrolledDirect} direct`} icon={Users} color={C.emerald} />
              <Stat label="Calls booked" value={summary.calls.booked.toLocaleString()} sub="“Talk to Sunil” assist path" icon={Video} color={C.turq} />
            </div>
          </div>

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
                        {s.byCountry.slice(0, 6).map((c, i) => <span key={c.country}>{i > 0 ? " · " : ""}{c.country} {c.count.toLocaleString()}</span>)}
                        {s.byCountry.length > 6 && <span style={{ color: C.muted }}> · +{s.byCountry.length - 6} more</span>}
                      </div>
                    ) : <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>No geography yet</div>}
                  </div>
                ))}
              </div>
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
                    <b style={{ fontSize: 13, flexShrink: 0 }}>{p.count.toLocaleString()}</b>
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
          <h2 style={h2s}>Certificates</h2>
          <CertificatesAdmin />
          <h2 style={h2s}>Student plans</h2>
          <BuildPlansAdmin />
          <h2 style={h2s}>Tutor applications</h2>
          <TutorInterestAdmin />
          <h2 style={h2s}>Questions from visitors</h2>
          <QuestionsAdmin />
          <h2 style={h2s}>Schedule requests</h2>
          <ScheduleRequestsAdmin />
          <h2 style={h2s}>Refunds to issue</h2>
          <RefundsAdmin />
          <h2 style={h2s}>Student showcase</h2>
          <ShowcaseAdmin />
          <h2 style={h2s}>Reset a test account</h2>
          <AccountReset />
        </>)}

        {!error && events !== null && tab === "settings" && (<>
          <h2 style={h2s}>Site settings</h2>
          <SettingsEditor />
          <h2 style={h2s}>Funnel simulation agent</h2>
          <ScenarioAgentEditor />
          <h2 style={h2s}>Admins</h2>
          <FoundersEditor founders={founders} />
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
        {SETTINGS_FIELDS.map((f) => f.type === "boolean" ? (
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
  const [checkins, setCheckins] = useState(1);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/cohorts");
        const cat = await r.json();
        if (live) { setRows(Array.isArray(cat.batches) ? cat.batches : []); setCheckins(cat.checkins ?? 1); }
      } catch { if (live) setRows([]); }
    })();
    return () => { live = false; };
  }, []);

  if (rows === null) return <Card style={{ padding: 18, color: C.muted }}>Loading cohorts…</Card>;

  const update = (i, key, val) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: val } : r)));
  const remove = (i) => setRows((rs) => rs.filter((_, j) => j !== i));
  const add = () => setRows((rs) => [...rs, { id: "", season: "fall", track: "Builders", start: "", day: "", seats: 12, price: 999, zoom: "", groupEmail: "", stripeLink: "" }]);
  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("/api/funnel", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batches: rows, checkins: Number(checkins) }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) { setRows(data.catalog.batches); setCheckins(data.catalog.checkins); setStatus("Saved — live now ✓"); }
      else setStatus(adminSaveErr(r, data, "save cohorts"));
    } catch { setStatus(ADMIN_NET_ERR); }
  };

  const inp = { fontSize: 12.5, padding: "6px 8px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, width: "100%", boxSizing: "border-box" };
  const lab = { fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 3 };
  const field = (i, key, label, type = "text", w = "1fr") => (
    <label style={{ gridColumn: `span 1`, minWidth: 0 }}><span style={lab}>{label}</span>
      <input aria-label={`${label} for cohort ${i + 1}`} type={type} value={rows[i][key] ?? ""} onChange={(e) => update(i, key, type === "number" ? e.target.value : e.target.value)} style={inp} /></label>
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

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>Edits go live on the public site immediately (no redeploy). Each cohort's <b>id</b> must be unique and stable; its Stripe link's metadata/redirect should use that id.</div>
      {rows.map((b, i) => (
        <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: 12, marginBottom: 10, background: C.paper }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }} className="enroll-grid">
            {field(i, "id", "Cohort id")}
            {field(i, "season", "Season key")}
            {field(i, "track", "Track")}
            {field(i, "start", "Start (e.g. Sep 7, 2026)")}
            {dayField(i)}
            {field(i, "price", "Price ($)", "number")}
            {field(i, "seats", "Seats", "number")}
            {field(i, "zoom", "Zoom URL")}
            {field(i, "groupEmail", "Group email (whole cohort)")}
            {field(i, "stripeLink", "Stripe Payment Link")}
          </div>
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <span {...act(() => remove(i))} style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.rust }}>Remove cohort</span>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
        <span {...act(add)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: C.emerald, border: `1px solid ${C.emerald}`, borderRadius: 4, padding: "8px 14px" }}>+ Add cohort</span>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.ink2 }}>Monthly check-ins
          <input aria-label="number of follow-up check-ins" type="number" value={checkins} onChange={(e) => setCheckins(e.target.value)} style={{ ...inp, width: 64 }} /></label>
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
      if (r.ok && d.ok) { setList(d.founders); setStatus("Saved ✓"); } else setStatus(adminSaveErr(r, d, "save admins"));
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
