import { useState, useEffect, useRef } from "react";
import { TrendingUp, LineChart as LineIcon, GraduationCap, Check, Lock, Newspaper, Sparkles, Video, Mail, BookOpen, Users, Activity, Award, Calendar, Flag } from "lucide-react";
import { C, fmt } from "./theme.js";
import { Card, Mark, Pill, act, PageBackdrop } from "./ui.jsx";
import { CONFIG, track, useCohorts, sendEmail, postJson, AUTH } from "./lib.js";
import { cohortStartInfo, classDateLabel, effectivePosition, refundFor, REFUND_WEEKS, REFUND_WINDOW, canWithdrawNow } from "./courseDates.js";
import { WEEKS } from "./course.js";
import { OBJECTIVES } from "./courseState.js";
import { withdrawalEmail, advance, CANCEL_REASONS, cancelReasonLabel } from "./engine.js";
import { CertificateCard } from "./Certificate.jsx";
import { SCENARIO_GROUPS } from "./scenarios.js";

// The post-enrollment student dashboard: overview, per-week course hub (build activities,
// funnel/reflection panels, go-live checklist, capstone showcase), withdrawal flow, and the
// certificate card. Self-contained; App renders <Platform> with the state + nav callbacks.

const PREREQS = [
  { id: "computer", title: "A laptop or desktop", when: "Day one", why: "You'll be writing, building, and checking your app — much easier on a real keyboard and screen than a phone or tablet. A modern web browser and a steady internet connection too.", },
  { id: "github", title: "A free GitHub account", when: "Lesson 3", build: true, why: "Sign up for this one first — it's how you'll sign in to the other tools below, so they're one click instead of a new account each time. It's also where your code lives, with every version saved, so nothing ever gets lost.", link: "https://github.com" },
  { id: "claude", title: "A Claude account with Claude Pro, for Claude Code", when: "Lesson 3", build: true, why: "Claude Code is your AI build partner — the coding agent that writes and edits your whole app as you describe what you want (it's how this very site was built). It runs right in your browser at claude.ai/code — you sign in with your Claude account. You'll need Claude Pro (about $20/month) for real building — a free account won't keep up with a full project. A parent can set this up.", link: "https://claude.ai/code" },
  { id: "vercel", title: "A free Vercel account", when: "Lesson 3", build: true, why: "Sign in with GitHub. This is how you put your app on the internet for real people to use — it builds and hosts it for you (no installs on your computer), and gives you a free web address (like your-app.vercel.app).", link: "https://vercel.com" },
  { id: "stripe", title: "A Stripe account — a parent sets this up", when: "Lesson 5", why: "When you add payments in Lesson 5, Stripe is how your product takes real money safely — you never handle card details yourself. A parent must set it up since you're under 18 (free to start; Stripe takes a small fee per sale).", link: "https://stripe.com" },
  { id: "resend", title: "A free Resend account — for sending email", when: "Lesson 6", why: "In Lesson 6 you make your product real, and most real products send email — a welcome note, a receipt, a password reset. Resend is the tool that sends those for you, simply and safely (it's what Build Young uses). The free plan is plenty for the course; a parent can help with sign-up.", link: "https://resend.com" },
  { id: "domain", title: "Optional — your own web address (domain)", when: "Lesson 7", why: "A free Vercel link (your-app.vercel.app) works the whole course. When you go live in Lesson 7, you can optionally BUY your app's OWN web address (like build-young.com) — usually ~$10–20/year, bought right on Vercel (where we got build-young.com).",
    links: [{ label: "Buy a domain on Vercel", url: "https://vercel.com/domains" }] },
  { id: "linkedin", title: "Recommended — a LinkedIn profile", when: "Lesson 12", why: "You finish the course with a certificate of completion. We recommend a LinkedIn profile so you can show it off — add the certificate (and the product you built) to it, where colleges and future employers can see real proof of what you can do. A parent can help you set one up.", link: "https://www.linkedin.com" },
];

/* ============================ OVERVIEW (first-login landing) ============================
 * The welcome / orientation tab. It's the DEFAULT tab until the student has started the course
 * (s.started), so someone who enrolls weeks early sees the plan, what to expect, instructions,
 * and the real start date/countdown — not a misleading "Lesson 1 of 12". */
function OverviewPanel({ s, batch, onTab, setS }) {
  const prereqs = (s && s.prereqs) || {};
  const doneCount = PREREQS.filter((p) => prereqs[p.id]).length;
  const togglePrereq = (id) => setS && setS((p) => ({ ...p, prereqs: { ...(p.prereqs || {}), [id]: !((p.prereqs || {})[id]) } }));
  const info = cohortStartInfo(batch);
  const first = (s.student.name || "").split(" ")[0] || "there";
  const sectionTitle = { fontSize: 16, fontWeight: 800, color: C.ink, margin: "0 0 8px" };
  const li = { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: C.ink2, lineHeight: 1.5, padding: "7px 0" };
  const chip = (numv, label) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,.12)", borderRadius: 10, padding: "14px 18px" }}>
      <span className="disp" style={{ fontSize: 30, fontWeight: 800, color: "#fff", lineHeight: 1, minWidth: 36 }}>{numv}</span>
      <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.82)", lineHeight: 1.3 }}>{label}</span>
    </div>
  );

  return (
    <div className="rise">
      {/* Two-column hero: welcome copy + actions on the left, the cohort stat chips stacked into
          the right (which would otherwise be empty dark space). Collapses to a single column on
          narrow screens via .enroll-grid. */}
      <Card style={{ padding: 32, marginBottom: 14, background: C.ink, border: "none" }}>
        <div style={{ display: "flex", gap: 44, alignItems: "stretch", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 440px", minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.goldLite, fontWeight: 700, letterSpacing: ".06em" }}>WELCOME TO BUILD YOUNG</div>
            <div className="disp" style={{ fontSize: 27, fontWeight: 800, marginTop: 8, color: "#fff" }}>You're in, {first}! 🎉</div>
            <div style={{ color: "rgba(255,255,255,.62)", fontSize: 13, fontWeight: 600, marginTop: 8 }}>{batch.track} · {batch.day}</div>
            <p style={{ color: "rgba(255,255,255,.78)", fontSize: 14.5, lineHeight: 1.7, marginTop: 14, maxWidth: 580 }}>
              Your <b style={{ color: "#fff" }}>{batch.track}</b> cohort {info.beforeStart ? <>{info.phrase} — <b style={{ color: "#fff" }}>{info.longDate}</b>.</> : <>is underway.</>} You'll learn to <b style={{ color: "#fff" }}>think like a founder</b> and <b style={{ color: "#fff" }}>build something real</b> — everything you need to get ready is right below.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
              <a href={batch.zoom} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <button className="btn" style={{ background: C.emeraldLite, color: "#fff", padding: "12px 20px", borderRadius: 4, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Video size={16} /> Join class on Zoom</button>
              </a>
              <button className="btn" onClick={() => onTab("course")} style={{ background: "rgba(255,255,255,.14)", color: "#fff", padding: "12px 20px", borderRadius: 4, fontSize: 14 }}>Open Course progress →</button>
            </div>
          </div>
          <div style={{ flex: "0 1 280px", display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
            {info.beforeStart && chip(info.days, `${info.days === 1 ? "day" : "days"} until your first class`)}
            {chip(12, "lessons · 3 hrs each")}
            {chip(36, "hours of live building")}
          </div>
        </div>
      </Card>

      <Card style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ ...sectionTitle, margin: 0 }}>Get set up before you build</h3>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: doneCount === PREREQS.length ? C.green : C.muted }}>{doneCount} of {PREREQS.length} done</span>
        </div>
        <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "6px 0 8px" }}>
          In your first lessons you'll build your <b>own</b> app with AI — so you need the same tools we used to build this one (all free except <b>Claude Pro</b>, ~$20/month). Tick each off as you set it up, and bring them to the class where they're needed. <span style={{ color: C.muted }}>A parent can help with sign-ups.</span>
        </p>
        {PREREQS.map((p) => {
          const checked = !!prereqs[p.id];
          return (
            <div key={p.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: `1px solid ${C.line}` }}>
              {/* Explicit checkbox (its own aria-label) rather than a wrapping <label>, so the help
                  link in the description stays independently clickable without toggling the box. */}
              <input type="checkbox" aria-label={`Mark "${p.title}" as done`} checked={checked} onChange={() => togglePrereq(p.id)} style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: C.emerald, cursor: "pointer" }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b {...act(() => togglePrereq(p.id))} style={{ fontSize: 14, cursor: "pointer", color: checked ? C.muted : C.ink, textDecoration: checked ? "line-through" : "none" }}>{p.title}</b>
                  <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: C.turq, background: "#e6f2f3", borderRadius: 999, padding: "2px 8px" }}>Needed by {p.when}</span>
                </div>
                <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, marginTop: 3 }}>
                  {p.why}
                  {p.link && <> <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, whiteSpace: "nowrap" }}>Open ↗</a></>}
                  {p.links && p.links.map((l) => <span key={l.url}> <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, whiteSpace: "nowrap" }}>{l.label} ↗</a></span>)}
                </div>
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: C.emerald, background: "#eef3f0", borderRadius: 6, padding: "10px 14px" }}>
          New to all this? Perfect — that's the whole point. You'll set up every one of these yourself, and by the end you'll have built and shipped a real app. 🚀
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <h3 style={sectionTitle}>What to expect</h3>
        <div style={li}><Sparkles size={17} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} /><span><b>Lessons 1–7 — Build &amp; launch.</b> Find a problem, write a spec, build your product with AI in four layers (core product, accounts, payments, production-ready), then take it live.</span></div>
        <div style={li}><GraduationCap size={17} color={C.emerald} style={{ flexShrink: 0, marginTop: 1 }} /><span><b>Lessons 8–10 — Learn to grow it.</b> Build a funnel into your product, read the real numbers to see what's working, then talk through product-led growth — the skills that grow a product.</span></div>
        <div style={li}><TrendingUp size={17} color={C.turq} style={{ flexShrink: 0, marginTop: 1 }} /><span><b>Lesson 11 — Prepare your capstone.</b> Pull it all together for the final presentation: polish your product and shape the story of what you built and who it's for.</span></div>
        <div style={li}><Flag size={17} color={C.gold} style={{ flexShrink: 0, marginTop: 1 }} /><span><b>Lesson 12 — Capstone.</b> Present everything — what you built, who's using it, and what you'd build next. Parents are welcome to join this final call to watch.</span></div>
        <div style={li}><Award size={17} color={C.pink} style={{ flexShrink: 0, marginTop: 1 }} /><span><b>A certificate of completion.</b> Finish the course and earn a certificate you can download and add to your LinkedIn profile.</span></div>
        <div style={li}><Award size={17} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} /><span><b>The builder prize — tuition back.</b> The first builder in your cohort to land a real paying customer within a year of enrolling gets their tuition refunded (real sale + a short video). <span style={{ color: C.muted }}>See Terms.</span></span></div>
      </Card>
    </div>
  );
}

/* ============================ BUILD PLAN (work backwards from the customer) ============================
 * Lives at the top of the Dashboard. Before building, the student picks an idea (or writes their
 * own) and writes WHO it's for + a short "press release" as if it already launched — the
 * work-backwards move. Persists in s.build (auto-saved with the rest of the sim state). */
// A fully worked Week-1 build plan — Build Young itself — so students see what "good" looks like.
const EXAMPLE_BUILD = {
  idea: "Build Young — a live program where high schoolers build a real product with AI, grow it into a business, and go get their first customers.",
  pain: `Teens aren't taught how to build something real or how the real world actually works — it's not on any test, and the free videos out there go unwatched.
Parents worry that in an AI world a degree won't be the edge — but there's no hands-on way for their kid to actually learn to build before adulthood.
The classes that exist teach coding syntax or theory — not how to take an idea, build it with AI, and put it in front of real people, which is the part that actually shapes a life.`,
  pr: `Announcing Build Young — a live program where teens build a product people would pay for, with AI as their tool, grow it into a business, and go get their first customers.

The problem: Kids leave school having never built anything real or learned how money works — and in an AI world, the edge is what you can build, not what you were credentialed to do.

How it works: Over 12 weeks, each teen builds their own product with AI, takes it live, grows it, and goes to market for their first real customers — one continuous build where mistakes are safe.

Why families love it: It's live and small-group with a standing weekly time, so "someday" becomes "done" — and kids graduate having built a real business from zero.

"My daughter went from 'I don't get money' to running her own little product and explaining compound interest at dinner." — a Build Young parent`,
  promise: `In 12 weeks, your teen builds a real product with AI and learns to grow it — finishing with a capstone they present.`,
  trueVsGoal: `True now: they build and launch a real product and learn the growth playbook (funnels, metrics). The goal — not promised in 12 weeks: real paying customers and scale. So we say it honestly — "learn to grow it," not "grow a business."`,
  productSuccess: `Real teens use it and keep coming back — and they'd be bummed if it went away. They like it enough to tell their friends, so classes keep filling up.`,
  financialSuccess: `It makes more money than it costs to run. Most new families come from people telling their friends, so we don't have to spend much to find them — and there's enough left over to keep it going and make it bigger.`,
};

