import { useState } from "react";
import { GraduationCap, Check, Lock, Video, Mail, Award } from "lucide-react";
import { C } from "./theme.js";
import { Card, Mark, act, PageBackdrop } from "./ui.jsx";
import { CONFIG, useCohorts, validEmail, setPendingEnroll } from "./lib.js";
import { cohortClosed, cohortSummary, cohortEndLabel } from "./courseDates.js";
import { SEASONS, seasonLabel, sortCohorts, catalogSeasons } from "./cohorts.js";
import { WhyStrip, HesitationStrip } from "./WhyStrip.jsx";

// 3-step enrollment: details (step 1), payment (Stripe link or demo), confirmation.

export function Enroll({ preselect, onDone, onBack, onCall, onHome }) {
  const BATCHES = useCohorts(); // live catalog
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age15, setAge15] = useState(false); // eligibility gate — a parent confirms the student is in high school
  // Default to the EARLIEST cohort (sortCohorts is chronological), so the dropdown opens on the same
  // first option the landing tabs lead with (e.g. a Summer cohort before Fall) — not raw catalog order.
  const [batch, setBatch] = useState(preselect || (sortCohorts(BATCHES)[0] || BATCHES[0]).id);
  const [notified, setNotified] = useState(false); // captured interest for a full cohort
  const [writeup, setWriteup] = useState("");      // free/scholarship application (SPECS/016)
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const b = BATCHES.find((x) => x.id === batch) || BATCHES[0];
  const closed = cohortClosed(b); // sold out, or past the enrollment cutoff (day before start)
  // A $0 cohort enrolls by APPLICATION (a write-up + founder approval), not Stripe — SPECS/016.
  const isFree = (b.price || 0) === 0;
  const WRITEUP_MIN = 300;
  const canContinue = name.trim() && validEmail(email) && age15 && !closed;
  const canApply = canContinue && writeup.trim().length >= WRITEUP_MIN;
  const canNotify = name.trim() && validEmail(email);
  const submitApplication = async () => {
    setSubmitting(true); setSubmitErr("");
    try {
      const r = await fetch("/api/funnel?resource=free-enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, batchId: b.id, writeup: writeup.trim() }) });
      const d = await r.json().catch(() => ({}));
      // The `free_application` funnel event is recorded SERVER-SIDE by the endpoint (reliable; a client
      // beacon was being suppressed by no-track/ad-blockers, zeroing the scholarship Applied count).
      if (r.ok && d.ok) { setStep(3); }
      else setSubmitErr(d.error || "Couldn't submit — please try again.");
    } catch { setSubmitErr("Network error — please try again."); }
    setSubmitting(false);
  };
  // A full cohort doesn't take a waitlist (no mid-course additions) — we capture interest for the
  // NEXT cohort instead, so the founder sees real overflow demand.
  const submitInterest = async () => {
    try { await fetch("/api/funnel?resource=interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, batchId: b.id, season: b.season, track: b.track }) }); } catch (e) {}
    setNotified(true);
  };
  const acc = b.id.includes("mw") ? C.emerald : C.green;
  const sum = cohortSummary(b); // real duration/load for this cohort's pace
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
            <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{isFree ? "Apply for a scholarship seat" : "Reserve your seat"}</h2>
            <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{isFree ? "Scholarship seats are limited and awarded by application. Tell us who's joining and why." : "Choose a batch and tell us who's joining. Takes about a minute."}</p>
            {onCall && (
              <div {...act(onCall)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#eaf3fb", border: `1px solid ${C.emeraldLite}`, borderRadius: 4, padding: "10px 12px", marginTop: 14, cursor: "pointer" }}>
                <Video size={15} color={C.emerald} /><span style={{ fontSize: 12.5, color: C.ink2 }}>Want to talk first? <b style={{ color: C.emerald }}>Book a free 15-minute call with us →</b></span>
              </div>
            )}
            <div className="enroll-grid" style={{ marginTop: 18 }}>
              {/* form column */}
              <div>
                {isFree ? (
                  // Scholarship application: the cohort is fixed to the one they clicked "Apply for
                  // scholarship" on — no batch picker (switching cohorts here, incl. to a paid one, is wrong).
                  <div><div style={label}>Cohort</div>
                    <div style={{ ...inputS, background: C.paper, color: C.ink2 }}>{seasonLabel(b.season)} · {b.track} — starts {b.start}</div>
                  </div>
                ) : (
                <div><div style={label}>Batch</div>
                  <select aria-label="Batch" value={batch} onChange={(e) => { setBatch(e.target.value); setNotified(false); }} style={inputS}>
                    {catalogSeasons(BATCHES).filter((s) => BATCHES.some((x) => x.season === s.key)).map((s) => (
                      <optgroup key={s.key} label={s.label}>
                        {sortCohorts(BATCHES.filter((x) => x.season === s.key)).map((x) => (
                          <option key={x.id} value={x.id}>{x.day.split(" · ")[0]} (starts {x.start}){cohortClosed(x) ? " — ENROLLMENT FULL" : ""}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                )}
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
                    {isFree ? (
                      <><b style={{ color: C.ink2 }}>A note on costs:</b> a scholarship covers <b>tuition only</b>. Your child will still need <b>Claude Pro</b> (about <b>$20/month</b>) — the AI that builds the app alongside them — during the build weeks; a free account won't keep up. Everything else we use (GitHub, Vercel, email) is <b>free</b>, and a custom web address (domain) is <b>optional</b> (about <b>$10–20/year</b>). These aren't covered by the scholarship.</>
                    ) : (
                      <><b style={{ color: C.ink2 }}>A note on costs:</b> beyond tuition, your child will need <b>Claude Pro</b> (about <b>$20/month</b>) — the AI that builds the app alongside them — for the build weeks; a free account won't keep up. Everything else we use (GitHub, Vercel, Resend for email) is <b>free</b>. Later, a custom web address (domain) is <b>optional</b> and runs about <b>$10–20/year</b> if you want one.</>
                    )}
                  </div>
                  {isFree && (
                    <div style={{ marginTop: 14 }}>
                      <div style={label}>Why do you want this seat? <span style={{ color: C.muted, fontWeight: 500 }}>— in a few sentences, tell us why you want it and what you'd build</span></div>
                      <textarea aria-label="Why you want this seat" value={writeup} onChange={(e) => setWriteup(e.target.value)} rows={6} placeholder="I want to build…" style={{ ...inputS, resize: "vertical", minHeight: 120, fontFamily: "inherit" }} />
                      <div style={{ fontSize: 11.5, color: writeup.trim().length >= WRITEUP_MIN ? C.green : C.muted, marginTop: 4 }}>{writeup.trim().length}/{WRITEUP_MIN} characters minimum</div>
                    </div>
                  )}
                  {isFree ? (<>
                    <button className="btn" disabled={!canApply || submitting} onClick={submitApplication} style={{ width: "100%", marginTop: 18, background: (canApply && !submitting) ? C.emerald : C.line, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, cursor: (canApply && !submitting) ? "pointer" : "not-allowed" }}>{submitting ? "Submitting…" : "Submit application →"}</button>
                    {submitErr && <div style={{ color: C.rust, fontSize: 12.5, marginTop: 10, textAlign: "center" }}>{submitErr}</div>}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 12, color: C.muted, fontSize: 12.5 }}>
                      <Mail size={13} /> Scholarship seats are limited — we read every application personally.
                    </div>
                  </>) : (<>
                    <button className="btn" disabled={!canContinue} onClick={() => setStep(2)} style={{ width: "100%", marginTop: 18, background: canContinue ? C.emerald : C.line, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16, cursor: canContinue ? "pointer" : "not-allowed" }}>Continue to payment →</button>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 12, color: C.muted, fontSize: 12.5 }}>
                      <Lock size={13} /> Secure checkout · no charge until the next step
                    </div>
                  </>)}
                </>)}
              </div>
              {/* summary column */}
              <aside style={{ background: C.paper2, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ height: 4, background: acc }} />
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".05em" }}>YOUR ENROLLMENT</div>
                  <div className="disp" style={{ fontWeight: 800, fontSize: 17, marginTop: 4 }}>{seasonLabel(b.season)} · {b.track}</div>
                  <div style={{ fontSize: 13, color: C.ink2, marginTop: 2 }}>Starts {b.start}{cohortEndLabel(b) ? ` · ends ${cohortEndLabel(b)}` : ""}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: acc, fontSize: 12.5, fontWeight: 600, marginTop: 6 }}><Video size={13} /> {b.day} · live on Zoom</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12 }}>
                    <span style={{ fontSize: 13, color: C.muted }}>Tuition</span>
                    <span className="disp" style={{ fontSize: isFree ? 20 : 26, fontWeight: 800 }}>{isFree ? "Fully funded" : `$${b.price}`}</span>
                  </div>
                  {isFree ? (
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
                      <b style={{ color: C.ink2 }}>By application.</b> Scholarship seats are limited and awarded by application — tell us why you want one. If you're selected, we'll email you to set your password and get started.
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
                      <b style={{ color: C.ink2 }}>Full refund</b> if you cancel before {b.start}. After classes begin, a <b style={{ color: C.ink2 }}>flat 75% refund</b> is available through the first week; non-refundable after.
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 8, fontWeight: 700, letterSpacing: ".04em" }}>WHAT YOU GET FROM ME</div>
                  <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
                    {[
                      `${sum.lessons} lessons (${sum.hours} hrs) over ${sum.weeks} weeks — ~${sum.hoursPerWeek} hrs/week live, taught by me`,
                      "Your own student dashboard",
                      "Build a real product, grow it, and get your first customers",
                      "A certificate of completion you can add to LinkedIn",
                      // The builder prize is a TUITION refund — N/A for a scholarship student (no tuition paid),
                      // so it's omitted on funded cohorts (SPECS/017 follow-up).
                      ...(isFree ? [] : ["A shot at the builder prize — land a real paying customer in a year, get your tuition back"]),
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
                      // No seat count for a scholarship cohort — scholarship places are merit-based + funding-
                      // dependent, not a fixed inventory, so we don't imply "N seats" (SPECS/017 follow-up).
                      ...(isFree ? [] : [{ icon: GraduationCap, t: "Capped at 10 students" }]),
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

        {step === 3 && isFree && (
          <div className="rise" style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 4, background: C.emerald, display: "grid", placeItems: "center", margin: "8px auto 16px" }}><Check size={32} color="#fff" /></div>
            <h2 className="disp" style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Application received, {name.split(" ")[0]}!</h2>
            <p style={{ color: C.muted, fontSize: 14, marginTop: 6 }}>Thanks for applying for a scholarship seat in the {b.track} cohort. We read every write-up personally — if you're selected, we'll email you a link to set your password and get started.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", background: "#eef3f0", border: `1px solid ${C.line}`, borderRadius: 4, padding: "9px 12px", marginTop: 12 }}>
              <Mail size={15} color={C.emerald} /><span style={{ fontSize: 12.5, color: C.ink2 }}>A confirmation email has been sent to <b>{email}</b>.</span>
            </div>
            <button className="btn" onClick={() => (onHome ? onHome() : onBack())} style={{ width: "100%", marginTop: 22, background: C.emerald, color: "#fff", padding: 14, borderRadius: 4, fontSize: 16 }}>Back to home →</button>
          </div>
        )}

        {step === 3 && !isFree && (
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
