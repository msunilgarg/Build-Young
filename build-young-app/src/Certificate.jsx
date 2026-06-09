import { useState, useEffect } from "react";
import { Linkedin, Check } from "lucide-react";
import { C } from "./theme.js";
import { Card, Mark, act } from "./ui.jsx";
import { CONFIG, downloadFile } from "./lib.js";
import { certName, certDate, certVerifyUrl, linkedInAddUrl, CERT_ORG } from "./cert.js";

// Certificate UI: the SVG builder, the on-screen certificate, its action buttons, the
// in-dashboard card, and the public /verify/<id> page. Shared by Platform + the founder console.

export function buildCertSvg(cert) {
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const name = esc(cert.name || "Build Young Graduate");
  const title = esc(certName(cert.track));
  const dateStr = esc(certDate(cert.completedAt));
  const id = esc(cert.certId);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700" viewBox="0 0 1000 700" font-family="Georgia, 'Times New Roman', serif">
  <rect width="1000" height="700" fill="#ffffff"/>
  <rect x="20" y="20" width="960" height="660" fill="none" stroke="#0067b8" stroke-width="3"/>
  <rect x="32" y="32" width="936" height="636" fill="none" stroke="#e1dfdd" stroke-width="1"/>
  <text x="500" y="118" text-anchor="middle" font-size="30" font-weight="bold" fill="#242424">Build Young</text>
  <text x="500" y="182" text-anchor="middle" font-size="17" letter-spacing="6" fill="#605e5c">CERTIFICATE OF COMPLETION</text>
  <text x="500" y="248" text-anchor="middle" font-size="16" fill="#605e5c">This certifies that</text>
  <text x="500" y="312" text-anchor="middle" font-size="44" font-weight="bold" fill="#242424">${name}</text>
  <text x="500" y="372" text-anchor="middle" font-size="20" fill="#424242">has completed the ${title}</text>
  <text x="500" y="406" text-anchor="middle" font-size="15" fill="#605e5c">building and shipping a real product with Claude Code, then learning to grow it and get its first customers.</text>
  <line x1="180" y1="560" x2="420" y2="560" stroke="#242424"/>
  <text x="300" y="585" text-anchor="middle" font-size="16" fill="#242424">Sunil Garg</text>
  <text x="300" y="605" text-anchor="middle" font-size="12" fill="#605e5c">Founder, Build Young</text>
  <line x1="580" y1="560" x2="820" y2="560" stroke="#242424"/>
  <text x="700" y="585" text-anchor="middle" font-size="16" fill="#242424">${dateStr}</text>
  <text x="700" y="605" text-anchor="middle" font-size="12" fill="#605e5c">Date of completion</text>
  <text x="500" y="652" text-anchor="middle" font-size="11" fill="#605e5c">Credential ID ${id}</text>
</svg>`;
}

// On-screen certificate. `compact` shrinks it for the in-dashboard card vs. the full verify page.
export function CertificateView({ cert, compact }) {
  const name = cert.name || "Build Young Graduate";
  return (
    <div style={{ position: "relative", background: "#fff", border: `2px solid ${C.emerald}`, borderRadius: 10, padding: compact ? "26px 22px" : "44px 32px", textAlign: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 7, border: `1px solid ${C.line}`, borderRadius: 8, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Mark size={24} /><span className="disp" style={{ fontWeight: 900, fontSize: 19 }}>Build <span className="grad">Young</span></span></div>
        <div style={{ fontSize: 11.5, letterSpacing: ".18em", color: C.muted, fontWeight: 700, marginTop: 16 }}>CERTIFICATE OF COMPLETION</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 16 }}>This certifies that</div>
        <div className="disp" style={{ fontSize: compact ? 26 : 34, fontWeight: 800, color: C.ink, margin: "6px 0" }}>{name}</div>
        <div style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.6, maxWidth: 520, margin: "8px auto 0" }}>
          has completed the <b>{certName(cert.track)}</b> — building and shipping a real product with Claude Code, then learning to grow it and get its first customers.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, marginTop: 28, textAlign: "left", flexWrap: "wrap" }}>
          <div>
            <div className="disp" style={{ fontSize: 16, fontWeight: 700, color: C.ink, borderBottom: `1px solid ${C.line}`, paddingBottom: 4 }}>Sunil Garg</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>Founder, Build Young</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="disp" style={{ fontSize: 16, fontWeight: 700, color: C.ink, borderBottom: `1px solid ${C.line}`, paddingBottom: 4 }}>{certDate(cert.completedAt)}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>Date of completion</div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 16 }}>Credential ID {cert.certId} · verify at www.{CONFIG.brandDomain}/verify/{cert.certId}</div>
      </div>
    </div>
  );
}

// The action buttons (Add to LinkedIn / Download / public page) shared by the dashboard card
// and the verify page.
export function CertActions({ cert }) {
  const verifyUrl = certVerifyUrl(`https://${CONFIG.brandDomain}`, cert.certId);
  const li = linkedInAddUrl({ track: cert.track, certId: cert.certId, certUrl: verifyUrl, issuedAt: cert.completedAt });
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <a className="btn" href={li} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, background: "#0a66c2", color: "#fff", padding: "11px 16px", borderRadius: 4, fontSize: 14, fontWeight: 600 }}><Linkedin size={16} /> Add to LinkedIn</a>
      <button className="btn" onClick={() => downloadFile("build-young-certificate.svg", buildCertSvg(cert), "image/svg+xml")} style={{ background: C.emerald, color: "#fff", padding: "11px 16px", borderRadius: 4, fontSize: 14, fontWeight: 600 }}>Download</button>
      <a className="btn" href={verifyUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", background: C.paper2, color: C.ink, padding: "11px 16px", borderRadius: 4, fontSize: 14, fontWeight: 600 }}>View public page</a>
    </div>
  );
}