// Lesson 2 "Shape the Idea": the spec — the parts the student plans now and builds one at a time over
// the weeks ahead (core product → accounts & data → payments → production-ready, plus what success
// looks like). NOTE: keep the spec week-AGNOSTIC in the UI — don't label fields with week numbers;
// the schedule is revealed week by week so it stays exciting. Worked through for Build Young as the model.
const SHAPE_EXAMPLE = {
  product: `What it is: a live, online entrepreneurship program for high schoolers, delivered as one web app. Over 12 weeks they build a real product with AI, grow it into a business, and go get their first customers. It's hands-on and a bit like a game.

What to build first (the core product):
• A marketing site that explains the program, the curriculum, the price, and the founder, and lists the upcoming cohorts to choose from.
• An enroll flow: pick a cohort, enter the student's name + email, confirm they're in high school.
• The student dashboard: a week-by-week stepper (1–12). Each week shows its lesson, that week's activity, a Zoom link, and a private notes area; weeks unlock as you reach them.
• Move through the course: hit "advance" to go to the next lesson and open its activity. Mistakes are safe — you build in a sandbox.

The "wow": the first time a teen shares a link to their live product and watches someone actually use it. Even their parents!

(This is the core product — what you build first. Write it in enough detail that it could be built from this alone. No accounts or payments yet — just the core.)`,
  accounts: `After they're set up, each student gets their own login that works on any device, with password reset. Their dashboard remembers everything that's theirs: which week they're on, their notes, their plans and spec, and their progress through the course — so they pick up right where they left off.

Use a trusted, standard sign-in — never homemade password code.`,
  payments: `Families pay tuition to enroll — a secure checkout, with no charge until they confirm. Each cohort has its own price and number of seats; paying unlocks the student's account (they get an email to set their password). Enrollment closes the day before a cohort starts.

Use a trusted checkout (like Stripe) — never handle card details yourself.`,
  production: `Emails: a welcome when they enroll, a reminder 2 days before each lesson's first class, a recap with homework after each lesson, and a certificate at the end.
Findable: the site shows up in search and looks right when someone shares the link (title, description, share image).
Safe: it checks everything people type in, keeps secret keys off the browser, and protects students' data — they're minors.`,
  success: `Here's how we'll know it's working:
Product success: real teens use it weekly and keep coming back through the whole course — they'd be bummed if it went away, and they tell friends, so cohorts keep filling.
• Active user = a student who opens their dashboard and advances their week.
• Retention = they come back week after week, not just once.
• Referral = they tell a friend who enrolls (the "magic moment" is sharing a link to their live product).
Financial success: it earns more than it costs to run, and most new families come from word of mouth — so we spend little to find them, with enough left over to keep going and make it bigger.`,
  funnel: `Build Young's funnel — the stages a family moves through (the find → try → come back journey), measured as ONE connected funnel:
1. Visited — landed on the site (FIND IT).
2. Enroll started — opened the enroll flow, or booked a free "Talk to Sunil" call (TRY IT).
3. Enrolled — paid and reserved a seat.
4. Class started → Graduated — showed up to the first class and kept coming back through all 12 weeks (COME BACK).
For each stage, show the count AND the conversion rate to the next (visited → enroll-started, enroll-started → enrolled, enrolled → graduated), so it's obvious where families drop off — with revenue (tuition − refunds) alongside.`,
};

// Lesson 3 "Make It (with AI)" is a hands-on, live build week — so the class material is just three
// durable principles to keep in mind, not a long worked example. The actionable bits (pre-reqs +
// copy-your-spec) live in the student activity below.
const MAKE_PRINCIPLES = [
  { t: "Build one layer at a time", d: "This lesson is just Layer 1 — the core product. Don't try to build the whole thing at once. Accounts (Lesson 4), payments (Lesson 5), and the production-ready polish (Lesson 6) each get their own week and their own prompt." },
  { t: "Run the loop: describe → see → taste → refine", d: "AI builds it, you look, you judge it with taste (what does GOOD look like?), you ask for the change — repeat. You don't write code; you direct it. That taste is the skill that matters most in an AI world." },
  { t: "Ship it early", d: "Put it live before it's perfect (free, one click on Vercel). Real people surface the real problems worth fixing — not imaginary ones." },
];

// Per-week build-activity content for weeks 4–9 (build / prioritize / funnel / scale). Each entry
// (when present) drives a principles card + copy-paste prompt via PrinciplesCard + InfraBuildPlan,
// same pattern as Lesson 3. Currently EMPTY — these weeks show the "coming soon" placeholder while
// the outline settles; content is built per week next. (Lesson 3's full build activity is separate.)
const WEEK_INFRA = {};

