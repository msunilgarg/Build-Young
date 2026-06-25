import React, { useState } from "react";
import { Check, Mail } from "lucide-react";
import { C } from "./theme.js";
import { Mark, act } from "./ui.jsx";
import { validEmail, postJson } from "./lib.js";

// The FAQ page (route: /faq). Moved off the landing page to cut its scroll height; the landing keeps
// a short "Questions?" teaser linking here. KEEP THE QUESTIONS IN SYNC with the FAQPage JSON-LD in
// index.html (that block is what search engines read; this is what visitors read).
export const FAQ_ITEMS = [
  { q: "Who is Build Young for?", a: "Build Young is for high school students. A parent or guardian completes enrollment on the student's behalf. No prior experience is needed." },
  { q: "Does my teen need to know how to code?", a: "No. Students build their product using AI tools, so they don't need to know how to code beforehand. They learn to build by building, with AI as the tool." },
  { q: "What will my teen actually do in the program?", a: "Over 12 weeks they find a real problem, build a real product with AI, take it live, grow it with a funnel and metrics, and go get their first customers — finishing with a capstone presentation that parents are welcome to join." },
  { q: "What does “going live” and “getting customers” mean?", a: "Going live means publishing the product they built so it's a real, working thing anyone on the internet can use — not just a class exercise. Getting customers means putting it in front of real people who want it: they learn go-to-market — a simple funnel, metrics, and outreach — to land their first real users, and ideally their first paying ones." },
  { q: "Will this help with college applications?", a: "It gives your teen something real to show for it — a live product they built, often with real users, and a genuine founder's story to tell in essays, the activities list, and interviews. Colleges value initiative and real-world impact, and 'I found a problem, built a product with AI, and went after my first customers' is a specific, memorable story most applicants can't tell. We're honest about what it is: real evidence and a story to point to, not a guarantee of admission — and it works precisely because your teen built something they genuinely cared about, not to pad a résumé." },
  { q: "How long is the program and what is the schedule?", a: "It runs 12 weeks, meeting twice a week (about 3 hours total per week), 100% live online over Zoom. Families choose a cohort that meets either Mondays & Wednesdays or Tuesdays & Thursdays." },
  { q: "What does a class actually look like?", a: "Picture 90 minutes, live on Zoom, capped at 10 students — a studio, not a lecture (no slides). We open with a quick goal for the day (about 5 minutes), then you spend most of class actually building your own product with AI while we go around coaching: looking at what you're making, helping you get unstuck, and pushing you to make it better. People share screens, show their progress, and trade ideas with the group, and we wrap by lining up what's next. You're building the whole time — not watching — and you walk out of every class with your product further along than when you joined. Just bring your laptop and your questions." },
  { q: "Is there homework, and what's expected between classes?", a: "Yes, but it's real work, not busywork. A couple of days before each class students get a short heads-up on what to prepare, and between the two weekly sessions they keep building their own product. Plan on the two ~90-minute live classes plus a few hours of building on their own each week — the more they put in, the more they walk away with." },
  { q: "How much does it cost, and what is the refund policy?", a: "Tuition is $999. You get a full refund if you cancel before the cohort starts, and a flat 75% refund through the first week of class; it is non-refundable after that." },
  { q: "Are there any costs beyond tuition?", a: "A little. During the build weeks your child will need Claude Pro (about $20/month) — the AI they build with; a free account won't keep up. Everything else we use (GitHub, Vercel, email) is free. Later, a custom web address (domain) is optional — about $10–20/year if you want one." },
  { q: "Do you offer scholarships?", a: "Sometimes — it depends on funding. When we have sponsorship to cover seats, we open a limited number of scholarship places for that cohort, awarded by application, so it isn't offered every time. When it is, you'll see a scholarship cohort on the enrollment page. If cost is a barrier, tell us who you are and what you'd build — we read every application ourselves, and selected students get the full program, the same classes, dashboard, and support, at no cost." },
  { q: "Is there really a way to earn the tuition back?", a: "Yes — the First-year builder prize. In each cohort, the first student to land a real, paying customer for what they built within a year of enrolling earns their tuition back. It takes proof of the payment and a short, parent-approved video. It's how we reward builders who take it all the way to a real sale." },
  { q: "Can we talk to someone before enrolling?", a: "Yes — every family can book a free 15-minute call with us before enrolling. No pitch, no pressure." },
];

export function Faq({ onBack, onHome, onCall }) {
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
    <div style={{ position: "relative", minHeight: "100vh", background: C.paper }}>
      {/* chrome — matches the other sub-pages (BookCall/Enroll/About): home wordmark + Back */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 6vw", maxWidth: 760, margin: "0 auto" }}>
        <div className="disp" {...act(() => onHome && onHome())} aria-label="Build Young — home" style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-.02em", cursor: "pointer" }}>
          <Mark size={22} /> Build <span className="grad">Young</span>
        </div>
        <button className="btn" onClick={onBack} style={{ background: "transparent", color: C.muted, fontSize: 14 }}>← Back</button>
      </div>

      <section style={{ maxWidth: 760, margin: "0 auto", padding: "8px 6vw 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h1 className="disp" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Questions parents ask</h1>
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
    </div>
  );
}
