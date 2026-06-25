# Spec: Auto-send a set-password invite when an admin is added

> One feature = one short spec. Decisions go here; PRs implement them.

**Status:** shipped
**Owner:** Sunil Garg
**Date:** 2026-06-25

> **Approved 2026-06-25** — all three recommendations confirmed: admin-flavored email copy, skip-if-the-account-
> already-has-a-password, and show invite status in the console.

## Why
Today, adding someone in the console's **Admins** editor only allowlists their email. They see nothing —
the "Admin" link appears only once they're *logged in*, and to log in a brand-new admin has to discover
**Log in → "Forgot password?"** on their own. That's the friction the founder hit ("he can't see the admin
option"). Fix: when a new admin is added, **email them a set-password link automatically** so they can log
in without being told the secret handshake.

## Behavior
When the founder saves the Admins list and the save **adds one or more new emails**, the server — for each
**newly-added** email (in the new KV list but not the old one; env-bootstrap founders are excluded) — does:
1. **Provision** an account if none exists: `putUser(email, { name: "" })` (mirrors `request-reset.js`'s
   founder self-provision — the allowlist is the authorization, no enrollment/payment needed).
2. **Send a set-password invite** (`sendSetPasswordEmail`, admin-flavored copy — see below), UNLESS the
   account **already has a password** (e.g. an enrolled student being promoted) — those are elevated
   silently; they already log in, and Admin shows on next load.
3. **Best-effort:** an email-send failure (e.g. Resend not configured) does **not** fail the save. The
   response reports `invited: [...]` and `inviteFailed: [...]` so the console can tell the founder.

Re-saving the list with **no new emails sends nothing** (diff against prior list — no spam). The manual
"Forgot password?" path stays as a fallback.

## Changes
- **`api/funnel.js` `saveFounders`:** load the old effective list **before** saving → save → compute
  `added = newEffective \ oldEffective` (excluding env founders) → for each added, provision + (conditionally)
  send → return `{ ...result, invited, inviteFailed }`. New imports: `getUser`, `putUser` (auth.js),
  `sendSetPasswordEmail` (sendSetPassword.js).
- **`api/_lib/sendSetPassword.js`:** add an `isAdmin` option → admin-appropriate subject/body
  ("set your password to access the Build Young admin console"), dropping the student "see you in class /
  student portal" wording. (`isReset` and the student welcome copy are unchanged.)
- **`src/FounderDashboard.jsx` `FoundersEditor`:** on save, surface the result — e.g. *"Saved ✓ — invite
  sent to alice@x.com"* or *"Saved ✓ — couldn't email bob@x.com (email not configured)"* from
  `d.invited` / `d.inviteFailed`.

## Open decisions (please confirm)
1. **Admin-flavored email copy** — add an admin variant (recommended) vs. reuse the student "welcome" copy?
2. **Skip if already has a password** (recommended — promoting an existing student doesn't re-send) vs.
   always send a set-password link on add?
3. **Show invite status in the console** (recommended) vs. keep the save silent.

## Done when (acceptance) — all met
- [x] Adding a brand-new admin email in the console provisions the account AND emails a set-password link;
      after setting it, that person sees the **Admin** option. (`test/admin-invite.test.js` mocks
      `sendSetPasswordEmail` and asserts provision + send for the delta only.)
- [x] Re-saving with no new emails sends **zero** emails; env founders are never emailed.
- [x] Promoting a user who already has a password adds them to the allowlist but sends **no** set-password
      email.
- [x] Save returns `ok` even when the email send fails; response lists `invited` / `inviteFailed`.
- [x] Build + tests green (406 incl. the new real-loader guard); docs synced (CLAUDE.md auth/admin note).

## Note (caught in verification)
The first cut added `getUser`/`putUser`/`sendSetPasswordEmail` imports to `api/funnel.js` that were
**already imported** there (for the partner flow) — a duplicate-binding `SyntaxError` that crashes the
serverless function on Vercel's Node loader, yet `npm run build` (Vite compiles only `src/`) and the whole
Vitest suite (esbuild tolerates it) passed green. The independent verifier caught it via `node --check`.
Fix: dedup the imports **and** add `test/api-syntax.test.js` — a `node --check` over every `api/**/*.js`
so this whole class of bug fails the suite from now on.

## Out of scope
- A "copy a manual set-password link" button for when email is unconfigured (possible follow-up).
- Notifying on admin **removal**; role tiers (read-only / scoped admin).

## Risk
Low–med. Outbound email to people the founder explicitly added (intended); account-provisioning mirrors the
existing `request-reset` founder path (same trust model). Auth-adjacent → spec-first + review before merge.
