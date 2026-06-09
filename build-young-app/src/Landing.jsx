import React, { useState, useEffect } from "react";
import { TrendingUp, GraduationCap, ArrowRight, Check, Lock, Sparkles, Video, Mail, Briefcase, Anchor, Linkedin, Award, Calendar, Flag } from "lucide-react";
import { C, SUNIL_PHOTO } from "./theme.js";
import { Card, Mark, Pill, act } from "./ui.jsx";
import { CONFIG, track, useCohorts, validEmail, postJson } from "./lib.js";
import { cohortClosed } from "./courseDates.js";
import { SEASONS, seasonLabel } from "./cohorts.js";
import { WEEKS, ACTS } from "./course.js";

// The marketing landing page + all its sub-pieces (hero preview, product teaser, testimonials,
// FAQ, careers/schedule modals). App passes the nav callbacks (onEnroll/onCall/onLegal/...).

const CompoundGraphic = () => (
  <svg viewBox="0 0 760 300" style={{ width: "100%", height: "auto" }} role="img" aria-label="Chart showing that starting to invest younger ends far ahead of starting later">
    <defs>
      <linearGradient id="early" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0067b8" stopOpacity="0.22" /><stop offset="100%" stopColor="#0067b8" stopOpacity="0" /></linearGradient>
    </defs>
    {/* axes */}
    <line x1="60" y1="250" x2="720" y2="250" stroke={C.line} strokeWidth="1.5" />
    <line x1="60" y1="40" x2="60" y2="250" stroke={C.line} strokeWidth="1.5" />
    <text x="60" y="278" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700" fill={C.muted}>age 13</text>
    <text x="660" y="278" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700" fill={C.muted}>age 65</text>
    <text x="22" y="48" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700" fill={C.muted} transform="rotate(-90 22 48)">wealth</text>
    {/* started young */}
    <path d="M60,242 L180,222 L300,180 L420,128 L540,76 L660,40 L660,250 L60,250 Z" fill="url(#early)" />
    <polyline points="60,242 180,222 300,180 420,128 540,76 660,40" fill="none" stroke={C.emerald} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
    <circle cx="660" cy="40" r="5.5" fill="#fff" stroke={C.emerald} strokeWidth="3.5" />
    {/* started later */}
    <polyline points="60,247 180,246 300,238 420,214 540,178 660,140" fill="none" stroke={C.muted} strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
    <circle cx="660" cy="140" r="5" fill="#fff" stroke={C.muted} strokeWidth="3" />
    {/* the gap */}
    <line x1="690" y1="42" x2="690" y2="138" stroke={C.gold} strokeWidth="1.5" />
    <text x="700" y="86" fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="800" fill={C.gold}>the</text>
    <text x="700" y="102" fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="800" fill={C.gold}>head</text>
    <text x="700" y="118" fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="800" fill={C.gold}>start</text>
    {/* labels */}
    <g transform="translate(360,58)"><circle cx="0" cy="-4" r="5" fill={C.emerald} /><text x="12" y="0" fontFamily="Inter, sans-serif" fontSize="13.5" fontWeight="700" fill={C.ink}>Started young</text></g>
    <g transform="translate(330,232)"><circle cx="0" cy="-4" r="5" fill={C.muted} /><text x="12" y="0" fontFamily="Inter, sans-serif" fontSize="13.5" fontWeight="700" fill={C.muted}>Started 10 years later</text></g>
  </svg>
);

/* ============================ LANDING ============================ */
// On-brand decorative backdrop: soft wash + faint ascending bars
const HeroBackdrop = () => (
  <svg aria-hidden="true" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}>
    <defs>
      <radialGradient id="wash" cx="50%" cy="0%" r="80%">
        <stop offset="0%" stopColor="#eaf3fb" />
        <stop offset="60%" stopColor="#faf9f8" />
        <stop offset="100%" stopColor="#faf9f8" />
      </radialGradient>
    </defs>
    <rect width="1440" height="600" fill="url(#wash)" />
    <g opacity="0.06" fill="#0067b8">
      <rect x="90" y="430" width="34" height="90" rx="6" />
      <rect x="134" y="390" width="34" height="130" rx="6" />
      <rect x="178" y="330" width="34" height="190" rx="6" />
      <rect x="1230" y="450" width="34" height="70" rx="6" />
      <rect x="1274" y="400" width="34" height="120" rx="6" />
      <rect x="1318" y="340" width="34" height="180" rx="6" />
    </g>
  </svg>
);