// The in-dashboard certificate card (shown once the student has graduated).
export function CertificateCard({ cert }) {
  if (!cert) return null;
  return (
    <Card style={{ padding: 20, marginBottom: 12 }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: "0 0 12px" }}>Your certificate 🎓</h3>
      <CertificateView cert={cert} compact />
      <div style={{ marginTop: 14 }}><CertActions cert={cert} /></div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>We emailed this to you too. Under 16? A parent can add it to their LinkedIn.</div>
    </Card>
  );
}

// Public certificate verification page (no auth) — opened from /verify/<id> + LinkedIn.
export function CertifyVerify({ certId, onHome }) {
  const [cert, setCert] = useState(undefined); // undefined = loading, null = not found
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/cohorts?cert=${encodeURIComponent(certId)}`);
        if (!r.ok) { if (live) setCert(null); return; }
        const d = await r.json();
        if (live) setCert(d && d.cert ? d.cert : null);
      } catch { if (live) setCert(null); }
    })();
    return () => { live = false; };
  }, [certId]);

  const wrap = { maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px" };
  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={wrap}>
        <div className="disp" {...act(onHome)} style={{ fontWeight: 900, fontSize: 20, cursor: "pointer", marginBottom: 24 }}><Mark size={22} /> Build <span className="grad">Young</span></div>
        {cert === undefined && <Card style={{ padding: 24, color: C.muted }}>Verifying certificate…</Card>}
        {cert === null && (
          <Card style={{ padding: 24 }}>
            <b style={{ color: C.ink }}>Certificate not found.</b>
            <div style={{ fontSize: 13.5, color: C.muted, marginTop: 6 }}>This credential ID doesn't match any Build Young certificate. <span {...act(onHome)} style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}>Visit Build Young →</span></div>
          </Card>
        )}
        {cert && (<>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#eef3f0", color: C.green, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 700, marginBottom: 14 }}><Check size={15} /> Verified by Build Young</div>
          <CertificateView cert={cert} />
          <div style={{ marginTop: 16 }}><CertActions cert={cert} /></div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 18, lineHeight: 1.6 }}>
            {CERT_ORG} is a live program where teens build a product with AI, grow it, and get its first customers. <span {...act(onHome)} style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}>Learn more →</span>
          </div>
        </>)}
      </div>
    </div>
  );
}