// Generic class-example card (the worked Build Young model the instructor presents). Generic over
// its fields so each build week can have its own. Shown by default; it's NOT the student's editor.
function ExampleCard({ subtitle, fields }) {
  const [open, setOpen] = useState(true);
  const lab = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  return (
    <div style={{ border: `1px solid ${C.emerald}`, borderRadius: 6, background: "#eef3f0", overflow: "hidden" }}>
      <button type="button" className="btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: C.emerald }}><Sparkles size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />Class example — Build Young</span>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: C.ink, marginTop: 2 }}>{subtitle}</span>
        </span>
        <span aria-hidden="true" style={{ color: C.muted, fontSize: 18, flexShrink: 0 }}>{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.emerald}33` }}>
          <div style={{ fontSize: 12.5, color: C.ink2, margin: "12px 0 4px" }}>We'll walk through this together in class — then you'll write your own below. (Yours can start rough; it'll evolve.)</div>
          {fields.map(([label, text]) => (
            <div key={label} style={{ marginTop: 12 }}>
              <span style={lab}>{label}</span>
              <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Checklist for a subset of PREREQS, with the same s.prereqs state everywhere so ticking syncs. Each
// tool shows its title, sign-up link, and why/when it's needed (matches the dashboard detail).
function PrereqChecklist({ s, setS, items, title, blurb }) {
  const prereqs = (s && s.prereqs) || {};
  const list = items || [];
  const allReady = list.every((p) => prereqs[p.id]);
  const togglePrereq = (id) => setS && setS((p) => ({ ...p, prereqs: { ...(p.prereqs || {}), [id]: !((p.prereqs || {})[id]) } }));
  return (
    <div style={{ border: `1px solid ${C.emerald}`, borderRadius: 6, background: "#eef3f0", padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>{title}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: allReady ? C.green : C.turq }}>{allReady ? "All set 🎉" : `${list.filter((p) => prereqs[p.id]).length} of ${list.length} ready`}</span>
      </div>
      {blurb && <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, margin: "5px 0 8px" }}>{blurb}</p>}
      {list.map((p) => {
        const checked = !!prereqs[p.id];
        return (
          <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
            <input type="checkbox" aria-label={`Mark "${p.title}" as done`} checked={checked} onChange={() => togglePrereq(p.id)} style={{ width: 17, height: 17, marginTop: 2, flexShrink: 0, accentColor: C.emerald, cursor: "pointer" }} />
            <span style={{ fontSize: 13, lineHeight: 1.45 }}>
              <b {...act(() => togglePrereq(p.id))} style={{ cursor: "pointer", color: checked ? C.muted : C.ink, textDecoration: checked ? "line-through" : "none" }}>{p.title}</b>
              {p.link && <> <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, whiteSpace: "nowrap" }}>Open ↗</a></>}
              {p.links && p.links.map((l) => <span key={l.url}> <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: C.emerald, fontWeight: 700, whiteSpace: "nowrap" }}>{l.label} ↗</a></span>)}
              {p.why && <span style={{ display: "block", color: C.muted, marginTop: 2 }}>{p.why}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Which week a PREREQS item is needed (from its `when`: "Lesson N" → N). "Day one" items (e.g. a
// laptop) aren't real setup tasks — they're already in class — so they return null (no per-week tab).
function prereqWeek(when) {
  const m = /week\s*(\d+)/i.exec(when || "");
  return m ? Number(m[1]) : null;
}

// The "Pre-req" tab content for a week. Every week shows the tab: the tools DUE that week (Claude/
// GitHub/Vercel in Lesson 3, Stripe Lesson 5, Resend Lesson 6, domain Lesson 7), else a short note.
function weekPrereqs(week, s, setS) {
  const due = PREREQS.filter((p) => prereqWeek(p.when) === week);
  if (due.length) {
    return <PrereqChecklist s={s} setS={setS} items={due} title="✅ Get set up for this lesson"
      blurb="Get these ready before class — a parent can help (some services need an adult). Tick each off:" />;
  }
  const firstWeek = Math.min(...PREREQS.map((p) => prereqWeek(p.when)).filter(Boolean)); // Lesson 3 (first setup)
  let msg;
  if (week < firstWeek) msg = `Nothing to set up yet — your first tools come in Week ${firstWeek}, when building starts.`;
  else if (PREREQS.some((p) => prereqWeek(p.when) > week)) msg = "Nothing new to set up this lesson — your tools carry through. A few more come as you need them in later lessons.";
  else msg = "You're all set — every tool you need is ready. ✓";
  return <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 6, padding: "12px 14px" }}>{msg}</div>;
}

// One week's content as horizontal tabs — Pre-req · What you'll learn · Class example · Your exercise.
// Empty tabs are hidden; defaults to "What you'll learn". Shared by CoursePanel + WeekPanel so they
// can't drift. Activity input lives in s (lifted), so switching tabs never loses what's typed.
const BUILD_WEEKS = new Set([3, 4, 5, 6, 8]); // the AI-build weeks (BUILD_LAYERS) — Lesson 7 "Go Live" is a checklist, not an AI build prompt
// A recurring "stretch goal" shown under the build-week exercise: the meta-skill of interrogating
// your AI tools — ask what you're not using / what you're doing the hard way. Taste applied to the
// tool itself: builders, not consumers, even in HOW they use AI.
function StretchGoal() {
  return (
    <div style={{ marginTop: 16, border: `1px dashed ${C.gold}`, borderRadius: 6, background: "#f7f4fb", padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: C.gold, marginBottom: 6 }}>⭐ Stretch goal</div>
      <p style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, margin: 0 }}>
        While you build this lesson — especially when you’re stuck or repeating yourself — ask your AI: <b style={{ color: C.ink }}>“What can you do that I’m not using? What am I doing the hard way?”</b> Try one suggestion, and bring what you learned. The gap between a good builder and a great one is usually a question you didn’t think to ask.
      </p>
    </div>
  );
}

function WeekTabs({ week, s, setState, materials }) {
  const prereq = weekPrereqs(week, s, setState);
  const learn = weekObjectivesCard(week);
  const example = weekExample(week);
  const mats = (!example && Array.isArray(materials) && materials.length)
    ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{materials.map((r, j) => <ResLink key={j} r={r} icon={BookOpen} />)}</div>
    : null;
  const _activity = weekActivity(week, s, setState, true);
  const exercise = _activity ? <>{_activity}{BUILD_WEEKS.has(week) && <StretchGoal />}</> : null;
  const tabs = [
    prereq && { id: "prereq", label: "Pre-req", node: prereq },
    learn && { id: "learn", label: "What you'll learn", node: learn },
    (example || mats) && { id: "example", label: "Class example", node: example || mats },
    exercise && { id: "exercise", label: "Your exercise", node: exercise },
  ].filter(Boolean);
  // Land on the Pre-req tab ONLY when this lesson actually has tools DUE (something to act on).
  // When the pre-req tab is just a "nothing to set up" note, skip it and land on the next tab.
  const hasDuePrereq = PREREQS.some((p) => prereqWeek(p.when) === week);
  const def = hasDuePrereq
    ? "prereq"
    : ((tabs.find((t) => t.id !== "prereq") || tabs[0] || {}).id);
  const [active, setActive] = useState(def);
  if (!tabs.length) return null;
  const cur = tabs.find((t) => t.id === active) || tabs[0];
  return (
    <div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", borderBottom: `1px solid ${C.line}`, marginBottom: 16, overflowX: "auto" }}>
        {tabs.map((t) => {
          const on = t.id === cur.id;
          return (
            <span key={t.id} aria-pressed={on} className="tab" {...act(() => setActive(t.id))}
              style={{ fontSize: 13, fontWeight: 700, color: on ? C.emerald : C.muted, padding: "8px 12px", borderBottom: `2px solid ${on ? C.emerald : "transparent"}`, marginBottom: -1, whiteSpace: "nowrap" }}>
              {t.label}
            </span>
          );
        })}
      </div>
      {cur.node}
    </div>
  );
}

// "What you'll learn this class" — the in-dashboard kickoff (replaces a slide), shown at the top of
// each lesson's activity. From OBJECTIVES (founder-editable), split into bullets. Null when empty.
function weekObjectivesCard(week) {
  const raw = (OBJECTIVES[week - 1] || "").trim();
  const items = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!items.length) return null;
  // First line is the connective thread — last lesson → this lesson → what's next — so the weeks read as
  // one story. The rest are the takeaway bullets.
  const [lead, ...bullets] = items;
  return (
    <div style={{ background: "#eef3f0", border: `1px solid ${C.emerald}`, borderRadius: 6, padding: "12px 14px", marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.ink, letterSpacing: ".02em", marginBottom: 7 }}>🎯 What you'll learn this class</div>
      <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.5, margin: "0 0 9px" }}>{lead}</p>
      {bullets.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 5 }}>
          {bullets.map((it, i) => <li key={i} style={{ fontSize: 13, color: C.ink2, lineHeight: 1.45 }}>{it}</li>)}
        </ul>
      )}
    </div>
  );
}

// The class-material example for a build week (null if that week has none yet).
function weekExample(week) {
  if (week === 1) return <ExampleCard subtitle="A worked plan — how we'd fill this in" fields={[
    ["The idea", EXAMPLE_BUILD.idea],
    ["Customer pain point(s)", EXAMPLE_BUILD.pain],
    ["Press release", EXAMPLE_BUILD.pr],
    ["Your one promise", EXAMPLE_BUILD.promise],
    ["Honest check — true now vs. the goal", EXAMPLE_BUILD.trueVsGoal],
  ]} />;
  if (week === 2) return <ExampleCard subtitle="A worked spec — how we'd fill it in for Build Young" fields={[
    ["The core product", SHAPE_EXAMPLE.product],
    ["Accounts & saved data", SHAPE_EXAMPLE.accounts],
    ["Payments", SHAPE_EXAMPLE.payments],
    ["Production-ready", SHAPE_EXAMPLE.production],
    ["What success looks like", SHAPE_EXAMPLE.success],
  ]} />;
  // Lesson 9 (metrics): explain the terms FIRST — teens won't know DAU/MAU/retention yet.
  // Lesson 8 (build the funnel) needs BOTH glossaries: the funnel concept AND the metrics it'll be
  // judged by — a student can't write a good "add tracking" prompt without understanding the metrics.
  if (week === 8) return (<>
    <GlossaryCard title="First — the funnel, in plain English" items={FUNNEL_PRIMER} />
    <div style={{ height: 14 }} />
    <GlossaryCard title="…and the metrics your funnel will track" items={METRICS_PRIMER} />
    <div style={{ height: 14 }} />
    <ExampleCard subtitle="A sample — how we'd spec the funnel for Build Young" fields={[["The funnel", SHAPE_EXAMPLE.funnel]]} />
  </>);
  if (week === 9) return <GlossaryCard title="The metrics, in plain English" items={METRICS_PRIMER} />;
  if (week === 10) return <GlossaryCard title="First — product-led growth, in plain English" items={PLG_PRIMER} />;
  // SPEC weeks (3–6) get a worked example — Build Young's own spec for that layer. Seeded growth
  // weeks (8, 10) have no separate example; their pre-filled starter prompt IS the activity.
  const bl = BUILD_LAYERS[week];
  if (bl && !bl.seed) return <ExampleCard subtitle="A sample — how we filled this in for Build Young" fields={[[bl.fieldLabel, SHAPE_EXAMPLE[bl.key]]]} />;
  return null;
}

// Plain-English glossary card — defines terms for a week before the hands-on part (e.g. Lesson 9
// metrics). Clean term — definition rows, same green class-material look.
function GlossaryCard({ title, items }) {
  return (
    <div style={{ border: `1px solid ${C.emerald}`, borderRadius: 6, background: "#eef3f0", padding: "14px 16px" }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: C.emerald }}><BookOpen size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />{title}</div>
      <div style={{ marginTop: 10, display: "grid", gap: 9 }}>
        {items.map((it, i) => (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.5 }}><b style={{ color: C.ink }}>{it.t}</b> <span style={{ color: C.ink2 }}>— {it.d}</span></div>
        ))}
      </div>
    </div>
  );
}
const METRICS_PRIMER = [
  { t: "Active users (DAU / MAU)", d: "how many different people actually use your product — DAU is in a day, MAU in a month. Signing up once doesn't count; coming back and using it does." },
  { t: "Retention", d: "of the people who try it, how many come back later (the next day, a week on). Low retention means it isn't useful enough yet — the number that matters most." },
  { t: "Funnel & drop-off", d: "the path people take — found it → tried it → came back. You lose some at each step; the biggest drop is your bottleneck, so fix that first." },
  { t: "North-star metric", d: "the one number that best means “it's working” for YOUR product — tie it to the success you defined in your spec." },
];
const FUNNEL_PRIMER = [
  { t: "The funnel", d: "the path a customer takes — find it → try it → come back. It's called a funnel because you lose some people at each step (wide at the top, narrow at the bottom)." },
  { t: "Find it (acquisition)", d: "how people first discover your product — a shared link, a search, or a friend telling them about it." },
  { t: "Try it (the “aha”)", d: "the first time a new user hits the magic moment and gets why it's good. The faster they get there, the more of them stick around." },
  { t: "Come back (retention)", d: "do they return after the first visit? A product people come back to is one that's actually working." },
  { t: "Drop-off", d: "at each step, some people leave. The step where you lose the most is your bottleneck — fix that one first." },
];
const PLG_PRIMER = [
  { t: "Product-led growth (PLG)", d: "when the product itself brings in new users — people share it because it's genuinely good, so you don't have to pay for ads." },
  { t: "Sharing / virality", d: "an easy, natural way for a happy user to invite a friend or show others — a share link, an invite, or results other people can see." },
  { t: "Network effect", d: "the product gets better the more people use it (like a group chat that's more useful once your friends are in it)." },
  { t: "Referral", d: "one user brings in another. The best products make sharing genuinely helpful to the person sharing, not just to you." },
];
// Lessons 9 (analyze your real metrics) and 10 (discuss product-led growth) are NO-PROMPT weeks — the
// student reads/reflects and jots answers (saved in s.reflect[week]); there's nothing to build with AI.
// Lesson 10 (discuss product-led growth) is a NO-PROMPT reflection week — fixed discussion prompts the
// student jots answers to (saved in s.reflect[10]). (Lesson 9 is the FunnelScenarios exercise — see below.)
const REFLECT_WEEKS = {
  10: {
    intro: "This lesson is a discussion — no building. Product-led growth means the product grows itself: people share it because it's genuinely good, so you don't have to pay to find every new user. We'll talk through the topics below as a group, then you jot what it means for YOUR product.",
    topics: [
      "Think of the last app you started using because a friend told you about it. Why did your friend bother to share it — what did THEY get out of telling you?",
      "Why do some products spread on their own while others have to buy ads to get noticed? What's different about the ones that spread?",
      "Name a product that gets better the more of your friends are on it (a group chat, a game, a shared doc). Would you still use it if you were the only one there? (That's a network effect.)",
      "What actually makes YOU share something — bragging rights, helping a friend, a reward, or it just being fun? Which reason is strongest?",
      "Some products are impossible to use alone — sharing IS the product. Others just bolt a \"refer a friend\" bonus on top. Which kind grows faster, and why?",
      "When does growth start to feel spammy or manipulative? Where's the line between a product people love to share and one that nags them into it?",
    ],
    fields: [
      { key: "shareWhy", label: "Why would someone share YOUR product?", ph: "After the discussion — what's the real reason a happy user would tell a friend or invite someone?" },
      { key: "shareWhen", label: "The natural moment to share", ph: "Where in your product is the natural point to invite a friend or show a result?" },
      { key: "idea", label: "Your best PLG idea to try", ph: "The one product-led-growth idea you'd build next (a share link, an invite, results others can see…)." },
    ],
  },
  11: {
    intro: "No building this lesson — get ready for your capstone. Next lesson you present what you built to family and friends, so use this lesson to pull the story together and practice it.",
    fields: [
      { key: "whatBuilt", label: "What you built — in one line", ph: "If you had ten seconds: what is it, and who is it for?" },
      { key: "proud", label: "What you're proudest of", ph: "The part of the build, the journey, or what people did with it that you most want to show off." },
      { key: "whoUses", label: "Who's using it", ph: "Who tried it or signed up — friends, family, a class, a team? Any numbers or quotes you can share." },
      { key: "next", label: "What you'd build next", ph: "If you kept going, what's the next thing you'd add or try?" },
    ],
  },
};
function ReflectionPanel({ week, s, setS, bare }) {
  const cfg = REFLECT_WEEKS[week];
  const data = (s.reflect && s.reflect[week]) || {};
  const setField = (k, v) => setS((p) => ({ ...p, reflect: { ...(p.reflect || {}), [week]: { ...((p.reflect || {})[week] || {}), [k]: v } } }));
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 };
  const inner = (
    <>
      <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "0 0 14px" }}>{cfg.intro} <span style={{ color: C.muted }}>Saved automatically.</span></p>
      {cfg.topics && (
        <div style={{ border: `1px solid ${C.emerald}`, borderRadius: 6, background: "#eef3f0", padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: C.emerald }}><Users size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />Topics we'll discuss in class</div>
          <ol style={{ margin: "10px 0 0", paddingLeft: 20, display: "grid", gap: 9 }}>
            {cfg.topics.map((t, i) => (
              <li key={i} style={{ fontSize: 13, lineHeight: 1.5, color: C.ink2 }}>{t}</li>
            ))}
          </ol>
        </div>
      )}
      {cfg.fields.map((f) => (
        <label key={f.key} style={{ display: "block", marginBottom: 12 }}>
          <span style={labelStyle}>{f.label}</span>
          <textarea aria-label={f.label} value={data[f.key] || ""} onChange={(e) => setField(f.key, e.target.value)} rows={2} placeholder={f.ph} style={inputStyle} />
        </label>
      ))}
    </>
  );
  return bare ? inner : <Card style={{ padding: 20, marginBottom: 12 }}>{inner}</Card>;
}

// ===== Lessons 8–9: the funnel the student tracks, then reading it =====
// Lesson 8 (FunnelStages): the student lists the steps they track in their funnel (top → bottom),
// saved to s.funnelStages so Lesson 9 can use the student's OWN labels.
// Lesson 9 (FunnelScenarios): a NO-BUILD analysis week. We render a few PRACTICE funnels (modeled, not
// live) built from those stages, each shaped to tell a different story (weak activation, weak
// retention, low traffic, healthy). For each, the student writes what the data is telling them, then
// reveals the system's read to check themselves. Saved in s.reflect[9] = { notes: { scenarioId } }.
const DEFAULT_FUNNEL_STAGES = ["Visited", "Tried it", "Came back"];
// Cleaned, ordered funnel stages for this student (falls back to a sensible default funnel).
function funnelStagesOf(s) {
  const raw = (s && Array.isArray(s.funnelStages)) ? s.funnelStages.map((x) => (x || "").trim()).filter(Boolean) : [];
  return raw.length >= 2 ? raw.slice(0, 5) : DEFAULT_FUNNEL_STAGES;
}
// Tiny stable PRNG seeded from a string (same numbers every visit, different per student/scenario).
function seededRng(seedStr) {
  let h = 2166136261 >>> 0;
  const str = seedStr || "build-young-demo";
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
}
// Each scenario: a base top-of-funnel count + the step-to-step conversion rates that shape the story
// (rates() returns n−1 rates for n stages), and a model answer written against the student's labels.
// NOTE: titles are intentionally NEUTRAL ("Funnel 1/2/3/4" in the UI) — never name the diagnosis,
// or it gives away the exercise. The `answer` is only shown on the student's "show the read" reveal.
const FUNNEL_SCENARIOS = [
  { id: "activation", base: 820,
    rates: (n) => [0.18, ...Array(Math.max(0, n - 2)).fill(0.72)],
    answer: (st) => `Tons of people reach “${st[0]},” but almost none get to “${st[1]}.” The leak is right at the start — that's an activation problem: the first step isn't clear or rewarding enough, fast enough. Fix the very first thing a new user does so they hit the “aha” sooner. Everything downstream is fine; it's just starved because so few get past step one.` },
  { id: "retention", base: 600,
    rates: (n) => [...Array(Math.max(0, n - 2)).fill(0.68), 0.22],
    answer: (st) => `People move through the funnel fine, but hardly anyone reaches “${st[st.length - 1]}” — they don't come back. That's a retention problem, the hardest and most important one. A product people use once isn't working yet. Give them a reason to return before you spend a cent getting more people in.` },
  { id: "acquisition", base: 110,
    rates: (n) => Array(Math.max(1, n - 1)).fill(0.72),
    answer: (st) => `The conversions are strong all the way down — the people who find it stick. The only problem is the top: too few ever reach “${st[0]}.” That's an acquisition problem, and a good one to have — the product works, you just need more of the right people to find it (a clearer landing page, sharing, word of mouth).` },
  { id: "healthy", base: 680,
    rates: (n) => Array(Math.max(1, n - 1)).fill(0.6),
    answer: (st) => `No single step is hemorrhaging people, and the numbers hold up top to bottom — this funnel is working. There's no fire to put out, so the move is to grow: keep more people arriving at “${st[0]},” and chip away at whichever step has the biggest drop to make a good thing better.` },
];
function scenarioCounts(sc, n, rnd) {
  const base = Math.max(12, Math.round(sc.base * (0.9 + rnd() * 0.2)));
  const rates = sc.rates(n);
  const counts = [base];
  for (let i = 0; i < n - 1; i++) counts.push(Math.max(1, Math.round(counts[i] * (rates[i] != null ? rates[i] : 0.6))));
  return counts;
}

// Lesson 8 add-on: the student lists the steps in their funnel — used to build Lesson 9's practice data.
function FunnelStages({ s, setS, bare }) {
  const stages = (s && Array.isArray(s.funnelStages) && s.funnelStages.length) ? s.funnelStages : ["", "", ""];
  const write = (next) => setS((p) => ({ ...p, funnelStages: next }));
  const update = (i, v) => write(stages.map((x, idx) => (idx === i ? v : x)));
  const add = () => write([...stages, ""]);
  const remove = (i) => write(stages.filter((_, idx) => idx !== i));
  const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink };
  const inner = (
    <>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, marginBottom: 4 }}>📊 The funnel you'll track</div>
      <p style={{ fontSize: 13, color: C.ink2, lineHeight: 1.55, margin: "0 0 12px" }}>
        List the metrics you're tracking, <b>top to bottom</b> — from the moment someone finds your product to the moment they come back. Have your AI count people at each step. <b>We'll use these next lesson</b> to read your numbers. <span style={{ color: C.muted }}>Saved automatically.</span>
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {stages.map((st, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.turq, width: 18, flexShrink: 0 }}>{i + 1}</span>
            <input aria-label={`Funnel metric ${i + 1}`} value={st} onChange={(e) => update(i, e.target.value)} placeholder={DEFAULT_FUNNEL_STAGES[i] || "e.g. Made a booking"} style={inputStyle} />
            {stages.length > 2 && <span {...act(() => remove(i))} title="Remove" style={{ color: C.muted, fontSize: 16, lineHeight: 1, cursor: "pointer", padding: "2px 4px" }}>×</span>}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 9 }}>
        <span {...act(add)} style={{ fontSize: 12.5, fontWeight: 700, color: C.emerald, cursor: "pointer" }}>+ Add a metric</span>
      </div>
    </>
  );
  return bare ? inner : <Card style={{ padding: 20, marginBottom: 12 }}>{inner}</Card>;
}

