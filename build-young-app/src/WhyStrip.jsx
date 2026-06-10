import { useState } from "react";
import { C } from "./theme.js";
import { act } from "./ui.jsx";
import { track, HESITATION_REASONS } from "./lib.js";

// Decision-point social proof shared by the Enroll + BookCall pages: the builder-era quote
// strip (WhyStrip) and the 'what's holding you back?' chips (HesitationStrip).

const WHY_STATS = [
  { quote: "The hottest new programming language is English.", who: "Andrej Karpathy", role: "AI researcher, Anthropic", src: "@karpathy, 2023", url: "https://x.com/karpathy/status/1617979122625712128" },
  { quote: "A one-person billion-dollar company would have been unimaginable without AI — and now it will happen.", who: "Sam Altman", role: "OpenAI CEO", src: "Fortune, 2024", url: "https://fortune.com/2024/02/04/sam-altman-one-person-unicorn-silicon-valley-founder-myth/" },
  { quote: "Everyone is a programmer — now, you just have to say something to the computer.", who: "Jensen Huang", role: "NVIDIA CEO", src: "Computex, 2023", url: "https://www.cnbc.com/2023/05/30/everyone-is-a-programmer-with-generative-ai-nvidia-ceo-.html" },
];
export function WhyStrip() {
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
export function HesitationStrip() {
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