// The hero dashboard preview rotates through the THREE acts of the course, each an animated
// "scene": Build (Act 1 — turn a spec into a shipped product), Grow (Act 2 — the funnel + active
// users), and Capstone (Act 3 — present what you built). It re-keys the scene group each tick
// so the CSS animations replay. Scenes are course-aligned so the hero teases what students do.
const HP_SCENES = [
  { id: "build", week: 3, label: "building live", aria: "building a product" },
  { id: "grow", week: 8, label: "growing live", aria: "growing it into a business" },
  { id: "capstone", week: 12, label: "capstone day", aria: "presenting what they built" },
];
const HeroPreview = () => {
  const C2 = C;
  const [i, setI] = useState(0);
  const sc = HP_SCENES[i % HP_SCENES.length];
  // rotate through the three act-scenes forever
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % HP_SCENES.length), 4600);
    return () => clearInterval(id);
  }, []);

  // ---- scene bodies (all live in the same SVG frame, below the top bar) ----
  const buildScene = (
    <g>
      <text x="40" y="96" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" fill={C2.muted}>BUILDING YOUR PRODUCT — WITH AI</text>
      <g style={{ animation: "hpFade .5s ease both" }}>
        <rect x="40" y="108" width="470" height="70" rx="8" fill={C2.paper2} stroke={C2.line} />
        <text x="58" y="136" fontFamily="Inter, sans-serif" fontSize="14" fill={C2.ink2}>“Claude, build me an app that lets dog owners</text>
        <text x="58" y="158" fontFamily="Inter, sans-serif" fontSize="14" fill={C2.ink2}>book a trusted neighbor to walk their dog…”</text>
      </g>
      {[["Core product", 0.5], ["Accounts & saved data", 0.95], ["Payments", 1.4]].map(([t, d], idx) => (
        <g key={idx} style={{ animation: "hpFade .5s ease both", animationDelay: `${d}s` }} transform={`translate(40,${208 + idx * 40})`}>
          <circle cx="11" cy="6" r="11" fill="#e7f3ee" />
          <path d="M5.5,6.5 l3.5,3.5 l6.5,-7.5" fill="none" stroke={C2.green} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="32" y="11" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600" fill={C2.ink}>{t}</text>
        </g>
      ))}
      <g style={{ animation: "hpFade .5s ease both", animationDelay: "1.9s" }} transform="translate(40,338)">
        <rect width="244" height="30" rx="15" fill="#e7f3ee" />
        <circle cx="18" cy="15" r="4" fill={C2.emerald} className="hp-live" />
        <text x="32" y="20" fontFamily="Inter, sans-serif" fontSize="13.5" fontWeight="700" fill={C2.emerald}>Live on the web · yourapp.com</text>
      </g>
      {/* a little browser window showing the shipped app */}
      <g transform="translate(560,100)" style={{ animation: "hpFade .6s ease both", animationDelay: ".3s" }}>
        <rect width="320" height="258" rx="10" fill="#fff" stroke={C2.line} />
        <path d="M0,34 h320" stroke={C2.line} />
        <circle cx="18" cy="17" r="4" fill="#ff5f56" /><circle cx="34" cy="17" r="4" fill="#ffbd2e" /><circle cx="50" cy="17" r="4" fill="#27c93f" />
        <rect x="120" y="9" width="186" height="16" rx="8" fill={C2.paper2} stroke={C2.line} />
        <rect x="20" y="52" width="280" height="46" rx="8" fill="url(#bygrad)" />
        <text x="38" y="80" fontFamily="Space Grotesk, sans-serif" fontSize="16" fontWeight="800" fill="#fff">PupWalk</text>
        {[{ x: 20, c: C2.emerald, name: "Maya R.", meta: "★ 4.9 · $15" }, { x: 165, c: C2.turq, name: "Devin K.", meta: "★ 5.0 · $18" }].map((card, i) => (
          <g key={i} transform={`translate(${card.x},112)`}>
            <rect width="135" height="86" rx="8" fill={C2.card} stroke={C2.line} />
            <rect x="12" y="12" width="34" height="34" rx="9" fill={card.c} />
            <circle cx="29" cy="27" r="6" fill="#fff" opacity="0.92" />
            <text x="54" y="25" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="700" fill={C2.ink}>{card.name}</text>
            <text x="54" y="40" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600" fill={C2.muted}>Dog walker</text>
            <text x="12" y="70" fontFamily="Inter, sans-serif" fontSize="10.5" fontWeight="700" fill={C2.green}>{card.meta}</text>
          </g>
        ))}
        <rect x="20" y="212" width="280" height="30" rx="8" fill={C2.emerald} />
        <text x="160" y="232" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill="#fff" textAnchor="middle">Book a walk →</text>
      </g>
    </g>
  );

  const growBars = [
    { t: "Visited", w: 470, val: "1,000", c: C2.emerald },
    { t: "Tried it", w: 300, val: "640", c: C2.turq },
    { t: "Came back", w: 178, val: "380", c: C2.green },
  ];
  const growScene = (
    <g>
      <text x="40" y="96" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" fill={C2.muted}>YOUR FUNNEL — FIND IT → TRY IT → COME BACK</text>
      {growBars.map((b, idx) => (
        <g key={idx} transform={`translate(40,${124 + idx * 62})`}>
          <text x="0" y="-4" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" fill={C2.ink2}>{b.t}</text>
          <text x="470" y="-4" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill={C2.ink} textAnchor="end">{b.val}</text>
          <rect x="0" y="2" width="470" height="22" rx="11" fill={C2.paper2} />
          <rect x="0" y="2" width={b.w} height="22" rx="11" fill={b.c} className="hp-grow" style={{ animationDelay: `${idx * 0.18}s` }} />
        </g>
      ))}
      <g style={{ animation: "hpFade .5s ease both", animationDelay: "1s" }} transform="translate(40,322)">
        <rect width="230" height="30" rx="15" fill="#e7f3ee" />
        <text x="115" y="20" fontFamily="Inter, sans-serif" fontSize="13.5" fontWeight="700" fill={C2.green} textAnchor="middle">▲ retention 38% and rising</text>
      </g>
      {/* active-users trend on the right */}
      <g transform="translate(560,104)">
        <text fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill={C2.muted}>ACTIVE USERS / WEEK</text>
        <g transform="translate(0,24)">
          <path className="hp-area" d="M0,150 L60,124 L120,132 L180,96 L240,72 L300,40 L320,30 L320,162 L0,162 Z" fill="url(#area)" />
          <polyline className="hp-line" pathLength="1" points="0,150 60,124 120,132 180,96 240,72 300,40 320,30" fill="none" stroke={C2.emerald} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
          <circle className="hp-end" cx="320" cy="30" r="5.5" fill="#fff" stroke={C2.emerald} strokeWidth="3.5" />
        </g>
      </g>
    </g>
  );

  const capstoneScene = (
    <g>
      <g transform="translate(40,92)">
        <text fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" fill={C2.muted}>YOUR CAPSTONE — PRESENT WHAT YOU BUILT</text>
        <text y="40" fontFamily="Space Grotesk, sans-serif" fontSize="28" fontWeight="800" fill={C2.ink}>What I built: PupWalk</text>
        {[["Shipped & live on the web", 0.4], ["312 people using it", 0.8], ["My story — and what's next", 1.2]].map(([t, d], idx) => (
          <g key={idx} style={{ animation: "hpFade .5s ease both", animationDelay: `${d}s` }} transform={`translate(0,${74 + idx * 38})`}>
            <circle cx="11" cy="6" r="11" fill="#e7f3ee" />
            <path d="M5.5,6.5 l3.5,3.5 l6.5,-7.5" fill="none" stroke={C2.green} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <text x="32" y="11" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600" fill={C2.ink}>{t}</text>
          </g>
        ))}
        <g style={{ animation: "hpFade .5s ease both", animationDelay: "1.6s" }} transform="translate(0,206)">
          <rect width="270" height="30" rx="15" fill="#e7f3ee" />
          <circle cx="18" cy="15" r="4" fill={C2.emerald} className="hp-live" />
          <text x="32" y="20" fontFamily="Inter, sans-serif" fontSize="13.5" fontWeight="700" fill={C2.emerald}>Presenting live · family watching</text>
        </g>
      </g>
      {/* a certificate of completion on the right */}
      <g transform="translate(560,100)" style={{ animation: "hpFade .6s ease both", animationDelay: ".3s" }}>
        <rect width="320" height="258" rx="10" fill="#fff" stroke={C2.line} />
        <rect x="16" y="16" width="288" height="226" rx="6" fill="none" stroke={C2.line} />
        <text x="160" y="54" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="800" letterSpacing="1.5" fill={C2.emerald}>CERTIFICATE OF COMPLETION</text>
        <text x="160" y="82" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fill={C2.muted}>This certifies that</text>
        <text x="160" y="114" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize="22" fontWeight="800" fill={C2.ink}>Your Name</text>
        <text x="160" y="142" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fill={C2.ink2}>built, shipped &amp; presented a real</text>
        <text x="160" y="159" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fill={C2.ink2}>product — the Builders program.</text>
        <circle cx="160" cy="198" r="22" fill="#e7f3ee" />
        <path d="M151,198 l6,6 l12,-13" fill="none" stroke={C2.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="160" y="236" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700" fill={C2.muted}>Build Young</text>
      </g>
    </g>
  );

  const body = sc.id === "build" ? buildScene : sc.id === "grow" ? growScene : capstoneScene;
  return (
    <div className="rise" style={{ maxWidth: 760, margin: "44px auto 0" }}>
      <svg viewBox="0 0 920 430" style={{ width: "100%", height: "auto", filter: "drop-shadow(0 24px 50px rgba(0,103,184,.16))" }} role="img" aria-label={`Build Young dashboard preview — ${sc.aria}`}>
        <rect x="2" y="2" width="916" height="426" rx="12" fill="#ffffff" stroke={C2.line} />
        <defs>
          <linearGradient id="bygrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C2.emerald} /><stop offset="50%" stopColor={C2.turq} /><stop offset="100%" stopColor={C2.green} />
          </linearGradient>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0067b8" stopOpacity="0.28" /><stop offset="100%" stopColor="#0067b8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* top bar */}
        <g transform="translate(28,26)">
          {/* logo — matches the real <Mark/>: 3 ascending blocks (22/36/54 scaled) + teal spark, bottom-aligned at y=18 */}
          <rect x="0" y="4" width="15" height="14" rx="3" fill="#50a0e0" /><rect x="19" y="-5" width="15" height="23" rx="3" fill="#0078d4" /><rect x="38" y="-16" width="15" height="34" rx="3" fill="#0067b8" />
          <path d="M44.5 -23 l5 7 h-10 z" fill="#038387" />
          <text x="70" y="14" fontFamily="Space Grotesk, sans-serif" fontSize="19" fontWeight="800" fill={C2.ink}>Build <tspan fill="url(#bygrad)">Young</tspan></text>
          <rect x="650" y="-8" width="214" height="30" rx="6" fill="#eaf3fb" />
          <text x="757" y="12" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill={C2.emerald} textAnchor="middle"><tspan className="hp-live">●</tspan> Week {sc.week} — {sc.label}</text>
        </g>
        <line x1="2" y1="62" x2="918" y2="62" stroke={C2.line} />
        {/* the active scene, re-keyed so its entrance animations replay each rotation */}
        <g key={i}>{body}</g>
      </svg>
    </div>
  );
};