// Lesson 9: read several practice funnels built from the student's own stages, then reveal the answer.
function FunnelScenarios({ s, setS, bare }) {
  const stages = funnelStagesOf(s);
  const seed = (s.student && (s.student.email || s.student.name)) || "demo";
  const notes = ((s.reflect && s.reflect[9]) || {}).notes || {};
  const writeNote = (id, v) => setS((p) => {
    const r9 = (p.reflect && p.reflect[9]) || {};
    return { ...p, reflect: { ...(p.reflect || {}), 9: { ...r9, notes: { ...(r9.notes || {}), [id]: v } } } };
  });
  const [shown, setShown] = useState({});
  const [extra, setExtra] = useState([]);   // agent- or locally-generated "advanced" funnels
  const [loading, setLoading] = useState(false);
  const [genNote, setGenNote] = useState("");
  const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 };

  // One funnel card — shared by the built-in scenarios and the agent/local "advanced" ones.
  const funnelCard = (rkey, label, counts, answerText) => {
    const c0 = counts[0] || 1;
    const convs = counts.map((c, i) => (i === 0 ? null : pctOf(c, counts[i - 1] || 1)));
    let neck = 1; for (let i = 2; i < convs.length; i++) if ((convs[i] != null ? convs[i] : 100) < (convs[neck] != null ? convs[neck] : 100)) neck = i;
    const neckActive = convs.length > 1 && convs[neck] != null && convs[neck] < 40;
    const open = !!shown[rkey];
    return (
      <div key={rkey} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: "14px 16px", background: C.card }}>
        <div className="disp" style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: "0 0 12px" }}>{label}</div>
        <div style={{ display: "grid", gap: 9 }}>
          {stages.map((name, i) => {
            const isNeck = neckActive && i === neck;
            return (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                  <span style={{ fontSize: 12.5, color: C.ink }}><b>{name}</b></span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{(counts[i] != null ? counts[i] : 0).toLocaleString()}{convs[i] != null && <span style={{ color: isNeck ? C.rust : C.muted, fontWeight: 600 }}> · {convs[i]}% of prev</span>}</span>
                </div>
                <div style={{ height: 22, borderRadius: 6, background: C.paper2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: Math.max(5, pctOf(counts[i] || 0, c0)) + "%", borderRadius: 6, background: isNeck ? C.rust : C.turq, opacity: isNeck ? 0.95 : 0.8 }} />
                </div>
              </div>
            );
          })}
        </div>
        <label style={{ display: "block", marginTop: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>What is this funnel telling you?</span>
          <textarea aria-label={`What is ${label} telling you?`} value={notes[rkey] || ""} onChange={(e) => writeNote(rkey, e.target.value)} rows={2} placeholder="Where do people drop off, what does that mean, and what would you do about it?" style={inputStyle} />
        </label>
        <button onClick={() => setShown((p) => ({ ...p, [rkey]: !p[rkey] }))} aria-expanded={open} className="btn" style={{ marginTop: 8, background: "transparent", border: "none", color: C.emerald, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "2px 0" }}>
          {open ? "Hide the answer ▴" : "Show the system's read ▾"}
        </button>
        {open && (
          <div style={{ marginTop: 8, background: "#eef3f0", border: `1px solid ${C.green}`, borderRadius: 6, padding: "11px 13px", fontSize: 13, color: C.ink2, lineHeight: 1.55 }}>
            {answerText}
          </div>
        )}
      </div>
    );
  };

  // Local fallback (when the agent isn't configured): two subtler patterns over the student's stages.
  const localAdvanced = () => {
    const n = stages.length;
    const rnd = seededRng(seed + ":adv:" + (extra.length + 1));
    const mk = (base, rates) => { const c = [Math.round(base)]; for (let i = 0; i < n - 1; i++) c.push(Math.max(1, Math.round(c[i] * (rates[i] != null ? rates[i] : 0.6)))); return c; };
    const mid = Math.min(Math.max(1, Math.floor((n - 1) / 2)), n - 2);
    const leaky = Array(Math.max(1, n - 1)).fill(0.72); if (n - 1 > 0) leaky[mid] = 0.22;
    const spike = Array(Math.max(1, n - 1)).fill(0.62); if (n - 1 > 0) spike[n - 2] = 0.28;
    return [
      { counts: mk(480 + Math.round(rnd() * 320), leaky), answer: `People start strong and a fair number come back, but you lose a big chunk in the middle — around “${stages[Math.min(mid + 1, n - 1)]}.” A drop buried in the middle is easy to miss when you only glance at the top and bottom. Find what trips people up at that exact step and smooth it.` },
      { counts: mk(680 + Math.round(rnd() * 320), spike), answer: `A healthy crowd makes it most of the way, then falls off right at “${stages[n - 1]}.” The top of your funnel is doing its job; the last mile isn't. Make the final step easier, or give people a clear reason to finish.` },
    ];
  };

  const simulate = async () => {
    setLoading(true); setGenNote("");
    let got = [];
    try {
      const r = await fetch("/api/funnel?resource=scenarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stages, level: "advanced" }) });
      const d = r.ok ? await r.json() : {};
      got = Array.isArray(d.scenarios) ? d.scenarios.filter((x) => x && Array.isArray(x.counts) && x.counts.length === stages.length && x.answer) : [];
    } catch { got = []; }
    if (got.length) setGenNote("agent");
    else { got = localAdvanced(); setGenNote("local"); }
    setExtra((prev) => [...prev, ...got]);
    setLoading(false);
  };

  const inner = (
    <>
      <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "0 0 8px" }}>
        Nothing to build this lesson — <b>read the numbers</b>. These funnels are built from <b>the funnel you shipped last lesson</b> and the metrics <b>you</b> chose to track — your own product, not a generic example. Each shows a different story your numbers could tell. For each, work out what's going on, write it down, then reveal the system's read to check yourself. <span style={{ color: C.muted }}>(In real life these come straight from your own analytics — Vercel + the funnel you built last lesson.) Saved automatically.</span>
      </p>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: C.gold, background: "#fbeede", border: `1px solid ${C.goldLite}`, borderRadius: 99, padding: "3px 10px", marginBottom: 6 }}>Practice data · modeled, not live</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Your funnel: {stages.join(" → ")}</div>
      <div style={{ display: "grid", gap: 16 }}>
        {FUNNEL_SCENARIOS.map((sc, idx) => funnelCard(sc.id, `Funnel ${idx + 1}`, scenarioCounts(sc, stages.length, seededRng(seed + ":" + sc.id)), sc.answer(stages)))}
        {extra.map((sc, i) => funnelCard("adv-" + i, `Funnel ${FUNNEL_SCENARIOS.length + i + 1}`, sc.counts || [], sc.answer || ""))}
      </div>
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <button onClick={simulate} disabled={loading} className="btn" style={{ background: loading ? C.line : C.emerald, color: "#fff", padding: "10px 18px", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>
          {loading ? "Generating…" : "✨ Simulate more advanced scenarios"}
        </button>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>
          {genNote === "agent" ? "Fresh, harder funnels generated for your own metrics." : genNote === "local" ? "Generated from your metrics — your instructor reviews tougher cases live in class." : "Harder, less-obvious funnels, built from your own metrics."}
        </div>
      </div>
    </>
  );
  return bare ? inner : <Card style={{ padding: 20, marginBottom: 12 }}>{inner}</Card>;
}

