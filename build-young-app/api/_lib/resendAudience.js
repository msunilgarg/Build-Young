// ============================ RESEND AUDIENCES (per-cohort group) ============================
//
// Each cohort maps to a Resend "audience" (a contact list). The founder broadcasts to the whole
// cohort from Resend; this module just manages the LIST: create one when a cohort is created, and
// add each student as a contact when they enroll.
//
// IMPORTANT: Resend is send-only. An audience is NOT an inbound address students can email each
// other through — it's the list a founder broadcast goes to. (A true peer mailing list would need
// a group on the domain's email host, e.g. Google Workspace; that's separate from Resend.)
//
// Everything here is BEST-EFFORT: with no RESEND_API_KEY it's a no-op (returns null/false), and it
// never throws — a failed list call must never break a cohort save or an enrollment.

const API = "https://api.resend.com";
const apiKey = () => process.env.RESEND_API_KEY || "";
const impl = (f) => f || (typeof fetch !== "undefined" ? fetch : null);

// Create an audience and return its id (or null on any failure / no key).
export async function createAudience(name, fetchImpl) {
  const key = apiKey();
  const f = impl(fetchImpl);
  if (!key || !name || !f) return null;
  try {
    const r = await f(`${API}/audiences`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!r || !r.ok) return null;
    const d = await r.json().catch(() => ({}));
    return d && d.id ? d.id : null;
  } catch {
    return null;
  }
}

// Remove a contact from an audience by email (e.g. on cancellation). Returns true on success,
// false otherwise (never throws). Deleting a missing contact is treated as success by Resend.
export async function removeContact(audienceId, email, fetchImpl) {
  const key = apiKey();
  const f = impl(fetchImpl);
  if (!key || !audienceId || !email || !f) return false;
  try {
    const r = await f(`${API}/audiences/${encodeURIComponent(audienceId)}/contacts/${encodeURIComponent(email)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
    return !!(r && r.ok);
  } catch {
    return false;
  }
}

// Add a contact to an audience. Returns true on success, false otherwise (never throws).
export async function addContact(audienceId, { email, firstName, lastName } = {}, fetchImpl) {
  const key = apiKey();
  const f = impl(fetchImpl);
  if (!key || !audienceId || !email || !f) return false;
  try {
    const r = await f(`${API}/audiences/${encodeURIComponent(audienceId)}/contacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, first_name: firstName || "", last_name: lastName || "", unsubscribed: false }),
    });
    return !!(r && r.ok);
  } catch {
    return false;
  }
}
