import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// SPECS/016 — $0 / free-cohort enrollment by application. A public write-up application → PENDING seat →
// founder approves → the SAME onboarding as Stripe/partner, at $0. We mock the email sender (so no real
// Resend) and back everything with an in-memory fake KV (incl. hash ops the enrollment store uses).
const sendEmailMock = vi.fn(async () => ({ ok: true, status: 200 }));
vi.mock("../api/_lib/sendEmail.js", () => ({ sendEmail: (...a) => sendEmailMock(...a), FROM_ADDRESS: "x", REPLY_TO_ADDRESS: "y", escapeHtml: (s) => s }));

import funnelHandler from "../api/funnel.js";
import { signSession, SESSION_COOKIE } from "../api/_lib/auth.js";

const cookieFor = (email) => `${SESSION_COOKIE}=${signSession(email)}`;
let ipN = 0;
const nextIp = () => `5.5.5.${++ipN}`; // unique per public call → dodge the in-memory rate limiter

function fakeKv() {
  const store = new Map();
  const fn = vi.fn(async (_url, opts) => {
    const [cmd, key, ...rest] = JSON.parse(opts.body);
    let result = null;
    switch (cmd) {
      case "SET": store.set(key, rest[0]); result = "OK"; break;
      case "GET": result = store.has(key) ? store.get(key) : null; break;
      case "DEL": result = store.delete(key) ? 1 : 0; break;
      case "GETDEL": result = store.has(key) ? store.get(key) : null; store.delete(key); break;
      case "HSET": { const h = store.get(key) || {}; for (let i = 0; i < rest.length; i += 2) h[rest[i]] = rest[i + 1]; store.set(key, h); result = 1; break; }
      case "HGETALL": result = store.get(key) || {}; break;
      case "HLEN": result = Object.keys(store.get(key) || {}).length; break;
      case "HDEL": { const h = store.get(key) || {}; let n = 0; for (const f of rest) if (f in h) { delete h[f]; n++; } store.set(key, h); result = n; break; }
      case "RPUSH": { const arr = store.has(key) ? JSON.parse(store.get(key)) : []; rest.forEach((v) => arr.push(v)); store.set(key, JSON.stringify(arr)); result = arr.length; break; }
      case "LTRIM": result = "OK"; break;
      default: result = null;
    }
    return { ok: true, json: async () => ({ result }) };
  });
  fn._store = store;
  return fn;
}
function makeRes() {
  return { statusCode: 0, payload: null, headers: {}, status(c) { this.statusCode = c; return this; }, json(o) { this.payload = o; return this; }, setHeader(k, v) { this.headers[k] = v; } };
}
const req = (method, { query = {}, body = null, headers = {} } = {}) => ({ method, query, body, headers });

const WRITEUP = "I want this seat because I have been building small tools for my robotics club for the last two years and I want to finally ship a real product that other students can actually use every day. I learn fast and I will show up every single week, do all of the work, help my classmates when they get stuck, and share what I build. A free seat is exactly the push I need to go from tinkering to actually launching something real and useful.";
const apply = (over = {}) => req("POST", { query: { resource: "free-enroll" }, headers: { "x-forwarded-for": nextIp() }, body: { name: "Free Kid", email: "kid@free.org", batchId: "free-fall", writeup: WRITEUP, ...over } });
const asFounder = (resource) => ({ headers: { cookie: cookieFor("founder@x.com") }, query: { resource } });