// A short, numbered principles card — the plain-language class material for the hands-on build
// weeks (3–6). Same look as the green class-example card, but a quick "things to remember" list.
function PrinciplesCard({ title, items }) {
  return (
    <div style={{ border: `1px solid ${C.emerald}`, borderRadius: 6, background: "#eef3f0", padding: "14px 16px" }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: C.emerald }}><Sparkles size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />{title}</div>
      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {items.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 999, background: C.emerald, color: "#fff", fontSize: 12, fontWeight: 800, display: "grid", placeItems: "center" }}>{i + 1}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{p.t}</div>
              <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, marginTop: 2 }}>{p.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// The student's activity component for a build week (null if none yet).
function weekActivity(week, s, setState, bare) {
  if (week === 1) return <BuildPlan s={s} setS={setState} bare={bare} />;
  if (week === 2) return <ShapePlan s={s} setS={setState} bare={bare} />;
  if (week === 7) return <GoLiveChecklist s={s} setS={setState} bare={bare} />; // Go Live = an editable checklist, not a prompt
  // Lesson 8 = build the funnel (BuildLayer) PLUS list the steps you'll track (FunnelStages, used in wk 9).
  if (week === 8) return <>{<BuildLayer week={8} s={s} setS={setState} bare={bare} />}{<FunnelStages s={s} setS={setState} bare={bare} />}</>;
  if (week === 9) return <FunnelScenarios s={s} setS={setState} bare={bare} />; // read practice funnels built from the student's stages
  if (REFLECT_WEEKS[week]) return <ReflectionPanel week={week} s={s} setS={setState} bare={bare} />; // wk 10 (discuss) — no prompt
  if (BUILD_LAYERS[week]) return <BuildLayer week={week} s={s} setS={setState} bare={bare} />;
  return null;
}

// Lesson 7 "Go Live" is a configure-and-verify task, not a build prompt — so it's an EDITABLE checklist.
// Default items (grouped, each with a "how to do it") cover any app; the student ticks them off and
// adds/edits/removes anything specific to their product. Saved in s.golive.
const GO_LIVE_DEFAULT = [
  { s: "It's actually live", t: "Live in production (not a preview link)", h: "Vercel → your project → Deployments: the newest one is tagged Production. Open its URL." },
  { s: "It's actually live", t: "The 🔒 padlock (HTTPS) works", h: "Open the site — the browser shows a padlock. Vercel adds it automatically once a domain is attached." },
  { s: "It's actually live", t: "Works on a phone and a computer", h: "Open it on your phone, and drag your browser narrow on desktop — nothing should overflow or break." },
  { s: "Your secrets are safe", t: "Every secret key is in environment variables", h: "Vercel → Settings → Environment Variables — never in your code or the browser." },
  { s: "Your secrets are safe", t: "No secret was committed to GitHub", h: "Search the repo for sk_, secret, key. If a real one's there, remove it, rotate it, and add .env to .gitignore." },
  { s: "If your app takes payments", t: "Stripe switched to LIVE keys (a parent helps)", h: "Stripe → turn Test mode OFF → Developers → API keys → put the live keys into Vercel env vars." },
  { s: "If your app takes payments", t: "A real purchase charges AND unlocks what it should", h: "Buy something yourself for real, confirm it works, then refund it." },
  { s: "If your app has logins", t: "Sign up, log in, log out all work", h: "Do all three in an incognito window with a fresh email." },
  { s: "If your app has logins", t: "Password reset works", h: "Trigger a reset — the email arrives and the new password works." },
  { s: "If your app sends email", t: "Emails send from a verified domain", h: "Your email tool (e.g. Resend) → Domains → add + verify yours; it should show 'delivered'." },
  { s: "Findable & trustworthy", t: "The link preview looks right when shared", h: "Paste your URL into a chat — title, description, image should show. Set <title>, meta description, og:image in your HTML head." },
  { s: "Findable & trustworthy", t: "A privacy + terms page exist", h: "Simple /privacy and /terms pages — especially if you take data or money." },
  { s: "Works for real customers", t: "You tested the whole flow as a brand-new user", h: "Incognito window, fresh account, start to finish with zero shortcuts." },
  { s: "Works for real customers", t: "Bad input doesn't crash it", h: "Try empty fields, huge text, emoji — it should cope, not show a code error." },
  { s: "Works for real customers", t: "Basic analytics are on", h: "Vercel → Analytics tab (enable it), or add a privacy-friendly snippet." },
  { s: "Go / no-go", t: "A friend can sign up + use it with zero help", h: "Hand it to someone who's never seen it. If they get stuck, fix that before you call it live." },
];

function GoLiveChecklist({ s, setS, bare }) {
  const list = (s.golive && s.golive.length) ? s.golive : GO_LIVE_DEFAULT.map((x) => ({ ...x, done: false }));
  const write = (next) => setS((p) => ({ ...p, golive: next }));
  const update = (i, patch) => write(list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i) => write(list.filter((_, idx) => idx !== i));
  const add = () => write([...list, { s: "Your own checks", t: "", h: "", done: false }]);
  const reset = () => write(GO_LIVE_DEFAULT.map((x) => ({ ...x, done: false })));
  const done = list.filter((it) => it.done).length;
  const rowInput = { width: "100%", boxSizing: "border-box", fontSize: 13.5, fontWeight: 600, padding: "3px 5px", border: "1px solid transparent", borderRadius: 4, background: "transparent", fontFamily: "inherit", color: C.ink };

  let lastSection = null;
  const inner = (
    <>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: 0 }}>Go live — your launch checklist 🚀</h3>
      <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "6px 0 14px" }}>
        Going live is a handful of real-world steps, not code. Work down the list and tick each off — and <b>add, edit, or remove</b> anything specific to your product (every app's a little different). <b>{done} of {list.length} done.</b> <span style={{ color: C.muted }}>Saved automatically.</span>
      </p>
      <div style={{ border: `1px solid ${C.emerald}`, borderRadius: 6, background: "#eef3f0", padding: "8px 12px 12px" }}>
        {list.map((it, i) => {
          const header = it.s && it.s !== lastSection ? it.s : null;
          lastSection = it.s;
          return (
            <div key={i}>
              {header && <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: C.emerald, margin: "12px 0 4px" }}>{header}</div>}
              <div style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "4px 0" }}>
                <input type="checkbox" aria-label="Done" checked={!!it.done} onChange={() => update(i, { done: !it.done })} style={{ width: 16, height: 16, marginTop: 4, flexShrink: 0, accentColor: C.emerald, cursor: "pointer" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input value={it.t} onChange={(e) => update(i, { t: e.target.value })} placeholder="Your check…" aria-label="Checklist item"
                    style={{ ...rowInput, textDecoration: it.done ? "line-through" : "none", color: it.done ? C.muted : C.ink }}
                    onFocus={(e) => (e.target.style.border = `1px solid ${C.line}`, e.target.style.background = C.paper2)}
                    onBlur={(e) => (e.target.style.border = "1px solid transparent", e.target.style.background = "transparent")} />
                  {it.h && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, padding: "0 5px" }}>{it.h}</div>}
                </div>
                <span {...act(() => remove(i))} title="Remove" style={{ flexShrink: 0, color: C.muted, fontSize: 16, lineHeight: 1, cursor: "pointer", padding: "2px 4px" }}>×</span>
              </div>
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
          <span {...act(add)} style={{ fontSize: 12.5, fontWeight: 700, color: C.emerald, cursor: "pointer" }}>+ Add a check</span>
          <span {...act(reset)} style={{ fontSize: 12.5, fontWeight: 700, color: C.muted, cursor: "pointer" }}>↺ Reset to the default list</span>
        </div>
      </div>
    </>
  );
  return bare ? inner : <Card style={{ padding: 20, marginBottom: 12 }}>{inner}</Card>;
}

// The four build layers (Lessons 3–6). Each is ONE prompt that adds the next layer to the SAME app:
// core product (Lesson 3) → accounts & data (Lesson 4) → payments (Lesson 5) → production-ready (Lesson 6). The student
// writes all four in their Lesson 2 spec (s.shape); each build week shows ONLY its own layer's prompt.
const BUILD_LAYERS = {
  3: { key: "product",
    heading: "Build the core product 🛠️",
    lead: "Your spec IS your prompt — no separate writing. Run the loop: describe → see → taste → refine. Just the core for now; more comes later.",
    fieldLabel: "The core product",
    promptLabel: "What to build — the core product:",
    placeholder: "(From your Lesson 2 spec — the core product: what it is, who it's for, the main things it does, and the 'wow' moment.)",
    intro: "Please build this web app for me — just the core product to start. You write the code; I'll tell you what's good and what to change — keep it simple and tell me exactly what to do.",
    instruction: "Build just this core product — the main thing it does — with clean, simple, friendly styling. Don't add accounts or payments yet. When it's built, tell me exactly how to run it and see it in my browser. Then I'll tell you what to change. Let's go!" },
  4: { key: "accounts",
    heading: "Make it yours — accounts & saved data 🔐",
    lead: "Build this onto the product you shipped in Lesson 3 — without breaking what already works.",
    fieldLabel: "Accounts & saved data",
    promptLabel: "What to add — accounts & saved data:",
    placeholder: "(From your Lesson 2 spec — accounts & saved data: who signs in, and what's saved for each person.)",
    intro: "Please add accounts and saved data to the app I've already built. You write the code; I'll tell you what's good and what to change — don't break what already works.",
    instruction: "Use a trusted, standard sign-in — do NOT write your own password or security code. Save each user's data so they pick up where they left off. When it's done, tell me how to test signing in and that my data is saved." },
  5: { key: "payments",
    heading: "Add e-commerce — a checkout 💳",
    lead: "Add e-commerce to your product — a checkout so people can buy what you built, with real payments handled safely.",
    fieldLabel: "Payments",
    promptLabel: "What to add — payments:",
    placeholder: "(From your Lesson 2 spec — payments: what people pay for, how much, and what they get.)",
    intro: "Please add payments to the app I've already built. You write the code; I'll tell you what's good and what to change — don't break what already works.",
    instruction: "Use a trusted checkout (like Stripe) — never handle card details yourself. Unlock the paid features only after payment is confirmed. When it's done, tell me how to test a payment safely." },
  6: { key: "production",
    heading: "Make it real — production-ready ✨",
    lead: "The finishing layer on what you've built — the polish that gets it ready for real customers.",
    fieldLabel: "Production-ready",
    promptLabel: "What to make production-ready:",
    placeholder: "(From your Lesson 2 spec — production-ready: emails, being findable, and keeping data safe.)",
    intro: "Please make the app I've already built production-ready. You write the code; I'll tell you what's good and what to change — don't break what already works.",
    instruction: "Use trusted services to send emails; keep every secret key off the browser; check everything users type in; and make it findable (a clear title, description, and share image). When it's done, give me a short checklist to confirm it's ready for real users." },
  // Lesson 8 (the funnel) is the only Act-2 BUILD week. It follows the SAME spec pattern as 3–6 (no
  // `seed`): the student writes their funnel spec in s.shape.funnel and the sample (SHAPE_EXAMPLE.funnel)
  // is shown as class material; Copy wraps their spec in the connected-funnel intro + instruction.
  // (Lesson 7 "Go Live" is an editable CHECKLIST; weeks 9/10 are no-prompt reflection — REFLECT_WEEKS.)
  8: { key: "funnel",
    lead: "Make growth part of the product — a funnel so people find it, try it, and come back. Write your funnel below (the sample shows how we'd spec Build Young's); Copy turns it into a prompt.",
    fieldLabel: "The funnel",
    promptLabel: "My funnel — the steps a new visitor takes, in order:",
    placeholder: "(Your funnel — model it on the sample above: 1. FIND IT… 2. TRY IT (the \"aha\")… 3. COME BACK…)",
    intro: "Build a funnel into my app and measure it as ONE connected funnel — not as separate features.",
    instruction: "Then add simple, privacy-friendly tracking that shows the count of people at each step AND the conversion rate from one step to the next, so it's obvious where most people drop off. Keep my current styling, build it on top of what I already have without breaking anything, and tell me how to test it." },
};

// Lessons 4–6 "your turn": a short intro + the week's copy-paste prompt (editable; seeded from
// WEEK_INFRA, stored per-week in s.infra[week].prompt). Same shape as MakePlan, minus the spec
// generation — the prompt here is this lesson's GOAL, which they adapt to their own product.
function InfraBuildPlan({ s, setS, bare, week }) {
  const cfg = WEEK_INFRA[week];
  const store = (s.infra && s.infra[week]) || {};
  const [copied, setCopied] = useState(false);
  const setPrompt = (v) => setS((p) => ({ ...p, infra: { ...(p.infra || {}), [week]: { ...((p.infra || {})[week] || {}), prompt: v } } }));
  const edited = store.prompt;
  const promptValue = edited !== undefined ? edited : cfg.promptSeed;
  const copy = async () => {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(promptValue); setCopied(true); setTimeout(() => setCopied(false), 2000); } } catch { /* selectable fallback */ }
  };
  const inner = (
    <>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: 0 }}>{cfg.heading}</h3>
      <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, margin: "6px 0 12px" }}>{cfg.intro} <span style={{ color: C.muted }}>You'll do this live with us — AI handles the how.</span></p>
      {cfg.need && (
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, background: "#eef3f0", border: `1px solid ${C.emerald}`, borderRadius: 6, padding: "9px 12px", marginBottom: 14 }}>
          <b style={{ color: C.ink }}>You'll need:</b> {cfg.need}
        </div>
      )}
      <div style={{ border: `1px solid ${C.turq}`, borderRadius: 6, background: "#eef6f6", padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>📋 This lesson's prompt for Claude</span>
          <button type="button" className="btn" onClick={copy} style={{ background: copied ? C.green : C.turq, color: "#fff", padding: "7px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
            {copied ? <><Check size={14} /> Copied!</> : "Copy"}
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, margin: "6px 0 8px" }}>
          Paste this into Claude on top of what you already built. Tweak anything in <b>[brackets]</b> to fit your own product before you send. <span style={{ color: C.muted }}>Saved automatically.</span>
        </p>
        <textarea aria-label="This lesson's prompt" value={promptValue} rows={7} onChange={(e) => setPrompt(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", fontSize: 12.5, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: C.ink, resize: "vertical", lineHeight: 1.5 }} />
        {edited !== undefined && edited !== cfg.promptSeed && (
          <div style={{ marginTop: 6 }}>
            <span {...act(() => setPrompt(undefined))} style={{ fontSize: 12, fontWeight: 700, color: C.turq, cursor: "pointer" }}>↺ Reset to the suggested prompt</span>
          </div>
        )}
      </div>
    </>
  );
  return bare ? inner : <Card style={{ padding: 20, marginBottom: 12 }}>{inner}</Card>;
}

function BuildPlan({ s, setS, bare }) {
  const build = s.build || {};
  const setField = (k, v) => setS((p) => ({ ...p, build: { ...(p.build || {}), [k]: v } }));
  const isCustom = build.scenario === "custom";

  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink };
  const PR_PLACEHOLDER = `Announcing [your product] — [one line: what it does and who it helps].
The problem: [what's hard or annoying today].
How it works: [the one magic thing it does].
Why people love it: [the payoff].
"[a happy first user's quote]"`;

  const inner = (
    <>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: 0 }}>Your product — start from the customer 🧭</h3>
      <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, margin: "4px 0 14px" }}>Fill these in as you shape your product. Saved automatically.</p>

      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={labelStyle}>Your idea</span>
        <select aria-label="Choose an idea" value={build.scenario || ""} onChange={(e) => setField("scenario", e.target.value)} style={inputStyle}>
          <option value="">Choose an idea to start from…</option>
          <option value="custom">✍️  Write my own</option>
          {SCENARIO_GROUPS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((it) => <option key={it.id} value={it.id}>{it.label}</option>)}
            </optgroup>
          ))}
        </select>
      </label>

      {isCustom && (
        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={labelStyle}>My idea (one line)</span>
          <input aria-label="My idea" type="text" value={build.custom || ""} onChange={(e) => setField("custom", e.target.value)} placeholder="e.g., A tool that helps my swim team track their times" style={inputStyle} />
        </label>
      )}

      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={labelStyle}>Customer pain point(s)</span>
        <textarea aria-label="Customer pain points" value={build.pain || ""} onChange={(e) => setField("pain", e.target.value)} rows={3}
          placeholder="Who has this problem, and what's frustrating about it today? (e.g., 'My classmates cram the night before and forget everything — there's no quick way to quiz yourself from your own notes.')"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </label>

      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={labelStyle}>Press release statement</span>
        <textarea aria-label="Press release statement" value={build.pr || ""} onChange={(e) => setField("pr", e.target.value)} rows={6}
          placeholder={PR_PLACEHOLDER}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </label>

      {/* Positioning — how you'll talk about it. This is your north star: you'll come back to it at
          launch, when you grow it, and at the capstone. Keep it honest (true-now vs. goal). */}
      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={labelStyle}>Your one promise (one line)</span>
        <input aria-label="Your one promise" type="text" value={build.promise || ""} onChange={(e) => setField("promise", e.target.value)}
          placeholder="The single thing you promise a customer — e.g., 'Quiz yourself from your own notes in 2 minutes.'"
          style={inputStyle} />
      </label>

      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={labelStyle}>Honest check — what's true now vs. the goal</span>
        <textarea aria-label="What's true now vs. the goal" value={build.trueVsGoal || ""} onChange={(e) => setField("trueVsGoal", e.target.value)} rows={3}
          placeholder="Be honest: what does it actually do today, and what's still the goal? Say it that way when you talk about it — 'helps you study' (true now) vs. 'gets you an A' (goal). Honest beats hype, and people trust it more."
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
      </label>
      {/* "What success looks like" lives in Lesson 2's spec now — Lesson 1 is the bet (problem/customer/promise). */}
    </>
  );
  return bare ? inner : <Card style={{ padding: 20, marginBottom: 12 }}>{inner}</Card>;
}