// Small, code-drawn "product teaser" mocks — one per act — so the landing SHOWS the dashboard
// instead of only describing it. Pure divs (no real screenshots, no image assets), theme-matched
// to the in-app panels: a build prompt (Act 1) → a growth funnel (Act 2) → the capstone (Act 3).
// Decorative illustration: exposed to AT as a single labeled image (role=img + aria-label).
function ProductTeaser({ act, accent }) {
  const dot = { width: 9, height: 9, borderRadius: 99, flexShrink: 0 };
  const win = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 14px 34px -20px rgba(0,0,0,.3)" };
  const kicker = { fontSize: 10.5, fontWeight: 800, color: accent, letterSpacing: ".05em" };
  let body, label, tab;
  if (act === 1) {
    tab = "Build"; label = "A build panel: a plain-English spec turned into a shipped, live product.";
    body = (
      <div style={{ padding: 14 }}>
        <div style={kicker}>WEEK 3 · BUILD THE CORE PRODUCT</div>
        <div style={{ marginTop: 8, background: C.paper2, border: `1px solid ${C.line}`, borderRadius: 6, padding: "9px 11px", fontSize: 12, color: C.ink2, lineHeight: 1.45 }}>“Build me an app that lets dog owners book a trusted neighbor to walk their dog…”</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {["Core product", "Accounts", "E-commerce"].map((t) => (
            <span key={t} style={{ fontSize: 11, fontWeight: 700, color: C.green, background: "#e7f3ee", borderRadius: 99, padding: "3px 9px" }}>✓ {t}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12, fontWeight: 700, color: C.emerald }}><span style={{ ...dot, background: C.emerald }} /> Live on the web · yourapp.com</div>
      </div>
    );
  } else if (act === 2) {
    tab = "Grow"; label = "A growth funnel: visitors who try it and come back, with retention rising.";
    const rows = [{ t: "Visited", v: 100, w: "100%" }, { t: "Tried it", v: 64, w: "64%" }, { t: "Came back", v: 38, w: "38%" }];
    body = (
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><div style={kicker}>YOUR FUNNEL</div><div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>▲ retention 38%</div></div>
        <div style={{ marginTop: 10, display: "grid", gap: 9 }}>
          {rows.map((r) => (
            <div key={r.t}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.ink2, marginBottom: 3 }}><span>{r.t}</span><b>{r.v}</b></div>
              <div style={{ height: 8, borderRadius: 99, background: C.paper2 }}><div style={{ height: 8, width: r.w, borderRadius: 99, background: accent }} /></div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    tab = "Capstone"; label = "A capstone slide: presenting the product you built — shipped, with real users — to family and friends.";
    body = (
      <div style={{ padding: 14 }}>
        <div style={kicker}>WEEK 12 · CAPSTONE</div>
        <div style={{ marginTop: 6, fontWeight: 800, fontSize: 15, color: C.ink }}>What I built — PupWalk</div>
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["Shipped & live", "312 users", "★ 4.9"].map((t) => (
            <span key={t} style={{ fontSize: 11, fontWeight: 700, color: C.green, background: "#e7f3ee", borderRadius: 99, padding: "3px 9px" }}>{t}</span>
          ))}
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, color: accent }}>
          <span style={{ ...dot, background: accent }} /> Presenting live · family watching
        </div>
        <div style={{ marginTop: 10, fontSize: 10.5, color: C.muted }}>Your moment to show what you made.</div>
      </div>
    );
  }
  return (
    <div role="img" aria-label={label} style={win}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", borderBottom: `1px solid ${C.line}`, background: C.paper2 }}>
        <span style={{ ...dot, background: "#ff5f56" }} /><span style={{ ...dot, background: "#ffbd2e" }} /><span style={{ ...dot, background: "#27c93f" }} />
        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: C.muted }}>{tab} · your dashboard</span>
      </div>
      {body}
    </div>
  );
}

// Illustrative testimonials shown ONLY as a preview when the showcase is enabled but no real
// (consented) student feedback has come in yet — so the founder can see the layout. Clearly
// captioned as samples on the page; they're replaced automatically by real submissions.
const SAMPLE_TESTIMONIALS = [
  { name: "Maya, 16", feedback: "I built a flashcards app for my class and watched a friend actually use it. I never thought I could make something real.", link: "" },
  { name: "Devin, 15", feedback: "Shipping my first website was the best feeling. Then we put it in front of real people and got our first sign-ups.", link: "" },
  { name: "Aria, 17", feedback: "I made a tool for my swim team to track our times. My parents were shocked it was online and actually working!", link: "" },
  { name: "Leo, 14", feedback: "I learned to tell AI what 'good' looks like. By the end I had a real product and understood how a business makes money.", link: "" },
];

