// ============================ AUTH CORE (dependency-free) ============================
//
// Password hashing, signed session cookies, one-time set-password tokens, and the user record
// CRUD — all on Node's built-in `crypto` (no bcrypt/jsonwebtoken deps; runs on Vercel's Node
// runtime) and the shared KV client (api/_lib/kv.js). Used by the /api/auth/* endpoints and the
// auth-gated /api/state.
//
// SECURITY MODEL
//   - Passwords: scrypt (memory-hard) with a per-user random salt; verified in constant time.
//   - Sessions: a stateless HMAC-SHA256-signed token { email, exp } in an HttpOnly, Secure,
//     SameSite=Lax cookie. Signing key is AUTH_SECRET (server-only env var). Logout clears the
//     cookie. (Stateless = no per-request KV read; the trade-off is no server-side revocation
//     before expiry, acceptable for a simulation portal — revisit with a session store if we
//     ever hold sensitive data.)
//   - Set-password links: a random 256-bit token stored in KV with a TTL, consumed once
//     (GETDEL). The token — never a guessable value — is what proves control of the email.
//   - This portal serves minors: we store only what enrollment already collected (email, name,
//     cohort) plus a password hash. No password is ever logged or returned.

import crypto from "node:crypto";
import { kvGet, kvSet, kvGetDel } from "./kv.js";

export const SESSION_COOKIE = "by_session";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const PW_TOKEN_TTL_SECONDS = 24 * 60 * 60;     // set-password link valid 24h
export const MIN_PASSWORD_LENGTH = 8;

const SECRET = () => process.env.AUTH_SECRET || "";

// Normalize an email for use as a stable key + login identifier.
export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// RFC-5322-ish: rejects obvious garbage. Mirrors the send-email validator.
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
export function validEmail(email) {
  return EMAIL_RE.test(normalizeEmail(email));
}

// ---- password hashing (scrypt) ----------------------------------------------------------

// Returns "scrypt$<saltHex>$<hashHex>". A fresh 16-byte salt per call.
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

// Constant-time verify against a stored "scrypt$salt$hash" string. False on any malformed input.
export function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    const actual = crypto.scryptSync(String(password), salt, expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ---- signed session tokens (HMAC) -------------------------------------------------------

const b64url = (buf) => Buffer.from(buf).toString("base64url");

function sign(data) {
  return crypto.createHmac("sha256", SECRET()).update(data).digest("base64url");
}

// Issue a signed token for an email. exp is a unix-seconds expiry.
export function signSession(email, ttlSeconds = SESSION_TTL_SECONDS) {
  if (!SECRET()) return "";
  const payload = b64url(JSON.stringify({ email: normalizeEmail(email), exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${payload}.${sign(payload)}`;
}

// Verify a token; returns { email } when valid + unexpired, else null. Constant-time sig check.
export function verifySession(token) {
  if (!SECRET() || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!email || !exp || exp < Math.floor(Date.now() / 1000)) return null;
    return { email: normalizeEmail(email) };
  } catch {
    return null;
  }
}

// ---- cookies ----------------------------------------------------------------------------

// Build a Set-Cookie value carrying the session token (or clearing it when token is "").
export function sessionCookie(token, { clear = false } = {}) {
  const maxAge = clear ? 0 : SESSION_TTL_SECONDS;
  return [
    `${SESSION_COOKIE}=${clear ? "" : token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

// Pull a single cookie value out of a Cookie header.
export function readCookie(req, name = SESSION_COOKIE) {
  const header = req && req.headers && (req.headers.cookie || req.headers.Cookie);
  if (typeof header !== "string") return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

// The authenticated user for a request → { email } or null. Trusts the signed cookie; no KV read.
export function requireUser(req) {
  return verifySession(readCookie(req));
}

// ---- user records (KV) ------------------------------------------------------------------

const userKey = (email) => `user:${normalizeEmail(email)}`;

export async function getUser(email) {
  const raw = await kvGet(userKey(email));
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

// Create or update a user record. Pass only the fields to change; existing fields are merged.
export async function putUser(email, fields) {
  const existing = (await getUser(email)) || { email: normalizeEmail(email), createdAt: Date.now() };
  const next = { ...existing, ...fields, email: normalizeEmail(email), updatedAt: Date.now() };
  await kvSet(userKey(email), JSON.stringify(next));
  return next;
}

// ---- one-time set-password tokens (KV, TTL'd) -------------------------------------------

const pwTokenKey = (token) => `pwtoken:${token}`;

// Mint a fresh single-use token for an email and persist it with a TTL. Returns the token.
export async function createPasswordToken(email) {
  const token = crypto.randomBytes(32).toString("hex");
  await kvSet(pwTokenKey(token), normalizeEmail(email), PW_TOKEN_TTL_SECONDS);
  return token;
}

// Consume a token, returning the email it was minted for (or null). One-time: GETDEL.
export async function consumePasswordToken(token) {
  if (!token || typeof token !== "string") return null;
  const email = await kvGetDel(pwTokenKey(token));
  return email ? normalizeEmail(email) : null;
}
