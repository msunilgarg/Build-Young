import React, { useState } from "react";
import { Sparkles, Flag, TrendingUp, Award, ArrowRight } from "lucide-react";
import { C } from "./theme.js";
import { Card, Mark, Pill, act } from "./ui.jsx";
import { WEEKS, ACTS } from "./course.js";

// The "How it works" page (route: /curriculum). The 3-act journey + product teasers + the
// "Where the work happens" detail used to live inline on the landing page; they're a large block of
// vertical scroll, so they moved onto their own dedicated, crawlable page (the landing keeps a short
// 3-act overview + a "See the full 12 weeks" link here). Nothing is trimmed — full copy lives here.

// Small, code-drawn "product teaser" mocks — one per act — so we SHOW the dashboard instead of only
// describing it. Pure divs (no real screenshots, no image assets), theme-matched to the in-app panels:
// a build prompt (Act 1) → a growth funnel (Act 2) → the capstone (Act 3).
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

export function Curriculum({ onBack, onHome, onEnroll, onCall }) {
  const [openActs, setOpenActs] = useState({}); // act -> bool; week cards are compact by default, expand to show details
  const toggleAct = (a) => setOpenActs((p) => ({ ...p, [a]: !p[a] }));
  return (
    <div style={{ position: "relative", minHeight: "100vh", background: C.paper }}>
      {/* chrome — matches the other sub-pages (BookCall/Enroll/About): home wordmark + Back */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 6vw", maxWidth: 1100, margin: "0 auto" }}>
        <div className="disp" {...act(() => onHome && onHome())} aria-label="Build Young — home" style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-.02em", cursor: "pointer" }}>
          <Mark size={22} /> Build <span className="grad">Young</span>
        </div>
        <button className="btn" onClick={onBack} style={{ background: "transparent", color: C.muted, fontSize: 14 }}>← Back</button>
      </div>

      {/* how it works — the journey in three acts (each act shows a product teaser) */}
      <section id="curriculum" style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 6vw 18px" }}>
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 16px" }}>
          <h1 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>How it works — the journey in <span className="grad">three acts</span></h1>
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
        <p style={{ color: C.muted, marginTop: 18, fontSize: 14, maxWidth: 760, marginLeft: "auto", marginRight: "auto", textAlign: "center", lineHeight: 1.55 }}>Twelve weeks, twice a week — same standing time — building a <b>real business</b> from zero — product, customers, and all — then finishing with a <b>capstone</b> where you present what you built.</p>
      </section>

      {/* where the work happens — make the dashboard exercises concrete (de-nebulize the "how") */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "6px 6vw 22px" }}>
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 16px" }}>
          <h2 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Where the <span className="grad">work</span> happens</h2>
          <p style={{ color: C.muted, fontSize: 16, marginTop: 8, lineHeight: 1.5 }}>It all runs inside your own student dashboard — not videos to watch, but guided exercises to do. Each week unlocks the next, your work saves as you go, and we review it with you live in class.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>
          {[
            { icon: Sparkles, c: C.emerald, t: "Build with AI, step by step", d: "Write your product spec, then copy a ready-made prompt straight into Claude Code to build that piece — and ship it live." },
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

        {/* closing CTA — keep the conversion path on this page */}
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <div className="disp" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.01em" }}>Ready to start building?</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            {onEnroll && <button className="btn" onClick={() => onEnroll()} style={{ background: C.emerald, color: "#fff", padding: "14px 28px", borderRadius: 4, fontSize: 16 }}>Pick a batch & enroll <ArrowRight size={16} style={{ verticalAlign: "-2px" }} /></button>}
            {onCall && <button className="btn" onClick={onCall} style={{ background: "transparent", color: C.ink, padding: "14px 26px", borderRadius: 4, fontSize: 16, border: `1.5px solid ${C.ink}` }}>Talk to us</button>}
          </div>
        </div>
      </section>
    </div>
  );
}