// Public testimonials / student-showcase — an auto-rotating carousel that sits right at the top of
// the landing page (social proof first), showing one quote at a time with a "n / total" counter.
// Renders real consented submissions (from /api/cohorts); otherwise falls back to clearly-labeled
// SAMPLE_TESTIMONIALS for preview. Respects prefers-reduced-motion. Gated by CONFIG.showcaseEnabled.
function Testimonials({ items = [] }) {
  const [idx, setIdx] = useState(0);
  const real = (Array.isArray(items) ? items : []).filter((t) => t && t.feedback);
  const usingSamples = real.length === 0;
  const list = usingSamples ? SAMPLE_TESTIMONIALS : real;
  const n = list.length;
  useEffect(() => {
    if (n <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % n), 5000);
    return () => clearInterval(id);
  }, [n]);
  if (!n) return null;
  const cur = idx % n;
  const t = list[cur];
  return (
    <section style={{ padding: "34px 6vw 38px", background: `linear-gradient(180deg, #e9f2fb 0%, #eef6f4 100%)`, borderBottom: `1px solid ${C.line}` }}>
      <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: C.emerald }}>What our <span className="grad">builders</span> made</span>
          {usingSamples && <span style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginLeft: 8 }}>· sample preview</span>}
        </div>
        {/* key={cur} re-mounts on each change so the fade-in animation replays */}
        <div key={cur} className="by-quote" style={{ minHeight: 96, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div aria-hidden="true" style={{ fontFamily: "Georgia, serif", fontSize: 44, lineHeight: 0.2, color: C.turq, fontWeight: 800, marginBottom: 18 }}>“</div>
          <p className="disp" style={{ fontSize: "clamp(20px,2.6vw,27px)", color: C.ink, lineHeight: 1.35, margin: 0, fontWeight: 700, maxWidth: 760, letterSpacing: "-.01em" }}>
            {t.feedback}
          </p>
          <div className="disp" style={{ fontSize: 14.5, fontWeight: 800, color: C.emerald, marginTop: 14 }}>
            — {t.name || "A Build Young builder"}
            {t.link && <> · <a href={t.link} target="_blank" rel="noopener noreferrer" style={{ color: C.turq, fontWeight: 700, textDecoration: "none" }}>See their product ↗</a></>}
          </div>
        </div>
        {/* count + dots */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, fontVariantNumeric: "tabular-nums" }}>{cur + 1} / {n}</span>
          {n > 1 && n <= 20 && (
            <span style={{ display: "inline-flex", gap: 6 }}>
              {list.map((_, i) => (
                <button key={i} type="button" aria-label={`Show testimonial ${i + 1}`} onClick={() => setIdx(i)}
                  style={{ width: 7, height: 7, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: i === cur ? C.emerald : C.line }} />
              ))}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

// Visible FAQ on the landing page. KEEP IN SYNC with the FAQPage JSON-LD in index.html
// (that block is what search engines read; this is what visitors read).
const FAQ_ITEMS = [
  { q: "Who is Build Young for?", a: "Build Young is for high school students. A parent or guardian completes enrollment on the student's behalf. No prior experience is needed." },
  { q: "Does my teen need to know how to code?", a: "No. Students build their product using AI tools, so they don't need to know how to code beforehand. They learn to build by building, with AI as the tool." },
  { q: "What will my teen actually do in the program?", a: "Over 12 weeks they find a real problem, build a real product with AI, take it live, grow it with a funnel and metrics, and go get their first customers — finishing with a capstone presentation that parents are welcome to join." },
  { q: "What does “going live” and “getting customers” mean?", a: "Going live means publishing the product they built so it's a real, working thing anyone on the internet can use — not just a class exercise. Getting customers means putting it in front of real people who want it: they learn go-to-market — a simple funnel, metrics, and outreach — to land their first real users, and ideally their first paying ones." },
  { q: "How long is the program and what is the schedule?", a: "It runs 12 weeks, meeting twice a week (about 3 hours total per week), 100% live online over Zoom. Families choose a cohort that meets either Mondays & Wednesdays or Tuesdays & Thursdays." },
  { q: "What does a class actually look like?", a: "Picture 90 minutes, live on Zoom, capped at 10 students — a studio, not a lecture (no slides). We open with a quick goal for the day (about 5 minutes), then you spend most of class actually building your own product with AI while we go around coaching: looking at what you're making, helping you get unstuck, and pushing you to make it better. People share screens, show their progress, and trade ideas with the group, and we wrap by lining up what's next. You're building the whole time — not watching — and you walk out of every class with your product further along than when you joined. Just bring your laptop and your questions." },
  { q: "Is there homework, and what's expected between classes?", a: "Yes, but it's real work, not busywork. A couple of days before each class students get a short heads-up on what to prepare, and between the two weekly sessions they keep building their own product. Plan on the two ~90-minute live classes plus a few hours of building on their own each week — the more they put in, the more they walk away with." },
  { q: "How much does it cost, and what is the refund policy?", a: "Tuition is $999. You get a full refund if you cancel before the cohort starts, and a prorated refund through the first week of class; it is non-refundable after that." },
  { q: "Are there any costs beyond tuition?", a: "A little. During the build weeks your child will need Claude Pro (about $20/month) — the AI they build with; a free account won't keep up. Everything else we use (GitHub, Vercel, email) is free. Later, a custom web address (domain) is optional — about $10–20/year if you want one." },
  { q: "Is there really a way to earn the tuition back?", a: "Yes — the First-year builder prize. In each cohort, the first student to land a real, paying customer for what they built within a year of enrolling earns their tuition back. It takes proof of the payment and a short, parent-approved video. It's how we reward builders who take it all the way to a real sale." },
  { q: "Can we talk to someone before enrolling?", a: "Yes — every family can book a free 15-minute call with us before enrolling. No pitch, no pressure." },
];
function FaqSection({ onCall }) {
  const [askEmail, setAskEmail] = useState("");
  const [askQ, setAskQ] = useState("");
  const [askStatus, setAskStatus] = useState("idle"); // idle | sending | done
  const [askErr, setAskErr] = useState("");
  const canAsk = validEmail(askEmail) && askQ.trim().length > 3 && askStatus !== "sending";
  const submitAsk = async () => {
    if (!canAsk) return;
    setAskStatus("sending"); setAskErr("");
    const r = await postJson("/api/funnel?resource=question", { email: askEmail.trim(), question: askQ.trim() });
    if (r.ok) setAskStatus("done");
    else { setAskStatus("idle"); setAskErr(r.error || "Couldn't submit just now — please try again."); }
  };
  const askLabel = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  const askInput = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink };
  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "8px 6vw 54px" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <h2 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Questions parents ask</h2>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {FAQ_ITEMS.map((f, i) => (
          <details key={i} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: "14px 18px" }}>
            <summary className="disp" style={{ cursor: "pointer", fontSize: 16, fontWeight: 700, color: C.ink, listStyle: "none" }}>{f.q}</summary>
            <p style={{ color: C.ink2, fontSize: 14.5, lineHeight: 1.6, margin: "10px 0 0" }}>{f.a}</p>
          </details>
        ))}
      </div>
      <div style={{ maxWidth: 520, margin: "22px auto 0", background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: "18px 18px" }}>
        {askStatus === "done" ? (
          <p style={{ textAlign: "center", fontSize: 14.5, color: C.ink2, lineHeight: 1.6, margin: 0 }}>
            <Check size={17} color={C.green} style={{ verticalAlign: "-3px", marginRight: 6 }} />
            Thanks — got your question. We'll email you a reply, usually within a day. 🙌
          </p>
        ) : (<>
          <div className="disp" style={{ textAlign: "center", fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 12 }}>Don't see your question? Ask it.</div>
          <label style={{ display: "block", marginBottom: 10 }}>
            <span style={askLabel}>Your email</span>
            <input type="email" aria-label="Your email" value={askEmail} onChange={(e) => setAskEmail(e.target.value)} placeholder="you@example.com" style={askInput} />
          </label>
          <label style={{ display: "block", marginBottom: 6 }}>
            <span style={askLabel}>Your question</span>
            <textarea aria-label="Your question" value={askQ} onChange={(e) => setAskQ(e.target.value)} rows={3} placeholder="What would you like to know?" style={{ ...askInput, resize: "vertical", lineHeight: 1.5 }} />
          </label>
          {askErr && <div style={{ fontSize: 13, color: C.pink, marginTop: 4 }}>{askErr}</div>}
          <button className="btn" onClick={submitAsk} disabled={!canAsk} style={{ width: "100%", marginTop: 10, background: canAsk ? C.emerald : C.line, color: "#fff", padding: "12px 18px", borderRadius: 4, fontSize: 14.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: canAsk ? "pointer" : "not-allowed" }}><Mail size={16} /> {askStatus === "sending" ? "Sending…" : "Send my question"}</button>
          <p style={{ textAlign: "center", fontSize: 13, color: C.muted, margin: "12px 0 0" }}>Prefer to talk it through? <span {...act(onCall)} style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}>Book a free 15-minute call →</span></p>
        </>)}
      </div>
    </section>
  );
}