// Lesson 2 student activity — "Shape the Idea": envision the product, its capabilities, and the
// experience of using it. Persists in s.shape.
function ShapePlan({ s, setS, bare }) {
  const shape = s.shape || {};
  const setField = (k, v) => setS((p) => ({ ...p, shape: { ...(p.shape || {}), [k]: v } }));
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 };
  const field = (k, label, placeholder, rows = 3) => (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={labelStyle}>{label}</span>
      <textarea aria-label={label} value={shape[k] || ""} onChange={(e) => setField(k, e.target.value)} rows={rows} placeholder={placeholder} style={inputStyle} />
    </label>
  );
  const inner = (
    <>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: 0 }}>Shape your idea — write the spec ✏️</h3>
      <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, margin: "4px 0 14px" }}>Write your spec, one section at a time. Saved automatically.</p>
      {field("product", "The core product", "The main thing your product does, who it's for, and the one 'wow' moment. Describe what it is, the key screens and features, and what it's like to use — enough to build the core product you can ship live. (Just the core — no accounts or payments yet.)", 6)}
      {field("accounts", "Accounts & saved data", "Who signs in, and what's saved for each person — what does a user see that's theirs?", 4)}
      {field("payments", "Payments", "What do people pay for, and how much? What's free vs. paid, and what do they get when they pay?", 4)}
      {field("production", "Production-ready", "The finishing layer: what emails go out (welcome, reminders?), how people find and share it, and how you keep users' data safe.", 4)}
      {field("success", "What success looks like", "Make success measurable: what does an 'active' user actually DO, and how often? How many come back (retention)? When would someone tell a friend? And the money — it should earn more than it costs to run.", 5)}
      {/* Tools setup now lives in this lesson's "Pre-req" tab (weekPrereqs), not inline here. */}
    </>
  );
  return bare ? inner : <Card style={{ padding: 20, marginBottom: 12 }}>{inner}</Card>;
}

// Lesson 3 student activity — "Make It (with AI)": hand your Lesson 2 spec to AI and run the
// describe → see → taste → refine loop. The spec is the SAME data as Lesson 2 (s.shape) — editing it
// here updates Lesson 2 too; no separate copy, single source of truth.
// One build week (3–6). Shows ONLY that week's layer prompt, pulled live from the student's Lesson 2
// spec (s.shape[cfg.key]) so edits here sync back to Lesson 2. Lesson 3 also shows the build pre-reqs.
function BuildLayer({ week, s, setS, bare }) {
  const cfg = BUILD_LAYERS[week];
  const setShapeField = (k, v) => setS((p) => ({ ...p, shape: { ...(p.shape || {}), [k]: v } }));

  const shape = s.shape || {};
  const [copied, setCopied] = useState(false);
  const has = (v) => v && v.trim();
  // The WHOLE 12-week plan is ONE object — s.shape. Every build week (3–10) reads + writes its own
  // s.shape[key], so it's a single source of truth. Lessons 3–6 are filled from the Lesson 2 product
  // spec; weeks 7–10 ship a starter prompt (`seed`) used as the default until the student edits it.
  const seeded = !!cfg.seed;        // weeks 7–10 (growth) come with a starter prompt
  const fromSpec = !seeded;         // weeks 3–6 are pulled from the Lesson 2 product spec
  const stored = shape[cfg.key];
  const value = stored !== undefined ? stored : (cfg.seed || "");
  const hasLayer = has(value);
  const onChangeLayer = (v) => setS((p) => ({ ...p, shape: { ...(p.shape || {}), [cfg.key]: v } }));
  // Spec weeks (3–6): wrap the spec slice in a build instruction. Seeded weeks (8–10): the field IS
  // the full, ready prompt — copy it as-is.
  const generatedPrompt = fromSpec
    ? [cfg.intro, "", cfg.promptLabel, hasLayer ? value.trim() : cfg.placeholder, "", cfg.instruction].join("\n")
    : (value || "").trim();
  const copyPrompt = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(generatedPrompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* clipboard blocked — the textarea is selectable as a fallback */ }
  };
  const lab = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 4 };
  const fieldS = { width: "100%", boxSizing: "border-box", fontSize: 13, padding: "9px 11px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 };

  const inner = (
    <>
      <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, margin: "0 0 14px" }}>{cfg.lead} Saved automatically.</p>

      {/* Build pre-reqs (the tools) now live in this lesson's "Pre-req" tab (weekPrereqs), not inline. */}

      {/* This lesson's prompt — the matching slice of the Lesson 2 spec (s.shape[cfg.key]). Editing here
          syncs back to Lesson 2. Copy hands Claude this layer's prompt (the spec slice + instruction). */}
      <div style={{ border: `1px solid ${C.turq}`, borderRadius: 6, background: "#eef6f6", padding: "12px 14px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>📋 This lesson's prompt — {cfg.fieldLabel}</span>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <button type="button" className="btn" onClick={copyPrompt} style={{ background: copied ? C.green : C.turq, color: "#fff", padding: "7px 14px", borderRadius: 4, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
              {copied ? <><Check size={14} /> Copied!</> : "Copy"}
            </button>
            <a href="https://claude.ai/code" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: C.emerald, textDecoration: "none", whiteSpace: "nowrap" }}>Open Claude Code ↗</a>
          </span>
        </div>
        {hasLayer ? (
          <div style={{ fontSize: 11.5, fontWeight: 800, color: C.green, marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5 }}><Check size={13} /> {week <= 6 ? "Pulled from your Lesson 2 spec — edits here update Lesson 2 too" : "Your funnel spec — saved automatically"}</div>
        ) : (
          <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.5, marginTop: 8, background: "#fbeede", border: `1px solid ${C.goldLite}`, borderRadius: 5, padding: "9px 11px" }}>
            {week <= 6
              ? <><b>This part of your Lesson 2 spec is empty.</b> Fill it in below (or back in Lesson 2) so AI builds <i>your</i> product — it's the same spec.</>
              : <><b>Write your funnel spec below</b> — use the sample above as your model.</>}
          </div>
        )}
        <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, margin: "8px 0 2px" }}>
          {week === 3
            ? "This IS your prompt — no separate writing. Edit it and it updates your Lesson 2 spec too, then Copy it into Claude Code."
            : week <= 6
              ? "This builds on top of what you already shipped. Edit it (it syncs to Lesson 2), then Copy it into Claude Code on top of your existing app."
              : "Write your funnel here (use the sample above as a model). Copy turns it into a prompt for Claude Code, on top of your existing app."}
        </p>
        <label style={{ display: "block", marginTop: 10 }}>
          <span style={lab}>{cfg.fieldLabel}</span>
          <textarea aria-label={cfg.fieldLabel} value={value || ""} onChange={(e) => onChangeLayer(e.target.value)} rows={6} placeholder={cfg.placeholder || "Adapt the sample above to your own product…"} style={fieldS} />
        </label>
        {/* read-only preview of exactly what Copy hands to Claude — only for spec weeks, where the
            copied prompt (spec slice + instruction) differs from the field. Seeded weeks: field IS it. */}
        {fromSpec && <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 12, fontWeight: 700, color: C.turq, cursor: "pointer" }}>Preview the full prompt Copy sends →</summary>
          <textarea readOnly aria-label="Full prompt preview" value={generatedPrompt} rows={8} onFocus={(e) => e.target.select()}
            style={{ width: "100%", boxSizing: "border-box", marginTop: 8, fontSize: 12, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: C.ink2, resize: "vertical", lineHeight: 1.5 }} />
        </details>}
      </div>
    </>
  );
  return bare ? inner : <Card style={{ padding: 20, marginBottom: 12 }}>{inner}</Card>;
}

// Capstone "share your build" capture — link to the live product + a bit of feedback we can use as
// a testimonial. Gated by CONFIG.showcaseEnabled (founder toggle). Opt-in with explicit consent;
// because students are minors, the founder confirms parental consent before any public use.
function ShowcaseCapture({ s }) {
  const [link, setLink] = useState("");
  const [feedback, setFeedback] = useState("");
  const [consent, setConsent] = useState(false);
  const [claimingPrize, setClaimingPrize] = useState(false); // first-year builder prize
  const [videoLink, setVideoLink] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done
  const canSend = (link.trim() || feedback.trim() || videoLink.trim()) && status !== "sending";
  const submit = async () => {
    if (!canSend) return;
    setStatus("sending");
    const r = await postJson("/api/funnel?resource=showcase", {
      link: link.trim(), feedback: feedback.trim(), consent,
      videoLink: videoLink.trim(), claimingPrize,
      name: (s.student && s.student.name) || "", batchId: (s.student && s.student.batch) || "",
    });
    setStatus(r.ok ? "done" : "idle");
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 };
  const inputStyle = { width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, lineHeight: 1.5 };
  return (
    <div style={{ marginTop: 16, border: `1px solid ${C.turq}`, borderRadius: 6, background: "#eef6f6", padding: "14px 16px" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>🌟 Share what you made</div>
      {status === "done" ? (
        <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.55, marginTop: 8 }}>
          <Check size={16} color={C.green} style={{ verticalAlign: "-3px", marginRight: 6 }} />
          Thank you — we'll take a look. We'd love to feature it!
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5, margin: "6px 0 12px" }}>
            You did the whole journey — built something real, took it live, and learned how to grow it and go after your first customers. Share your product and a line about how it went; with your OK, we'd love to feature it as a testimonial.
          </p>
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={labelStyle}>Your product's link</span>
            <input type="url" aria-label="Your build's link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://your-app.vercel.app" style={inputStyle} />
          </label>
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={labelStyle}>How was Build Young for you?</span>
            <textarea aria-label="Your feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="What did you build, what did you learn, and how did it feel to ship something real?" style={{ ...inputStyle, resize: "vertical" }} />
          </label>
          {/* First-year builder prize claim */}
          <div style={{ border: `1px solid ${C.green}`, borderRadius: 6, background: "#eef3f0", padding: "10px 12px", marginBottom: 12 }}>
            <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: C.ink2, lineHeight: 1.45, cursor: "pointer" }}>
              <input type="checkbox" aria-label="Claim the builder prize" checked={claimingPrize} onChange={(e) => setClaimingPrize(e.target.checked)} style={{ width: 16, height: 16, marginTop: 1, flexShrink: 0, accentColor: C.green, cursor: "pointer" }} />
              <span><Award size={13} color={C.green} style={{ verticalAlign: "-2px", marginRight: 3 }} /><b>I landed a real paying customer</b> — I'm claiming the builder prize (tuition back).</span>
            </label>
            {claimingPrize && (
              <div style={{ marginTop: 10 }}>
                <label style={{ display: "block" }}>
                  <span style={labelStyle}>Your 2-minute video link</span>
                  <input type="url" aria-label="Your video link" value={videoLink} onChange={(e) => setVideoLink(e.target.value)} placeholder="YouTube / Loom / Drive link" style={inputStyle} />
                </label>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginTop: 8 }}>
                  We'll verify your <b>real sale</b> (have your payment receipt ready) and check it's first in your cohort. A parent's OK is needed to use your video.
                </div>
              </div>
            )}
          </div>
          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: C.ink2, lineHeight: 1.45, marginBottom: 12, cursor: "pointer" }}>
            <input type="checkbox" aria-label="Consent to feature" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 16, height: 16, marginTop: 1, flexShrink: 0, accentColor: C.emerald, cursor: "pointer" }} />
            <span>Build Young may feature my product{claimingPrize ? ", video," : ""} and first name on their site. <b>I've checked with my parent/guardian.</b></span>
          </label>
          <button className="btn" onClick={submit} disabled={!canSend} style={{ background: canSend ? C.turq : C.line, color: "#fff", padding: "10px 18px", borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: canSend ? "pointer" : "not-allowed" }}>
            {status === "sending" ? "Sending…" : (claimingPrize ? "Submit my entry" : "Share my product")}
          </button>
        </>
      )}
    </div>
  );
}

