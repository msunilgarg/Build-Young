// ============================ SITE SETTINGS (dependency-free) ============================
//
// The founder-editable RUNTIME settings — public-facing values a founder may change live from
// the console without a redeploy: the booking link, the contact email, and the LinkedIn URL.
// Kept React/lucide-free so the server settings store (api/_lib/settingsStore.js) and the client
// CONFIG (src/App.jsx) import the SAME defaults — they can't drift.
//
// NOT here (and deliberately NOT founder-editable from a web console): secrets and deploy
// toggles — RESEND_API_KEY, AUTH_SECRET, the KV vars, the Stripe webhook secret, and the
// emailEnabled/authEnabled switches that depend on them. Those stay host env vars; the console
// shows their on/off status read-only.

export const SITE_DEFAULTS = {
  calendlyUrl: "",                                    // booking link; empty = the in-app demo scheduler
  contactEmail: "team@build-young.com",               // shown in the footer + legal copy
  linkedinUrl: "https://www.linkedin.com/in/msunilgarg",
  stripeLink: "",                                     // a SHARED Stripe Payment Link, used for any cohort
                                                      // without its own link (the cohort editor overrides it)
  showcaseEnabled: false,                             // OFF by default; founder flips it on once there
                                                      // are products worth showing. Gates the capstone
                                                      // "share your product + feedback" capture.
};

// The keys a founder may edit (the store allowlist + the console editor iterate these).
export const SETTINGS_KEYS = Object.keys(SITE_DEFAULTS);

// Human labels + input hints for the console editor (single-sourced so the form stays in sync).
// `type: "boolean"` renders a checkbox; otherwise a text input. Type is also how the store knows
// to preserve a boolean instead of coercing everything to a trimmed string.
export const SETTINGS_FIELDS = [
  { key: "calendlyUrl", label: "Booking link (Calendly)", placeholder: "https://calendly.com/you/15min", hint: "Empty = the built-in demo scheduler is shown instead." },
  { key: "contactEmail", label: "Contact email", placeholder: "team@build-young.com", hint: "Shown in the footer and legal copy." },
  { key: "linkedinUrl", label: "LinkedIn URL", placeholder: "https://www.linkedin.com/in/you", hint: "Linked from the founder section + footer." },
  { key: "stripeLink", label: "Shared Stripe Payment Link", placeholder: "https://buy.stripe.com/…", hint: "Used for every cohort that has no link of its own (a cohort's own link in the cohort editor overrides it). One Payment Link has one fixed price, so all cohorts sharing it must be the same price." },
  { key: "showcaseEnabled", label: "Student showcase capture", type: "boolean", hint: "When on, graduating students can share their product link + feedback at the capstone. Turn on once you have products worth collecting." },
];