describe("free-cohort enrollment by application (SPECS/016)", () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = "https://fake.kv";
    process.env.KV_REST_API_TOKEN = "fake-token";
    process.env.AUTH_SECRET = "endpoint-test-secret";
    process.env.FOUNDER_EMAILS = "founder@x.com";
    const kv = fakeKv();
    vi.stubGlobal("fetch", kv);
    sendEmailMock.mockClear();
    // Seed a FREE ($0) cohort + a PAID one in the live catalog.
    kv._store.set("cohorts:catalog", JSON.stringify({ batches: [
      { id: "free-fall", price: 0, season: "fall", track: "Builders", start: "Sep 1, 2026", day: "Mondays", groupAudienceId: "" },
      { id: "paid-fall", price: 999, season: "fall", track: "Builders", start: "Sep 1, 2026", day: "Tuesdays", groupAudienceId: "" },
    ], checkins: {} }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
    delete process.env.AUTH_SECRET; delete process.env.FOUNDER_EMAILS;
  });

  const listFree = async () => { const res = makeRes(); await funnelHandler(req("GET", asFounder("free-enrollments")), res); return res; };

  it("public apply stores a PENDING free record (with write-up) + notifies founder + confirms to applicant", async () => {
    const res = makeRes();
    await funnelHandler(apply(), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ ok: true });
    // two best-effort emails: founder notification + applicant confirmation
    expect(sendEmailMock).toHaveBeenCalledTimes(2);

    const list = await listFree();
    expect(list.payload.enrollments).toHaveLength(1);
    expect(list.payload.enrollments[0]).toMatchObject({ email: "kid@free.org", batchId: "free-fall", paymentSource: "free", onboarded: false, writeup: WRITEUP });
  });

  it("rejects a missing/short write-up", async () => {
    const res = makeRes();
    await funnelHandler(apply({ writeup: "too short" }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.ok).toBe(false);
  });

  it("rejects a non-free (paid) cohort", async () => {
    const res = makeRes();
    await funnelHandler(apply({ batchId: "paid-fall" }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toMatch(/free seat/i);
  });

  it("rejects a duplicate application for the same cohort", async () => {
    let res = makeRes(); await funnelHandler(apply(), res); expect(res.statusCode).toBe(200);
    res = makeRes(); await funnelHandler(apply(), res);
    expect(res.statusCode).toBe(409);
  });

  it("founder APPROVE runs the full onboarding at $0 (account + email + enrolled event) and marks onboarded", async () => {
    let res = makeRes(); await funnelHandler(apply(), res); expect(res.statusCode).toBe(200);
    sendEmailMock.mockClear();

    res = makeRes();
    await funnelHandler(req("POST", { ...asFounder("free-approve"), body: { email: "kid@free.org", batchId: "free-fall" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
    expect(res.payload.invited).toBe(true);                       // set-password email sent
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    // account provisioned with paymentSource "free"
    const store = fetch._store;
    const user = JSON.parse(store.get("user:kid@free.org"));
    expect(user).toMatchObject({ email: "kid@free.org", paymentSource: "free", batchId: "free-fall" });

    // `enrolled` event fired at $0, tagged source:"free"
    const events = JSON.parse(store.get("funnel:events") || "[]").map((e) => JSON.parse(e));
    const enrolled = events.find((e) => e.event === "enrolled");
    expect(enrolled.props).toMatchObject({ batchId: "free-fall", priceCents: 0, source: "free" });

    // now shows onboarded
    const list = await listFree();
    expect(list.payload.enrollments[0]).toMatchObject({ onboarded: true });
  });

  it("founder DECLINE removes the application", async () => {
    let res = makeRes(); await funnelHandler(apply(), res); expect(res.statusCode).toBe(200);
    res = makeRes();
    await funnelHandler(req("POST", { ...asFounder("free-remove"), body: { email: "kid@free.org", batchId: "free-fall" } }), res);
    expect(res.statusCode).toBe(200);
    const list = await listFree();
    expect(list.payload.enrollments).toHaveLength(0);
  });

  it("the founder-gated endpoints reject a non-founder", async () => {
    let res = makeRes();
    await funnelHandler(req("GET", { headers: { cookie: cookieFor("nobody@x.com") }, query: { resource: "free-enrollments" } }), res);
    expect(res.statusCode).toBe(403);
    res = makeRes();
    await funnelHandler(req("POST", { headers: { cookie: cookieFor("nobody@x.com") }, query: { resource: "free-approve" }, body: { email: "kid@free.org", batchId: "free-fall" } }), res);
    expect(res.statusCode).toBe(403);
  });
});
