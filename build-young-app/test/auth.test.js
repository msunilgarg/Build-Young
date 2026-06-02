import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  hashPassword, verifyPassword, signSession, verifySession,
  sessionCookie, readCookie, normalizeEmail, validEmail, SESSION_COOKIE,
} from "../api/_lib/auth.js";

describe("password hashing (scrypt)", () => {
  it("verifies the correct password and rejects a wrong one", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(verifyPassword("wrong password", stored)).toBe(false);
  });
  it("uses a fresh salt each time (same password → different hashes)", () => {
    expect(hashPassword("samePassw0rd")).not.toBe(hashPassword("samePassw0rd"));
  });
  it("returns false for malformed stored values", () => {
    for (const bad of ["", "nope", "scrypt$only-two", null, undefined, "bcrypt$a$b"]) {
      expect(verifyPassword("x", bad)).toBe(false);
    }
  });
});

describe("signed sessions (HMAC)", () => {
  beforeEach(() => { process.env.AUTH_SECRET = "test-secret-please-rotate"; });
  afterEach(() => { delete process.env.AUTH_SECRET; });

  it("round-trips a valid session and normalizes the email", () => {
    const token = signSession("Jordan@Example.com");
    expect(token).toBeTruthy();
    expect(verifySession(token)).toEqual({ email: "jordan@example.com" });
  });
  it("rejects a tampered payload or signature", () => {
    const token = signSession("a@b.com");
    const [payload, sig] = token.split(".");
    expect(verifySession(`${payload}x.${sig}`)).toBeNull();
    expect(verifySession(`${payload}.${sig}x`)).toBeNull();
    expect(verifySession("garbage")).toBeNull();
  });
  it("rejects an expired session", () => {
    const token = signSession("a@b.com", -10); // already expired
    expect(verifySession(token)).toBeNull();
  });
  it("fails closed when AUTH_SECRET is missing", () => {
    delete process.env.AUTH_SECRET;
    expect(signSession("a@b.com")).toBe("");
    expect(verifySession("anything.here")).toBeNull();
  });
  it("won't verify a token signed with a different secret", () => {
    const token = signSession("a@b.com");
    process.env.AUTH_SECRET = "a-different-secret";
    expect(verifySession(token)).toBeNull();
  });
});

describe("session cookie helpers", () => {
  it("builds a hardened Set-Cookie and reads it back", () => {
    const c = sessionCookie("tok123");
    expect(c).toContain(`${SESSION_COOKIE}=tok123`);
    expect(c).toContain("HttpOnly");
    expect(c).toContain("Secure");
    expect(c).toContain("SameSite=Lax");
    expect(readCookie({ headers: { cookie: `other=1; ${SESSION_COOKIE}=tok123; x=2` } })).toBe("tok123");
  });
  it("clears the cookie with Max-Age=0 and an empty value", () => {
    const c = sessionCookie("", { clear: true });
    expect(c).toContain(`${SESSION_COOKIE}=;`);
    expect(c).toContain("Max-Age=0");
  });
  it("returns null when no cookie header is present", () => {
    expect(readCookie({ headers: {} })).toBeNull();
  });
});

describe("email helpers", () => {
  it("normalizes and validates", () => {
    expect(normalizeEmail("  A@B.COM ")).toBe("a@b.com");
    expect(validEmail("jordan@example.com")).toBe(true);
    expect(validEmail("nope")).toBe(false);
  });
});
