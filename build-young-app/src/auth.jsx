import { useState } from "react";
import { Mail } from "lucide-react";
import { C } from "./theme.js";
import { Card, Mark, act } from "./ui.jsx";
import { CONFIG, validEmail } from "./lib.js";

// Auth screens: returning-student Login, the emailed set-password flow, and the post-enroll
// check-your-email notice — plus the shared AuthShell. App wires the onLogin/onSetPassword/etc.

// Shared shell for the auth screens (login / set-password / check-email) — matches the site
// theme: paper background, centered white card, brand wordmark.
function AuthShell({ title, sub, children, onHome }) {
  return (
    <div style={{ minHeight: "100vh", background: C.paper, display: "flex", flexDirection: "column", alignItems: "center", padding: "6vh 6vw" }}>
      <div className="disp" {...act(onHome)} aria-label="Build Young — home" style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-.02em", cursor: "pointer", marginBottom: 24 }}>
        <Mark size={24} /> Build <span className="grad">Young</span>
      </div>
      <Card style={{ width: "100%", maxWidth: 420, padding: 28 }}>
        <h1 className="disp" style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{title}</h1>
        {sub && <p style={{ color: C.muted, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>{sub}</p>}
        {children}
      </Card>
    </div>
  );
}
const authInput = { width: "100%", padding: "12px 14px", borderRadius: 4, border: `1.5px solid ${C.line}`, background: C.paper2, fontSize: 15, marginTop: 6, boxSizing: "border-box" };
const authLabel = { fontSize: 13, fontWeight: 700, color: C.ink2 };

// Returning-student sign in. On success the parent hydrates server state and routes to the app.
export function Login({ onLogin, onReset, onHome, onEnroll }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr(""); setBusy(true);
    const res = await onLogin(email.trim(), password);
    if (!res.ok) { setErr(res.error || "Could not sign in."); setBusy(false); }
  };
  const doReset = async () => {
    if (!validEmail(email)) { setErr("Enter your email above first, then tap reset."); return; }
    setErr(""); await onReset(email.trim()); setResetSent(true);
  };
  return (
    <AuthShell title="Log in" sub="Sign in to your student dashboard." onHome={onHome}>
      {resetSent && <div role="status" style={{ background: "#eef3f0", border: `1px solid ${C.line}`, borderRadius: 4, padding: "10px 12px", marginTop: 14, fontSize: 13, color: C.ink2, lineHeight: 1.5 }}>If an account exists for that email, we've sent a link to set a new password. Don't see it? Check your spam folder{CONFIG.contactEmail ? <>, or email <a href={`mailto:${CONFIG.contactEmail}`} style={{ color: C.emerald, fontWeight: 700 }}>{CONFIG.contactEmail}</a></> : ""}.</div>}
      <form onSubmit={submit}>
        <div style={{ marginTop: 16 }}><div style={authLabel}>Email</div><input aria-label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={authInput} /></div>
        <div style={{ marginTop: 14 }}><div style={authLabel}>Password</div><input aria-label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" style={authInput} /></div>
        {err && <div role="alert" style={{ color: C.rust, fontSize: 13, marginTop: 12 }}>{err}</div>}
        <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 20, background: C.emerald, color: "#fff", padding: 13, borderRadius: 4, fontSize: 15, opacity: busy ? 0.7 : 1 }}>{busy ? "Signing in…" : "Log in"}</button>
      </form>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 13 }}>
        <span {...act(doReset)} style={{ color: C.emerald, fontWeight: 600, cursor: "pointer" }}>Forgot password?</span>
        <span {...act(onEnroll)} style={{ color: C.ink2, fontWeight: 600, cursor: "pointer" }}>Need a seat? Enroll →</span>
      </div>
    </AuthShell>
  );
}

// Reached via the emailed ?setpw=<token> link. Sets the password, then signs the student in.
export function SetPassword({ token, onSetPassword, onHome }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) { setErr("Use at least 8 characters."); return; }
    if (password !== confirm) { setErr("The two passwords don't match."); return; }
    setErr(""); setBusy(true);
    const res = await onSetPassword(token, password);
    if (!res.ok) { setErr(res.error || "Could not set your password. The link may have expired."); setBusy(false); }
  };
  return (
    <AuthShell title="Set your password" sub="Choose a password to finish setting up your dashboard. You'll use your email + this password to log in from any device." onHome={onHome}>
      <form onSubmit={submit}>
        <div style={{ marginTop: 16 }}><div style={authLabel}>New password</div><input aria-label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" style={authInput} /></div>
        <div style={{ marginTop: 14 }}><div style={authLabel}>Confirm password</div><input aria-label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter it" style={authInput} /></div>
        {err && <div role="alert" style={{ color: C.rust, fontSize: 13, marginTop: 12 }}>{err}</div>}
        <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 20, background: C.emerald, color: "#fff", padding: 13, borderRadius: 4, fontSize: 15, opacity: busy ? 0.7 : 1 }}>{busy ? "Saving…" : "Set password & open dashboard"}</button>
      </form>
    </AuthShell>
  );
}

// Shown after enrollment (Stripe return or demo) when auth is on: the account was provisioned
// server-side and a set-password link was emailed.
export function CheckEmail({ track, email, onHome }) {
  return (
    <AuthShell title="You're enrolled! 🎉" sub={`Your seat${track ? ` in the ${track} cohort` : ""} is reserved.`} onHome={onHome}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#eef3f0", border: `1px solid ${C.emerald}`, borderRadius: 4, padding: "12px 14px", marginTop: 16 }}>
        <Mail size={16} color={C.emerald} style={{ marginTop: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.5 }}><b style={{ color: C.ink }}>Next step — check your email.</b> We’ve sent a link to <b>set your password</b>{email ? <> to <b style={{ color: C.ink }}>{email}</b></> : ""}. Click it to finish setting up your account and open your dashboard. The link is good for 24 hours.</span>
      </div>
      <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginTop: 12 }}>Don’t see it within a few minutes? Check your spam or promotions folder{CONFIG.contactEmail ? <>, or email <a href={`mailto:${CONFIG.contactEmail}`} style={{ color: C.emerald, fontWeight: 700 }}>{CONFIG.contactEmail}</a> and we’ll sort it out</> : ""}.</p>
    </AuthShell>
  );
}