/* ============================ PLATFORM ============================ */
export function Platform({ state, setState, onExit, onFounder, onHome }) {
  const BATCHES = useCohorts(); // live catalog
  const isFounder = !!onFounder; // a founder viewing the dashboard (for course-authoring preview)
  // "My dashboard" always opens on the Dashboard (home) tab — the week-by-week work is one tap
  // away under Course progress.
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [withdraw, setWithdraw] = useState(false); // false | 'confirm' | 'done'
  const [reason, setReason] = useState("");        // preset cancel-reason value (required to confirm)
  const [reasonNote, setReasonNote] = useState(""); // optional free-text note (goes to the founder email only)
  const closeWithdraw = () => { setWithdraw(false); setReason(""); setReasonNote(""); };
  const ping = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3600); };
  const s = state;
  const batch = BATCHES.find((b) => b.id === s.student.batch) || BATCHES[0];
  const startInfo = cohortStartInfo(batch);
  const notStarted = !s.started; // before the first session → full refund
  // Partner (third-party / marketplace) students don't self-withdraw — the founder removes them and
  // refunds are the partner's policy, so we never show them our withdraw control OR refund copy (T31).
  const isPartner = s.paymentSource === "partner";
  const canWithdraw = canWithdrawNow(s) && !isPartner; // pre-start, or within the first REFUND_WEEKS weeks
  // Refund is a flat rule: full before start; a flat 75% within the first week; nothing after.
  const refund = refundFor(batch, s.started, s.week);
  // Confirm a withdrawal: email the refund/cancellation confirmation (once — a ref guards
  // against a double-click), drop it in the in-app inbox, and show the done state. The send is
  // a side effect, so it lives OUTSIDE the setState updater (updaters must stay pure).
  const withdrawingRef = useRef(false);
  const doWithdraw = () => {
    if (withdrawingRef.current || !canWithdrawNow(s) || !reason) return; // need a reason; window open
    withdrawingRef.current = true;
    // Human-readable reason for the founder's email: the preset label + any free-text note.
    const note = reasonNote.trim();
    const reasonText = cancelReasonLabel(reason) + (note ? ` — ${note}` : "");
    const mail = withdrawalEmail(s, batch, refund, notStarted, reasonText);
    sendEmail(s.student.email, mail.subject, mail.body);
    // Funnel: exit branch, tagged with the refund tier + the PRESET reason (aggregate; the
    // free-text note is intentionally NOT sent to analytics).
    track("withdrawn", {
      season: batch.season, track: batch.track, batchId: batch.id,
      refundTier: notStarted ? "full" : "prorated", refundCents: Math.round(refund * 100),
      week: s.week, stage: notStarted ? "before_start" : "in_progress", reason,
    });
    // Record the cancellation on the state so the server (/api/state) records a pending refund and
    // emails the founder to issue it in Stripe — the app is keyless and can't refund automatically.
    setState((p) => ({
      ...p,
      withdrawal: { at: Date.now(), refundCents: Math.round(refund * 100), tier: notStarted ? "full" : "prorated", reason: reasonText },
      emails: [mail, ...(p.emails || [])],
    }));
    setWithdraw("done");
  };
  const wk = WEEKS[s.week - 1];

  // Completion certificate. Auth mode: the real cert is minted + emailed server-side on graduation,
  // so we fetch it (valid, verifiable certId); the mint can lag the state-save, so retry a few times.
  // Demo mode (no accounts): synthesize one from the student's state so graduates still see and can
  // download their certificate on the Dashboard.
  // Certificate unlocks once the student has COMPLETED Lesson 11 — i.e. advanced into Lesson 12
  // (week >= 12) — or has fully graduated / moved to the post-course check-in. We key off the
  // explicit week/done/checkin (NOT a loose "phase !== course") so a legacy record with an unset
  // phase can't surface the cert early — that bug once showed one student's cert before they'd
  // finished.
  const certEligible = (typeof s.week === "number" && s.week >= 12) || s.done === true || s.phase === "checkin";
  const [cert, setCert] = useState(null);
  useEffect(() => {
    if (!certEligible) return;
    if (!CONFIG.authEnabled) {
      setCert({ name: s.student.name, track: batch.track, completedAt: Date.now(), certId: "demo" });
      return;
    }
    let live = true, tries = 0;
    const tryFetch = async () => {
      const c = await AUTH.getCert();
      if (!live) return;
      if (c) { setCert(c); return; }
      if (tries++ < 4) setTimeout(tryFetch, 1500);
    };
    tryFetch();
    return () => { live = false; };
  }, [certEligible]);

  // Calendar-driven progression (there is no manual "advance" button): keep the student's
  // week/started/done in sync with where the cohort actually is on the calendar, and fire each
  // funnel transition once as the cohort crosses it. Persisting a graduated state is what mints the
  // certificate server-side (api/state.js), so this IS the graduation trigger. Scheduled emails
  // (class reminders, week recaps) are owned by the cron, not re-sent here, so a reload never
  // double-emails. Skipped for founders (preview/authoring) so it can't pollute the funnel.
  useEffect(() => {
    if (!batch || !s || s.phase !== "course" || isFounder) return;
    const pos = effectivePosition(batch); // founder's manual override when set, else the calendar
    if (s.week === pos.week && s.started === pos.started && s.done === pos.done) return;
    const fmeta = { season: batch.season, track: batch.track, batchId: batch.id };
    if (!s.started && pos.started) track("class_started", fmeta);
    if (pos.week > (s.week || 1)) track("week_advanced", { ...fmeta, week: pos.week });
    if (!s.done && pos.done) track("graduated", fmeta);
    setState((p) => (p && p.phase === "course"
      ? { ...p, week: pos.week, started: pos.started, done: pos.done }
      : p));
  }, [batch]); // eslint-disable-line react-hooks/exhaustive-deps -- sync on mount + catalog hydration

  // The post-enrollment tabs. "Dashboard" is the home base (welcome, setup, cancel); the
  // week-by-week coursework + progress live under "Course progress".
  const tabs = [
    { id: "overview", label: "Dashboard", icon: LineIcon },
    { id: "course", label: "Course progress", icon: GraduationCap },
  ];

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <PageBackdrop tint="#eef2f6" />
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1080, margin: "0 auto", padding: "18px 4vw 80px" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 50, background: C.ink, color: "#fff", padding: "12px 18px", borderRadius: 4, fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 9, boxShadow: "0 14px 34px -14px rgba(0,0,0,.55)" }}>
          <Mail size={15} color={C.emeraldLite} /> {toast}
        </div>
      )}
      {withdraw && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(36,36,36,.45)", display: "grid", placeItems: "center", padding: 20 }}>
          <Card style={{ padding: 26, maxWidth: 420, width: "100%" }}>
            {withdraw === "confirm" ? (
              <>
                <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>{notStarted ? "Cancel your enrollment?" : "Withdraw from the program?"}</div>
                <p style={{ color: C.ink2, fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>
                  {notStarted
                    ? <>Your cohort hasn't started yet, so you'll receive a <b>full refund of {fmt(refund)}</b> — no questions asked. This frees up your seat for someone else.</>
                    : <>You'll receive a <b>flat 75% refund of {fmt(refund)}</b> — the rate for cancelling within the {REFUND_WINDOW}. Refunds are available only through the {REFUND_WINDOW}, so this can't be reversed.</>}
                </p>
                <label style={{ display: "block", marginTop: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.ink2, display: "block", marginBottom: 5 }}>Reason for cancelling <span style={{ color: C.rust }}>*</span></span>
                  <select aria-label="Reason for cancelling" value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink }}>
                    <option value="">Choose a reason…</option>
                    {CANCEL_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </label>
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.ink2, display: "block", marginBottom: 5 }}>Anything else? <span style={{ color: C.muted, fontWeight: 500 }}>(optional — helps us improve)</span></span>
                  <textarea aria-label="Anything else about why you're cancelling" value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} rows={2} placeholder="Tell us what would have made it a better fit…" style={{ width: "100%", boxSizing: "border-box", fontSize: 14, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 }} />
                </label>
                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button className="btn" onClick={closeWithdraw} style={{ flex: 1, background: C.paper2, color: C.ink, border: `1px solid ${C.line}`, padding: 12, borderRadius: 4, fontSize: 14 }}>Never mind</button>
                  <button className="btn" disabled={!reason} onClick={doWithdraw} style={{ flex: 1, background: reason ? C.rust : C.line, color: "#fff", padding: 12, borderRadius: 4, fontSize: 14, cursor: reason ? "pointer" : "not-allowed" }}>Confirm withdrawal</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 4, background: C.emerald, display: "grid", placeItems: "center", margin: "4px auto 14px" }}><Check size={28} color="#fff" /></div>
                <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>Withdrawal complete</div>
                <p style={{ color: C.ink2, fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>A {notStarted ? "full" : "flat 75%"} refund of <b>{fmt(refund)}</b> is being processed to {s.student.email} and will land on your original payment method within 5–10 business days. A confirmation email is on its way. We're sorry to see you go.</p>
                <button className="btn" onClick={onExit} style={{ width: "100%", marginTop: 18, background: C.ink, color: C.paper2, padding: 12, borderRadius: 4, fontSize: 14 }}>Return home</button>
              </div>
            )}
          </Card>
        </div>
      )}
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="disp" {...act(() => onHome && onHome())} aria-label="Build Young — home" style={{ fontWeight: 900, fontSize: 20, cursor: "pointer" }}><Mark size={22} /> Build Young</div>
          <div style={{ fontSize: 13, color: C.muted }}>{s.student.name} · <span style={{ color: C.emerald, fontWeight: 600 }}>let's build something real</span></div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Pill bg={C.turq}>{s.done ? "Graduated"
            : (s.started || !startInfo.beforeStart ? `Lesson ${s.week} of 12` : `Starts ${startInfo.shortDate}`)}</Pill>
          {onFounder && <button className="btn" onClick={onFounder} style={{ background: "transparent", border: `1.5px solid ${C.turq}`, color: C.turq, padding: "7px 12px", borderRadius: 4, fontSize: 13, fontWeight: 700 }}>Admin</button>}
          <button className="btn" onClick={onExit} style={{ background: "transparent", border: `1.5px solid ${C.line}`, color: C.muted, padding: "7px 12px", borderRadius: 4, fontSize: 13 }}>Exit</button>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 6, margin: "18px 0", background: C.paper2, padding: 6, borderRadius: 4, border: `1px solid ${C.line}`, overflowX: "auto" }}>
        {tabs.map((t) => (
          <button key={t.id} type="button" className="tab btn" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 4, whiteSpace: "nowrap", border: "none", background: tab === t.id ? C.ink : "transparent", color: tab === t.id ? C.paper2 : C.ink2, fontWeight: 700, fontSize: 14 }}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="rise">
          {cert && <CertificateCard cert={cert} />}
          <OverviewPanel s={s} batch={batch} onTab={setTab} setS={setState} />

          {canWithdraw && (
            <Card style={{ padding: 16, marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 13, color: C.muted, maxWidth: 560 }}>
                {notStarted
                  ? <>Changed your mind before the first class? Cancel any time before your cohort starts on <b style={{ color: C.ink }}>{classDateLabel(batch, 1)}</b> for a <b style={{ color: C.ink }}>full refund of {fmt(refund)}</b> — no questions asked.</>
                  : <>Changed your mind? You can withdraw for a <b style={{ color: C.ink }}>flat 75% refund</b> through the end of the {REFUND_WINDOW} — up until your Lesson {REFUND_WEEKS + 1} session on <b style={{ color: C.ink }}>{classDateLabel(batch, REFUND_WEEKS + 1)}</b>. You'd get back <b style={{ color: C.ink }}>{fmt(refund)}</b> (75% of tuition).</>}
              </div>
              <button className="btn" onClick={() => setWithdraw("confirm")} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.muted, padding: "9px 14px", borderRadius: 4, fontSize: 13 }}>{notStarted ? "Cancel enrollment" : "Withdraw"}</button>
            </Card>
          )}
          {!canWithdraw && !isPartner && s.started && s.phase === "course" && s.week > REFUND_WEEKS && (
            <Card style={{ padding: 14, marginTop: 14 }}>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
                The refund window closed at the end of the {REFUND_WINDOW}. Past that point, tuition is non-refundable — but you keep full access through all 12 lessons.
              </div>
            </Card>
          )}
        </div>
      )}
      {tab === "course" && (
        /* Course progress: a horizontal week stepper with the selected week's activity below
           (Zoom + advance live inside the current week — no separate panel). */
        <CoursePanel s={s} setState={setState} batch={batch} cert={cert} isFounder={isFounder} />
      )}
      <div style={{ textAlign: "center", fontSize: 12.5, color: C.muted, padding: "30px 16px 8px", lineHeight: 1.6 }}>
        Questions about the program or your account? Email <a href={`mailto:${CONFIG.contactEmail}`} style={{ color: C.emerald, fontWeight: 600 }}>{CONFIG.contactEmail}</a> — we're happy to help.
      </div>
      </div>
    </div>
  );
}
// A single resource as a pill link (opens in a new tab, safely).
function ResLink({ r, icon: Icon = Newspaper }) {
  return (
    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: C.emerald, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 12px", textDecoration: "none", lineHeight: 1.3 }}>
      <Icon size={12} style={{ flexShrink: 0 }} /> {r.label} ↗
    </a>
  );
}