export function Landing({ onEnroll, onCall, onLegal, onLogin, onDashboard, dashLabel, testimonials = [] }) {
  const BATCHES = useCohorts(); // live catalog (hydrated from /api/cohorts; defaults to code)
  const [season, setSeason] = useState(SEASONS[0].key);
  const [openActs, setOpenActs] = useState({}); // act -> bool; week cards are compact by default, expand to show details
  const toggleAct = (a) => setOpenActs((p) => ({ ...p, [a]: !p[a] }));
  const [careers, setCareers] = useState(false); // "teach with us" interest modal
  const [scheduleOpen, setScheduleOpen] = useState(false); // "request a different schedule" modal
  return (
    <div style={{ position: "relative", zIndex: 2 }}>
      {/* nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 6vw", maxWidth: 1200, margin: "0 auto" }}>
        <div className="disp" {...act(() => { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); } })} aria-label="Build Young — back to top" style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-.02em", cursor: "pointer" }}>
          <Mark size={24} /> Build <span className="grad">Young</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span className="nav-talk" {...act(onCall)} style={{ fontSize: 14, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Talk to us</span>
          <span className="nav-talk" {...act(() => setCareers(true))} style={{ fontSize: 14, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Careers</span>
          {onDashboard
            ? <span {...act(onDashboard)} style={{ fontSize: 14, fontWeight: 700, color: C.emerald, cursor: "pointer" }}>{dashLabel || "My dashboard"} →</span>
            : (onLogin && <span {...act(onLogin)} style={{ fontSize: 14, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Log in</span>)}
          {/* Already enrolled / signed in → no Enroll CTA (they'd go to their dashboard instead). */}
          {!onDashboard && <button className="btn" onClick={onEnroll} style={{ background: C.ink, color: C.paper2, padding: "10px 20px", borderRadius: 4, fontSize: 14 }}>Enroll →</button>}
        </div>
      </nav>

      {/* testimonials carousel — right at the top (gated by the founder showcase toggle) */}
      {CONFIG.showcaseEnabled && <Testimonials items={testimonials} />}

      {/* hero */}
      <header style={{ position: "relative", overflow: "hidden", padding: "40px 6vw 64px" }}>
        <HeroBackdrop />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div className="rise" style={{ marginBottom: 18 }}><Pill bg={C.ink}>12 weeks · high school · live cohorts</Pill></div>
        <h1 className="disp rise" style={{ fontSize: "clamp(38px,6.5vw,74px)", lineHeight: 1.02, fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>
          Raising <span className="grad">builders,</span><br />not consumers.
        </h1>
        <p className="disp rise" style={{ marginTop: 16, fontSize: 18, fontWeight: 700, color: C.gold, letterSpacing: ".01em" }}>Build Young — build a real product, then learn to grow it into a real business.</p>
        <p className="rise" style={{ maxWidth: 620, margin: "26px auto 0", fontSize: 19, color: C.ink2, lineHeight: 1.5 }}>
          Build Young is a <b>live, instructor-led course</b> where teens build a product they believe people would pay for — a small app, tool, or service, made with AI — and <b>learn to grow it into a real business</b>, thinking like <b>founders</b> the whole way.
        </p>
        <HeroPreview />
        <div className="rise" style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          {onDashboard
            ? <button className="btn" onClick={onDashboard} style={{ background: C.emerald, color: "#fff", padding: "15px 30px", borderRadius: 4, fontSize: 16 }}>Go to {dashLabel ? dashLabel.toLowerCase() : "my dashboard"} <ArrowRight size={16} style={{ verticalAlign: "-2px" }} /></button>
            : <button className="btn" onClick={onEnroll} style={{ background: C.emerald, color: "#fff", padding: "15px 30px", borderRadius: 4, fontSize: 16 }}>Pick a batch & enroll <ArrowRight size={16} style={{ verticalAlign: "-2px" }} /></button>}
          <button className="btn" onClick={onCall} style={{ background: "transparent", color: C.ink, padding: "15px 28px", borderRadius: 4, fontSize: 16, border: `1.5px solid ${C.ink}` }}>Talk to us</button>
          <a href="#curriculum" style={{ textDecoration: "none", alignSelf: "center" }}><span style={{ color: C.ink2, fontSize: 15, fontWeight: 600, borderBottom: `1.5px solid ${C.line}`, paddingBottom: 2 }}>See the 12 weeks</span></a>
        </div>
        <p className="rise" style={{ fontSize: 13.5, color: C.muted, marginTop: 14 }}>Free 15-minute call — no pitch, no pressure.</p>
        <div className="rise" style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 26 }}>
          {[
            { icon: Video, t: "Live & instructor-led on Zoom" },
            { icon: Lock, t: "A safe sandbox — build for real, low stakes" },
            { icon: GraduationCap, t: "Led by the founder · ex-Microsoft" },
            { icon: Check, t: "Full refund before class starts" },
          ].map((x, i) => (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: C.ink2 }}>
              <x.icon size={14} color={C.emerald} /> {x.t}
            </div>
          ))}
        </div>
        <p className="rise" style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>Hands-on entrepreneurship — teens build a real product with AI.</p>
        </div>
      </header>

      {/* how it works — the journey in three acts (merged: one section, each act shows a product teaser) */}
      <section id="curriculum" style={{ maxWidth: 1100, margin: "0 auto", padding: "30px 6vw 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 22px" }}>
          <h2 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>How it works — the journey in <span className="grad">three acts</span></h2>
          <p style={{ color: C.muted, fontSize: 16, marginTop: 8, lineHeight: 1.5 }}>It all runs as one live, hands-on build — your student makes the real calls each week and lives with what happens. <b>No slideware, no lectures, no busywork.</b> Twelve weeks, three acts: <b>build &amp; launch</b> (Weeks 1–7), <b>learn how to grow it</b> (Weeks 8–10), and <b>present what you built</b> at the capstone (Weeks 11–12).</p>
        </div>
        {Object.keys(ACTS).map(Number).map((act) => {
          const accent = act === 1 ? C.green : act === 2 ? C.pink : C.turq;
          const promise = act === 1
            ? "Build a real product with AI — the one skill it can't replace is taste, knowing what good looks like — then ship it on the live internet with a web address, sign-ins, and e-commerce, so a customer can use it and buy."
            : act === 2
            ? "Learn how products actually grow: build a funnel, read the numbers that matter — active users, retention, where people drop off — and find the levers that move them. You practice on funnels built from YOUR own product, not textbook examples, with AI to spin up tougher ones on demand. The focus here is the skill of growth — real traction is the long game they keep playing after the course."
            : "Get ready for the capstone, then present what you built — the product, who's using it, and what you'd build next. Week 11 you prep and polish; Week 12 you present it live to family and friends (parents are welcome to join the final call), and graduate with a product you shipped and a certificate.";
          const weeks = WEEKS.map((w, i) => ({ w, n: i + 1 })).filter((x) => x.w.act === act);
          const open = !!openActs[act];
          return (
          <div key={act} style={{ marginTop: act === 1 ? 6 : 28 }}>
            {/* act header: copy on the left, a code-drawn product teaser on the right (collapses on mobile) */}
            <div className="enroll-grid" style={{ alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Pill bg={accent}>Act {act}</Pill>
                  <span className="disp" style={{ fontSize: 21, fontWeight: 800 }}>{ACTS[act]}</span>
                </div>
                <p style={{ color: C.ink2, fontSize: 14.5, lineHeight: 1.55, margin: "10px 0 0" }}>{promise}</p>
              </div>
              <ProductTeaser act={act} accent={accent} />
            </div>
            {/* weeks — compact title chips by default; expand to full cards with descriptions */}
            {open ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
                {weeks.map(({ w, n }) => (
                  <Card key={n} style={{ padding: "11px 13px" }}>
                    <div style={{ fontSize: 10.5, color: accent, fontWeight: 700, letterSpacing: ".05em" }}>WEEK {n}</div>
                    <div className="disp" style={{ fontWeight: 700, fontSize: 15, margin: "2px 0 4px" }}>{w.t}</div>
                    <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}>{w.s}</div>
                  </Card>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {weeks.map(({ w, n }) => (
                  <button key={n} onClick={() => toggleAct(act)} title="Show what each week covers" className="btn" style={{ display: "inline-flex", alignItems: "baseline", gap: 6, background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>
                    <b style={{ color: accent, fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em" }}>W{n}</b>
                    <span className="disp" style={{ fontWeight: 700, color: C.ink }}>{w.t}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => toggleAct(act)} aria-expanded={open} className="btn" style={{ marginTop: 10, background: "transparent", border: "none", color: accent, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "2px 0" }}>
              {open ? "Hide week details ▴" : `Show what each week covers ▾`}
            </button>
          </div>
          );
        })}
        <p style={{ color: C.muted, marginTop: 24, fontSize: 14, maxWidth: 760, marginLeft: "auto", marginRight: "auto", textAlign: "center", lineHeight: 1.55 }}>Twelve weeks, twice a week — same standing time — building a <b>real business</b> from zero — product, customers, and all — then finishing with a <b>capstone</b> where you present what you built.</p>
      </section>

      {/* where the work happens — make the dashboard exercises concrete (de-nebulize the "how") */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 6vw 30px" }}>
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 22px" }}>
          <h2 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Where the <span className="grad">work</span> happens</h2>
          <p style={{ color: C.muted, fontSize: 16, marginTop: 8, lineHeight: 1.5 }}>It all runs inside your own student dashboard — not videos to watch, but guided exercises to do. Each week unlocks the next, your work saves as you go, and we review it with you live in class.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>
          {[
            { icon: Sparkles, c: C.emerald, t: "Build with AI, step by step", d: "Write your product spec, then copy a ready-made prompt straight into AI to build that piece — and ship it live." },
            { icon: Flag, c: C.green, t: "A real launch checklist", d: "Work through what it takes to go live — a web address, payments switched on, data kept safe — until your product is open for business." },
            { icon: TrendingUp, c: C.turq, t: "Your own numbers to read", d: "Active users, retention, and where people drop off — on practice funnels built from what YOU shipped, not textbook examples. Then pick the one thing to fix." },
            { icon: Award, c: C.gold, t: "A capstone you present", d: "Pull together the story of what you built — the product, who's using it, what's next — and present it live. Parents are welcome to join." },
          ].map((x, i) => (
            <Card key={i} style={{ padding: "16px 18px", borderTop: `3px solid ${x.c}` }}>
              <x.icon size={20} color={x.c} />
              <div className="disp" style={{ fontWeight: 800, fontSize: 16, marginTop: 8 }}>{x.t}</div>
              <div style={{ fontSize: 13, color: C.ink2, marginTop: 6, lineHeight: 1.45 }}>{x.d}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* philosophy + founder */}
      <section style={{ position: "relative", overflow: "hidden", background: C.paper2, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, marginTop: 14 }}>
        {/* decorative motif */}
        <svg aria-hidden="true" viewBox="0 0 520 360" style={{ position: "absolute", top: 0, right: 0, height: "100%", maxWidth: "48%", opacity: 0.5, zIndex: 0 }} preserveAspectRatio="xMaxYMin meet">
          <defs>
            <radialGradient id="phiGlow" cx="78%" cy="18%" r="70%"><stop offset="0%" stopColor="#eaf3fb" /><stop offset="100%" stopColor="#f3f2f1" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width="520" height="360" fill="url(#phiGlow)" />
          <g opacity="0.16">
            <circle cx="430" cy="92" r="60" fill="none" stroke="#0067b8" strokeWidth="2" />
            <circle cx="300" cy="150" r="34" fill="none" stroke="#5c2e91" strokeWidth="2" />
          </g>
          {/* ascending blocks + growth spark (brand motif) */}
          <g transform="translate(372,108)" opacity="0.9">
            <rect x="0"  y="70" width="26" height="44" rx="5" fill="#50a0e0" />
            <rect x="34" y="44" width="26" height="70" rx="5" fill="#0078d4" />
            <rect x="68" y="10" width="26" height="104" rx="5" fill="#0067b8" />
            <path d="M81 -8 l9 12 h-18 z" fill="#038387" />
          </g>
          {/* rising sparkline */}
          <polyline points="300,250 340,236 380,244 420,212 460,196 500,160" fill="none" stroke="#0067b8" strokeWidth="3" strokeOpacity="0.35" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "40px 6vw 44px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#efe7f5", color: C.gold, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", padding: "6px 12px", borderRadius: 4, marginBottom: 14 }}><Sparkles size={13} /> The bigger picture</div>
            <h2 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>More than <span className="grad-warm">money</span></h2>
            <div style={{ width: 64, height: 4, borderRadius: 2, margin: "12px auto 0", background: `linear-gradient(90deg, ${C.green}, ${C.turq}, ${C.pink})` }} />
          </div>
          <p style={{ fontSize: 21, lineHeight: 1.5, marginTop: 24, maxWidth: 760, marginLeft: "auto", marginRight: "auto", textAlign: "center", color: C.ink }}>
            <b className="disp">Raising builders, not consumers.</b> AI just collapsed the barrier to building — what once took a team and a budget, a motivated teenager can now do alone. So the edge isn't a credential; it's <b>taste</b> — knowing what's worth making — and starting early. We teach it by letting them live it: they build, they ship, then they learn to grow what they've made.
          </p>
          <p style={{ color: C.ink2, fontSize: 17.5, lineHeight: 1.6, marginTop: 18, maxWidth: 740, marginLeft: "auto", marginRight: "auto" }}>
            It's not only about the money — it's who a kid becomes in the doing. Making something real, putting it in front of people, living with the wins and the flops shapes a person in ways no lecture can. And a kid who has built something real and seen how money actually works talks about it without shame — and decides from confidence, not fear.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginTop: 24 }}>
            {[
              { t: "Initiative", d: "Shipping something real — not waiting to be told what to do — is a muscle most kids never get to train.", icon: Sparkles, c: C.green },
              { t: "Resilience", d: "A product that flops, a price no one pays — recovering and trying again is where the grit comes from.", icon: Anchor, c: C.pink },
              { t: "Ownership", d: "You made it, so you own the upside. That changes how a kid sees money — and themselves.", icon: Briefcase, c: C.turq },
            ].map((x, i) => (
              <Card key={i} style={{ padding: 18, background: C.card }}>
                <div style={{ width: 40, height: 40, borderRadius: 4, background: x.c + "1a", display: "grid", placeItems: "center", marginBottom: 12 }}><x.icon size={20} color={x.c} /></div>
                <div className="disp" style={{ fontWeight: 700, fontSize: 16 }}>{x.t}</div>
                <div style={{ color: C.muted, fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>{x.d}</div>
              </Card>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 28, alignItems: "center", marginTop: 30 }}>
            <Card style={{ padding: "22px 24px" }}>
              <div className="disp" style={{ fontWeight: 800, fontSize: 18 }}>Why starting young wins</div>
              <div style={{ color: C.muted, fontSize: 13.5, marginTop: 2, marginBottom: 8 }}>Same monthly savings — more time to compound. Illustrative.</div>
              <CompoundGraphic />
            </Card>
            <p style={{ color: C.ink2, fontSize: 16.5, lineHeight: 1.6 }}>
              The chart shows money compounding — but the bigger thing compounding is the skill itself. A teenager who learns to make things people value, in the era when AI is rewriting every career, isn't just getting a financial head start; they're building the judgment and the habit of shipping years before their peers. <b style={{ color: C.ink }}>That head start is the whole reason to start young.</b>
            </p>
          </div>

          {/* founder */}
          <Card style={{ padding: 28, marginTop: 34, display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <img src={SUNIL_PHOTO} alt="Sunil Garg" style={{ width: 72, height: 72, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 260 }}>
              <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>Why this exists</div>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 8 }}>
                Like a lot of parents, we think about what the world will look like when our kids graduate — and how fast it's changing under them. I build AI products for a living, so I see that shift up close, and waiting for school or the world to catch up isn't a plan. So we start now — building with the very tools shaping that future, moving with it instead of bracing for it.
              </p>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                It's not a new idea that the young build the future — only now the door is wide open. Microsoft (Bill Gates, 19), Apple (Steve Jobs, 21, in a garage), Dell (Michael Dell, 19, in a dorm room), Facebook (Mark Zuckerberg, 19, in a dorm room), Stripe (John Collison, 19) — all started by people barely older than our kids, back when building was genuinely hard: you had to teach yourself to code, find a team, and scrape together money. AI has knocked those walls down — a teenager with a laptop can now build what once took a company. That's the opportunity to take, and the stakes are higher than ever: when everyone has the tools, the edge goes to whoever starts early and learns to build well.
              </p>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
                Sources: {[
                  ["Microsoft (Gates)", "https://www.britannica.com/biography/Bill-Gates"],
                  ["Apple (Jobs)", "https://www.britannica.com/money/Steve-Jobs"],
                  ["Dell", "https://achievement.org/achiever/michael-dell/"],
                  ["Facebook (Zuckerberg)", "https://www.cnbc.com/2017/05/25/mark-zuckerberg-returns-to-the-harvard-dorm-where-facebook-was-born.html"],
                  ["Stripe (Collison)", "https://en.wikipedia.org/wiki/John_Collison"],
                ].map(([label, url], i) => (
                  <React.Fragment key={url}>
                    {i > 0 && " · "}
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, textDecoration: "underline" }}>{label}</a>
                  </React.Fragment>
                ))}
              </div>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                We have two daughters, 15 and 11 — both at school in Sammamish, Washington, and both with a Starbucks habit we're gently working on. My wife and I take how kids learn seriously — she teaches at Issaquah Montessori School, I build with AI — and we want ours building while the advantage is still theirs to take.
              </p>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                We went looking for a class that actually taught that — building something real with AI and putting it in front of people — and couldn't find the right one. The serious programs cost $6,000 or more and run a whole summer or even a year — slow, when AI changes month to month. Others are coding classes that teach kids to program the slow old way and stop at a finished exercise. We don't teach coding at all — AI handles the how; the real work is building something that matters and learning to put it in front of people. The rest is free material that's easy to start and easy to abandon; a video never made a teenager show up. So we made the one we wanted for our own kids: a focused twelve weeks, affordable, live, in a small group on a standing weekly time — what turns “available” into “actually done.”
              </p>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                That's the whole idea: building is a skill you practice, not a subject you study. We're raising builders, not consumers — kids who reach adulthood having already lived it. We called it Build Young because the one advantage they have that no one can buy is time, and it compounds: habits, character, taste, and everything they build all grow with it.
              </p>
              <p style={{ color: C.ink2, fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
                Start building young, and time does the rest.
              </p>
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 18, paddingTop: 14 }}>
                <div className="disp" style={{ fontWeight: 800, fontSize: 16 }}>Sunil Garg</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2, letterSpacing: ".01em" }}>Founder · Ex-Microsoft · two decades in product</div>
                <a href={CONFIG.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 12, color: C.emerald, fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}><Linkedin size={16} /> Connect on LinkedIn</a>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* batches / pricing */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 6vw 54px" }}>
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <h2 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Upcoming batches</h2>
          <p style={{ color: C.ink2, fontSize: 15, marginTop: 8, lineHeight: 1.55 }}>The <b>Builders</b> program is for <b>high schoolers</b>, meeting <b>twice a week</b> (~3 hrs) — choose <b>Mondays & Wednesdays</b> or <b>Tuesdays & Thursdays</b> — <b>100% live online over Zoom</b>. Pick the season and days that fit.</p>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 8, lineHeight: 1.55 }}>Not sure it's the right fit? <span {...act(onCall)} style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}>Talk to us first — book a free 15-minute call →</span> And if you change your mind, <b>cancel before your cohort starts for a full refund</b>; after it begins, withdraw through the <b>first week</b> for a prorated refund; non-refundable after.</p>
          <div style={{ marginTop: 18, maxWidth: 660, marginLeft: "auto", marginRight: "auto", background: "#eef3f0", border: `1px solid ${C.green}`, borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: C.green }}><Award size={14} /> Earn your tuition back</div>
            <p style={{ color: C.ink2, fontSize: 14, marginTop: 8, lineHeight: 1.55 }}>The <b>first builder in each cohort to land a real paying customer</b> — within a year of enrolling — gets their <b>tuition refunded</b>. A real sale, with proof — then a <b>2-minute video</b> about what you built (with a parent's OK). The whole point of Build Young, rewarded. <span style={{ color: C.muted }}>(One per cohort; <span {...act(() => onLegal("terms"))} style={{ textDecoration: "underline", cursor: "pointer" }}>see Terms</span>.)</span></p>
          </div>
        </div>
        {/* season selector */}
        <div role="tablist" aria-label="Choose a season" style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, marginTop: 22 }}>
          {SEASONS.map((s) => {
            const on = season === s.key;
            const open = BATCHES.some((b) => b.season === s.key);
            return (
              <button key={s.key} role="tab" aria-selected={on} className="btn" onClick={() => setSeason(s.key)} style={{ padding: "9px 18px", borderRadius: 999, fontSize: 14.5, fontWeight: 700, background: on ? C.ink : C.card, color: on ? C.paper2 : C.ink2, border: `1.5px solid ${on ? C.ink : C.line}` }}>{s.label}{!open && <span style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 600, opacity: 0.7 }}>· soon</span>}</button>
            );
          })}
        </div>
        {BATCHES.filter((b) => b.season === season).length === 0 ? (
          <div style={{ maxWidth: 560, margin: "20px auto 0", textAlign: "center", background: C.paper2, border: `1px dashed ${C.line}`, borderRadius: 10, padding: "30px 26px" }}>
            <Calendar size={26} color={C.muted} />
            <div className="disp" style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{seasonLabel(season)} — not yet scheduled</div>
            <p style={{ color: C.ink2, fontSize: 14.5, marginTop: 8, lineHeight: 1.55 }}>We haven't set dates for this season yet. <b>Fall 2026 is enrolling now</b> — or leave it to us: book a free call and we'll let you know the moment {seasonLabel(season)} opens.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
              <button className="btn" onClick={() => setSeason("fall")} style={{ background: C.emerald, color: "#fff", padding: "11px 18px", borderRadius: 4, fontSize: 14.5, fontWeight: 700 }}>See Fall 2026 →</button>
              <button className="btn" onClick={onCall} style={{ background: C.card, color: C.ink, padding: "11px 18px", borderRadius: 4, fontSize: 14.5, fontWeight: 700, border: `1.5px solid ${C.line}` }}>Talk to us →</button>
            </div>
          </div>
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginTop: 20 }}>
          {BATCHES.filter((b) => b.season === season).map((b) => {
            const acc = b.id.includes("mw") ? C.emerald : C.green;
            const closed = cohortClosed(b);
            return (
            <Card key={b.id} className="lift" style={{ padding: 22, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: acc }} />
              <div style={{ marginTop: 4 }}><Pill bg={acc}>{b.track} · high school</Pill></div>
              <div className="disp" style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>Starts {b.start}</div>
              <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{b.day}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: acc, fontSize: 13, fontWeight: 600, marginTop: 6 }}><Video size={14} /> Live online · Zoom · ~3 hrs/week</div>
              <div style={{ fontSize: 13, color: C.ink2, marginTop: 10, lineHeight: 1.45 }}>
                The full 12-week program — build a product you believe people would pay for, take it live, grow it with a funnel and metrics, and go to market for your first customers. In an AI world, the edge isn't a degree; it's what you can build.
              </div>
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: "auto", marginBottom: 12, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="disp" style={{ fontSize: 30, fontWeight: 800 }}>${b.price}</span>
                <span style={{ fontSize: 13, color: closed ? C.rust : (b.seats < 5 ? C.rust : C.muted), fontWeight: 600 }}>{closed ? "Enrollment full" : `${b.seats} seats left`}</span>
              </div>
              <button className="btn" onClick={() => onEnroll(b.id)} style={{ width: "100%", background: closed ? C.line : acc, color: "#fff", padding: "12px", borderRadius: 4, fontSize: 15 }}>{closed ? "Join the next cohort →" : "Enroll in this batch"}</button>
            </Card>
            );
          })}
        </div>
        )}
        <div style={{ textAlign: "center", marginTop: 22, fontSize: 14, color: C.muted }}>
          Don't see a time that works for you? <span {...act(() => setScheduleOpen(true))} style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}>Tell us your ideal schedule →</span>
        </div>
      </section>

      <FaqSection onCall={onCall} />

      <footer style={{ borderTop: `1px solid ${C.line}`, padding: "26px 6vw", textAlign: "center", color: C.muted, fontSize: 13 }}>
        <div>Build Young · Raising builders, not consumers</div>
        <div style={{ marginTop: 8, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <span {...act(() => onLegal("privacy"))} style={{ color: C.muted, cursor: "pointer" }}>Privacy</span>
          <span {...act(() => onLegal("terms"))} style={{ color: C.muted, cursor: "pointer" }}>Terms</span>
          <span {...act(() => setCareers(true))} style={{ color: C.muted, cursor: "pointer" }}>Careers</span>
          <a href={`mailto:${CONFIG.contactEmail}`} style={{ color: C.muted }}>{CONFIG.contactEmail}</a>
          <a href={CONFIG.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, display: "inline-flex", alignItems: "center", gap: 5 }}><Linkedin size={13} /> Sunil on LinkedIn</a>
        </div>
        <div style={{ marginTop: 8, fontSize: 12 }}>Hands-on entrepreneurship education. Students build a real product with AI.</div>
      </footer>

      {careers && <CareersModal onClose={() => setCareers(false)} />}
      {scheduleOpen && <ScheduleRequestModal onClose={() => setScheduleOpen(false)} />}
    </div>
  );
}

// "Teach with us" — a simple interest modal for prospective live tutors. We just ask for an email
// + LinkedIn (both required) and POST to /api/funnel?resource=tutor, which emails it to the founder
// and stores it. Mail-client-independent (no mailto) so it works for everyone. Calm modal style.
function CareersModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done
  const [err, setErr] = useState("");
  const liOk = /linkedin\.com\//i.test(linkedin.trim());
  const canSend = validEmail(email) && liOk && status !== "sending";

  const submit = async () => {
    if (!canSend) return;
    setStatus("sending"); setErr("");
    const r = await postJson("/api/funnel?resource=tutor", { email: email.trim(), linkedin: linkedin.trim() });
    if (r.ok) setStatus("done");
    else { setStatus("idle"); setErr(r.error || "Couldn't submit just now — please try again."); }
  };

  const li = { display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14, color: C.ink2, lineHeight: 1.5, padding: "5px 0" };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink };
  return (
    <div role="dialog" aria-modal="true" aria-label="Teach with Build Young" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(36,36,36,.5)", display: "grid", placeItems: "center", padding: 20 }}>
      <Card onClick={(e) => e.stopPropagation()} style={{ padding: 28, maxWidth: 520, width: "100%", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#efe7f5", color: C.gold, fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", padding: "5px 11px", borderRadius: 4 }}><GraduationCap size={13} /> Careers · Teach with us</div>
        <h2 className="disp" style={{ fontSize: 24, fontWeight: 800, margin: "14px 0 0" }}>Become a Build Young tutor</h2>

        {status === "done" ? (
          <>
            <p style={{ fontSize: 15, color: C.ink2, lineHeight: 1.6, marginTop: 12 }}>
              <Check size={17} color={C.green} style={{ verticalAlign: "-3px", marginRight: 6 }} />
              Thanks — we've got your details and we'll be in touch. 🙌
            </p>
            <button className="btn" onClick={onClose} style={{ marginTop: 16, background: C.ink, color: C.paper2, padding: "11px 20px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Close</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 15, color: C.ink2, lineHeight: 1.6, marginTop: 10 }}>
              We run small, live cohorts where teens build a real product with AI and learn how money works. As we grow, we're looking for instructors who can lead a group live over Zoom — twice a week, ~90 minutes a session, over the 12-week course.
            </p>
            <div style={{ marginTop: 8, marginBottom: 16 }}>
              <div style={li}><Check size={17} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} /><span>You've <b>built things</b> yourself — a product, startup, or side project (bonus if you build with AI).</span></div>
              <div style={li}><Check size={17} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} /><span>You genuinely like <b>working with teens</b> and can make hard ideas feel simple.</span></div>
              <div style={li}><Check size={17} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} /><span>You can commit to a <b>standing weekly time</b> for a cohort, live on Zoom.</span></div>
            </div>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={labelStyle}>Your email</span>
              <input type="email" aria-label="Your email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
            </label>
            <label style={{ display: "block", marginBottom: 6 }}>
              <span style={labelStyle}>LinkedIn profile <span style={{ color: C.pink }}>*</span></span>
              <input type="url" aria-label="LinkedIn profile URL" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://www.linkedin.com/in/your-profile" style={inputStyle} />
            </label>
            {err && <div style={{ fontSize: 13, color: C.pink, marginTop: 6 }}>{err}</div>}
            <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, margin: "12px 0 16px" }}>
              We work with minors, so live instructors go through a background check. We'll only use your details to follow up.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" onClick={submit} disabled={!canSend} style={{ background: canSend ? C.emerald : C.line, color: "#fff", padding: "12px 20px", borderRadius: 4, fontSize: 14.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, cursor: canSend ? "pointer" : "not-allowed" }}><Mail size={16} /> {status === "sending" ? "Sending…" : "Express interest"}</button>
              <button className="btn" onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.muted, padding: "12px 18px", borderRadius: 4, fontSize: 14 }}>Maybe later</button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// "Request a different schedule" — visitors who can't make the listed times tell us their ideal
