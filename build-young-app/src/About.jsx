import React from "react";
import { Sparkles, Anchor, Briefcase, Linkedin, ArrowRight } from "lucide-react";
import { C, SUNIL_PHOTO } from "./theme.js";
import { Card, Mark, act } from "./ui.jsx";
import { CONFIG } from "./lib.js";

// The "Our story / why this exists" page (route: /about). The founder essay + "More than money"
// narrative used to live inline on the landing page; they're the single biggest block of vertical
// scroll, so they moved onto their own dedicated, crawlable page (linked from the landing teaser).
// Nothing is trimmed — the full copy lives here verbatim, now with its own <title>/URL for SEO.

// Conceptual "starting young compounds" graphic for the philosophy section.
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

export function About({ onBack, onHome, onEnroll, onCall }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", background: C.paper }}>
      {/* chrome — matches the other sub-pages (BookCall/Enroll): home wordmark + Back */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 6vw", maxWidth: 1100, margin: "0 auto" }}>
        <div className="disp" {...act(() => onHome && onHome())} aria-label="Build Young — home" style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-.02em", cursor: "pointer" }}>
          <Mark size={22} /> Build <span className="grad">Young</span>
        </div>
        <button className="btn" onClick={onBack} style={{ background: "transparent", color: C.muted, fontSize: 14 }}>← Back</button>
      </div>

      {/* philosophy + founder (moved verbatim from the landing page) */}
      <section style={{ position: "relative", overflow: "hidden", background: C.paper2, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
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
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1000, margin: "0 auto", padding: "30px 6vw 34px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#efe7f5", color: C.gold, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", padding: "6px 12px", borderRadius: 4, marginBottom: 14 }}><Sparkles size={13} /> The bigger picture</div>
            <h1 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>More than <span className="grad-warm">money</span></h1>
            <div style={{ width: 64, height: 4, borderRadius: 2, margin: "12px auto 0", background: `linear-gradient(90deg, ${C.green}, ${C.turq}, ${C.pink})` }} />
          </div>
          <p style={{ fontSize: 21, lineHeight: 1.5, marginTop: 18, maxWidth: 760, marginLeft: "auto", marginRight: "auto", textAlign: "center", color: C.ink }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 28, alignItems: "center", marginTop: 22 }}>
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
          <Card style={{ padding: 28, marginTop: 24, display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <img src={CONFIG.founderPhoto || SUNIL_PHOTO} alt="Sunil Garg" style={{ width: 128, height: 128, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
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

          {/* closing CTA — keep the conversion path on the story page */}
          <div style={{ textAlign: "center", marginTop: 30 }}>
            <div className="disp" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.01em" }}>Ready to start building?</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              {onEnroll && <button className="btn" onClick={() => onEnroll()} style={{ background: C.emerald, color: "#fff", padding: "14px 28px", borderRadius: 4, fontSize: 16 }}>Pick a batch & enroll <ArrowRight size={16} style={{ verticalAlign: "-2px" }} /></button>}
              {onCall && <button className="btn" onClick={onCall} style={{ background: "transparent", color: C.ink, padding: "14px 26px", borderRadius: 4, fontSize: 16, border: `1.5px solid ${C.ink}` }}>Talk to us</button>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
