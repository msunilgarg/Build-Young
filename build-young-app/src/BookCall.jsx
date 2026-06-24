import { useState } from "react";
import { Check, Video, Mail, Linkedin } from "lucide-react";
import { C, SUNIL_PHOTO } from "./theme.js";
import { Card, Mark, Pill, act, PageBackdrop } from "./ui.jsx";
import { CONFIG, track, validEmail, markCallBooked } from "./lib.js";
import { WhyStrip } from "./WhyStrip.jsx";

// Free 15-min intro call booking; sets the session call-booked flag for the funnel branch.
// Both paths fire `call_booked` + markCallBooked(): the in-app slot picker on "Book my call", and
// the external Calendly link on click-through (else a real Calendly link would track nothing and the
// "Calls booked" stat + call→enroll attribution would be stuck at 0).

const CALL_SLOTS = ["Mon · 5:00 PM PT", "Tue · 5:00 PM PT", "Wed · 5:00 PM PT", "Thu · 5:00 PM PT", "Fri · 5:00 PM PT", "Sat · 5:00 PM PT"];

export function BookCall({ onBack, onHome, onEnroll }) {
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
                  <a className="btn" href={CONFIG.calendlyUrl} target="_blank" rel="noopener noreferrer" onClick={() => { markCallBooked(); track("call_booked", {}); }} style={{ display: "block", textAlign: "center", textDecoration: "none", background: A, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, fontWeight: 600 }}>Pick a time on our calendar →</a>
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
                    <button className="btn" disabled={!(slot && name.trim() && validEmail(email))} onClick={() => { markCallBooked(); track("call_booked", {}); setDone(true); }} style={{ width: "100%", marginTop: 20, background: (slot && name.trim() && validEmail(email)) ? A : C.line, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, cursor: (slot && name.trim() && validEmail(email)) ? "pointer" : "not-allowed" }}>Book my call →</button>
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