/* ---- Course progress: a horizontal week stepper + the selected week's activity below ---- */
// Per-week notes — a sticky right-rail textarea the student can jot in while reading any week.
// Keyed by week in s.notes; persists with the rest of the sim state (server-side in auth mode).
function WeekNotes({ week, s, setState }) {
  const notes = (s.notes && s.notes[String(week)]) || "";
  const set = (v) => setState((p) => ({ ...p, notes: { ...(p.notes || {}), [String(week)]: v } }));
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <BookOpen size={15} color={C.emerald} />
        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>Your notes · Lesson {week}</span>
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Jot anything from class — saved automatically, private to you.</div>
      <textarea aria-label={`Your notes for week ${week}`} value={notes} onChange={(e) => set(e.target.value)} rows={14}
        placeholder="Type your notes here…"
        style={{ width: "100%", boxSizing: "border-box", fontSize: 13.5, padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper2, fontFamily: "inherit", color: C.ink, resize: "vertical", lineHeight: 1.5 }} />
    </Card>
  );
}

function CoursePanel({ s, setState, batch, cert, isFounder }) {
  // Preview (every week open + each shows its full activity) is for the FOUNDER only, for course
  // authoring — students always get normal gating (only Lesson 1 open on signup; later lessons unlock
  // as they advance).
  const previewAll = CONFIG.previewAllWeeks && isFounder;
  const offCourse = s.phase !== "course"; // in check-ins / graduated, the 12 weeks are all done
  const currentWeek = offCourse ? 12 : s.week;
  const [selected, setSelected] = useState(currentWeek); // which week's content is shown below

  // The selected week's content.
  const selW = WEEKS[selected - 1];
  const selUnlocked = previewAll || offCourse || selected <= currentWeek;
  const isThisWeek = selected === currentWeek; // the live week (the final week, once off-course)
  const selStatus = !selUnlocked ? "Upcoming" : (isThisWeek && !offCourse ? "Current" : "Completed");
  const selStatusColor = selStatus === "Current" ? C.emerald : selStatus === "Completed" ? C.turq : C.muted;
  const selMaterials = selUnlocked ? (selW.materials || []) : [];
  const selParked = selUnlocked ? (selW.parked || []) : [];
  const secLabel = { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8 };
  const pillWrap = { display: "flex", flexWrap: "wrap", gap: 8 };

  // One week "step" in the horizontal stepper.
  const step = (week) => {
    const w = WEEKS[week - 1];
    const unlocked = previewAll || offCourse || week <= currentWeek;
    const isSel = week === selected;
    const isCur = week === currentWeek && !offCourse;
    const bg = !unlocked ? C.paper2 : isCur ? C.emerald : C.green; // done = green, this lesson = blue (easy to tell apart)
    const fg = unlocked ? "#fff" : C.muted;
    return (
      <button key={week} type="button" className="tab" aria-label={`Lesson ${week}${unlocked ? "" : " (locked)"}`} aria-current={isSel ? "true" : undefined}
        title={unlocked ? w.t : `Lesson ${week} — locked`} onClick={() => setSelected(week)}
        style={{ flex: "0 0 auto", width: 38, height: 38, borderRadius: 999, background: bg, color: fg, fontWeight: 800, fontSize: 14, cursor: "pointer", display: "grid", placeItems: "center", boxShadow: isSel ? `0 0 0 3px ${C.ink}` : "none", border: "none" }}>
        {unlocked ? week : <Lock size={13} />}
      </button>
    );
  };

  // Catch-up view for a PAST (unlocked, non-current) week: the week's class materials.
  const catchUp = (
    <Card style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: selStatusColor, letterSpacing: ".04em" }}>LESSON {selected} · {selStatus.toUpperCase()}</div>
          <div className="disp" style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{selW.t}</div>
        </div>
        {batch && (() => {
          // Use this lesson's class recording when the founder has posted one; otherwise the live link.
          const rec = batch.recordings && batch.recordings[String(selected)];
          return (
            <a href={rec || batch.zoom} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flexShrink: 0 }}>
              <button className="btn" style={{ background: C.emeraldLite, color: "#fff", padding: "9px 14px", borderRadius: 4, fontSize: 13.5, display: "flex", alignItems: "center", gap: 7 }}><Video size={15} /> {rec ? "Watch recording" : "Rewatch on Zoom"}</button>
            </a>
          );
        })()}
      </div>
      <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.55, margin: "10px 0 16px" }}>{selW.s}</div>
      {/* The week as horizontal tabs — Pre-req · What you'll learn · Class example · Your exercise.
          Keyed by week so it resets to the default tab when you switch weeks. */}
      {(weekObjectivesCard(selected) || weekExample(selected) || selMaterials.length || weekActivity(selected, s, setState, true)) ? (
        <WeekTabs key={selected} week={selected} s={s} setState={setState} materials={selMaterials} />
      ) : (
        <div style={{ fontSize: 12.5, color: C.muted, fontStyle: "italic" }}>Lesson materials coming soon.</div>
      )}
      {selParked.length > 0 && (
        <div style={{ marginTop: 16, padding: 14, background: C.paper, borderRadius: 4, border: `1px dashed ${C.line}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 4 }}>More money topics — coming soon</div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>We also cover these in the program. Where they land in the schedule is being finalized — here's a preview and some resources to get a head start.</div>
          <div style={{ display: "grid", gap: 10 }}>
            {selParked.map((pt, j) => (
              <div key={j}>
                <div className="disp" style={{ fontWeight: 700, fontSize: 14 }}>{pt.t}</div>
                <div style={{ fontSize: 12.5, color: C.muted, margin: "2px 0 6px", lineHeight: 1.4 }}>{pt.d}</div>
                {pt.materials && pt.materials.length > 0 && (
                  <div style={pillWrap}>{pt.materials.map((r, k) => <ResLink key={k} r={r} icon={BookOpen} />)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <div className="rise">
      <Card style={{ padding: 20, marginBottom: 12 }}>
        <div className="disp" style={{ fontSize: 20, fontWeight: 800 }}>Your course, lesson by lesson</div>
        <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Tap any lesson you've reached to see its activity, materials, and resources. Lessons unlock as you get there.</div>
        <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
          {WEEKS.map((w, i) => step(i + 1))}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, fontSize: 11.5, color: C.muted }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 999, background: C.green, display: "inline-block" }} /> Done</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 999, background: C.emerald, display: "inline-block" }} /> Current</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Lock size={11} /> Upcoming</span>
        </div>
      </Card>

      {previewAll && (
        <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, margin: "0 2px 8px" }}>Preview mode — every lesson is open for authoring (set CONFIG.previewAllWeeks=false to lock).</div>
      )}

      {/* selected week, full width. Preview: render the SELECTED week's activity (so any week can
          be authored). Normal: the live week shows the activity (+ Zoom + advance); past weeks a
          catch-up; locked weeks stay hidden (no spoilers). */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 460px", minWidth: 0 }}>
          {previewAll ? (
            <WeekPanel s={{ ...s, week: selected, phase: "course", started: true }} setState={setState} batch={batch} cert={cert} preview />
          ) : !selUnlocked ? (
            <Card style={{ padding: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".04em" }}>LESSON {selected} · UPCOMING</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: C.muted, background: C.paper, borderRadius: 4, padding: "12px 14px", marginTop: 12 }}>
                <Lock size={15} style={{ flexShrink: 0 }} /> Unlocks when you reach Lesson {selected}. No spoilers — keep your focus on where you are now.
              </div>
            </Card>
          ) : isThisWeek ? (
            <WeekPanel s={s} setState={setState} batch={batch} cert={cert} />
          ) : catchUp}
        </div>

        {/* Per-week notes — a sticky rail on the right so you can jot while reading any week. */}
        {(previewAll || selUnlocked) && (
          <div style={{ flex: "0 1 300px", minWidth: 0, alignSelf: "flex-start", position: "sticky", top: 16 }}>
            <WeekNotes week={selected} s={s} setState={setState} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- the weekly action panel ---- */
function WeekPanel({ s, setState, batch, cert, preview }) {
  const wk = WEEKS[s.week - 1];
  const action = s.phase === "course" ? wk.action : "checkin";

  // Header matches the catch-up card for past weeks (status label + title on the left, the Zoom
  // button on the right) so the CURRENT week aligns visually with Lessons 1–2 — no separate banner.
  const Wrap = ({ children, title, blurb }) => (
    <Card style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.emerald, letterSpacing: ".04em" }}>{s.phase === "course" ? `LESSON ${s.week} · CURRENT` : "CHECK-IN"}</div>
          <div className="disp" style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{title}</div>
        </div>
        {batch && (
          <a href={batch.zoom} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flexShrink: 0 }}>
            <button className="btn" style={{ background: C.emeraldLite, color: "#fff", padding: "9px 14px", borderRadius: 4, fontSize: 13.5, display: "flex", alignItems: "center", gap: 7 }}><Video size={15} /> Join on Zoom</button>
          </a>
        )}
      </div>
      <div style={{ color: C.ink2, fontSize: 14, margin: "10px 0 16px", lineHeight: 1.55 }}>{blurb}</div>
      {children}
    </Card>
  );

  return (
    <div className="rise">
      {action === "build" && (
        <Wrap title={wk.t} blurb={wk.s}>
          {/* The week as horizontal tabs — Pre-req · What you'll learn · Class example · Your exercise. */}
          <WeekTabs key={s.week} week={s.week} s={s} setState={setState} />
        </Wrap>
      )}

      {action === "capstone" && (<>
        {/* Lesson 12 is the finale (no separate check-in). The certificate unlocks once Lesson 11 is
            done (the student has reached Lesson 12), so lead with it here whenever it exists. */}
        {cert && <div style={{ marginBottom: 14 }}><CertificateCard cert={cert} /></div>}
        <Wrap
          title={s.done ? "You've graduated 🎓" : "Capstone: Present What You Built"}
          blurb={s.done
            ? "That's the program. You built something real, took it live, and grew it — this is what you made."
            : "You started with nothing but an idea. Pull it together — the product you built, who's using it, and what you'd build next — and present it. This is the finish line."}>
          {!s.done && <div style={{ fontSize: 14, color: C.ink2, marginTop: 4 }}>This is your last class — you'll present what you built to family and friends. <b>Parents are welcome to join this call</b> to watch (share the Zoom link).{!cert && <> <b>Finish the course</b> to unlock your certificate.</>}</div>}
          {/* Capture the build + a testimonial at the finale (gated by the founder showcase toggle). */}
          {CONFIG.showcaseEnabled && <ShowcaseCapture s={s} />}
        </Wrap>
      </>)}

    </div>
  );
}