// days/times + timezone. A demand signal for future cohorts; emailed to the founder + stored, and
// they're auto-notified when new cohorts open. Mirrors CareersModal.
function ScheduleRequestModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [preference, setPreference] = useState("");
  const [timezone, setTimezone] = useState("");
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");
  const canSend = validEmail(email) && (preference.trim() || timezone.trim()) && status !== "sending";
  const submit = async () => {
    if (!canSend) return;
    setStatus("sending"); setErr("");
    const r = await postJson("/api/funnel?resource=schedule", { email: email.trim(), preference: preference.trim(), timezone: timezone.trim() });
    if (r.ok) { setStatus("done"); track("schedule_requested", {}); }
    else { setStatus("idle"); setErr(r.error || "Couldn't submit just now — please try again."); }
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink };
  return (
    <div role="dialog" aria-modal="true" aria-label="Request a different schedule" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(36,36,36,.5)", display: "grid", placeItems: "center", padding: 20 }}>
      <Card onClick={(e) => e.stopPropagation()} style={{ padding: 28, maxWidth: 520, width: "100%", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#eef3f0", color: C.green, fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", padding: "5px 11px", borderRadius: 4 }}><Calendar size={13} /> Future cohorts</div>
        <h2 className="disp" style={{ fontSize: 24, fontWeight: 800, margin: "14px 0 0" }}>Want a different time?</h2>
        {status === "done" ? (
          <>
            <p style={{ fontSize: 15, color: C.ink2, lineHeight: 1.6, marginTop: 12 }}>
              <Check size={17} color={C.green} style={{ verticalAlign: "-3px", marginRight: 6 }} />
              Thanks! We'll factor this into future scheduling — and email you the moment a cohort that fits opens. 🙌
            </p>
            <button className="btn" onClick={onClose} style={{ marginTop: 16, background: C.ink, color: C.paper2, padding: "11px 20px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>Close</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 15, color: C.ink2, lineHeight: 1.6, marginTop: 10 }}>
              The current cohorts meet evenings Pacific Time. If a different day, time, or timezone would work better for your family, tell us — it directly shapes which cohorts we open next, and we'll email you when one fits.
            </p>
            <label style={{ display: "block", marginTop: 14, marginBottom: 12 }}>
              <span style={labelStyle}>Your email</span>
              <input type="email" aria-label="Your email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
            </label>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={labelStyle}>Preferred days / times</span>
              <input aria-label="Preferred days and times" value={preference} onChange={(e) => setPreference(e.target.value)} placeholder="e.g. weekend mornings, or Tue/Thu after 4pm" style={inputStyle} />
            </label>
            <label style={{ display: "block", marginBottom: 6 }}>
              <span style={labelStyle}>Your timezone</span>
              <select aria-label="Your timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} style={inputStyle}>
                <option value="">Select your timezone…</option>
                {["Pacific (PT)","Mountain (MT)","Central (CT)","Eastern (ET)","Alaska (AKT)","Hawaii (HT)","UK / GMT","Europe (CET)","India (IST)","Other"].map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </label>
            {err && <div style={{ fontSize: 13, color: C.pink, marginTop: 6 }}>{err}</div>}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <button className="btn" onClick={submit} disabled={!canSend} style={{ background: canSend ? C.emerald : C.line, color: "#fff", padding: "12px 20px", borderRadius: 4, fontSize: 14.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, cursor: canSend ? "pointer" : "not-allowed" }}><Mail size={16} /> {status === "sending" ? "Sending…" : "Send my preference"}</button>
              <button className="btn" onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.muted, padding: "12px 18px", borderRadius: 4, fontSize: 14 }}>Maybe later</button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
