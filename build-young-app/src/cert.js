// ============================ COMPLETION CERTIFICATE (dependency-free) ============================
//
// Helpers for the course-completion certificate and its LinkedIn "Add to profile" deep link.
// Shared by the client (certificate view + button, src/App.jsx) and the server (the completion
// email, api/_lib/cert.js) so the cert name and LinkedIn URL can never drift. No React/Node deps.

export const CERT_ORG = "Build Young";
// LinkedIn matches a plain org NAME to a Company Page when one exists. Once Build Young has a
// LinkedIn Company Page, put its numeric id here and the cert will link straight to the page.
export const CERT_ORG_ID = ""; // e.g. "108201234" — fill in after the Company Page is live

// The credential's title as it appears on LinkedIn + the certificate.
export function certName(track) {
  return `${CERT_ORG} — ${track || "Builders"} Program`;
}

// Public verification URL for a cert id — the page anyone (including LinkedIn viewers) can open.
export function certVerifyUrl(baseUrl, certId) {
  return `${String(baseUrl || "").replace(/\/+$/, "")}/verify/${encodeURIComponent(certId || "")}`;
}

// LinkedIn "Add to profile" deep link: opens the member's "Add licenses & certifications" dialog,
// prefilled. No OAuth/login required — the member chooses to add it (the teen if 16+, otherwise a
// parent). `certUrl` is the public verification page; `certId` is the credential id.
export function linkedInAddUrl({ track, certId, certUrl, issuedAt } = {}) {
  const d = issuedAt ? new Date(issuedAt) : new Date();
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: certName(track),
    organizationName: CERT_ORG,
    issueYear: String(d.getFullYear()),
    issueMonth: String(d.getMonth() + 1),
    certUrl: certUrl || "",
    certId: certId || "",
  });
  if (CERT_ORG_ID) params.set("organizationId", CERT_ORG_ID);
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

// Human completion date, e.g. "September 7, 2026".
export function certDate(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
