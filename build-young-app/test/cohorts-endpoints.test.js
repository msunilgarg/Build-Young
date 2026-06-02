import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import cohortsHandler from "../api/cohorts.js";
import funnelHandler from "../api/funnel.js";
import { signSession, SESSION_COOKIE } from "../api/_lib/auth.js";

// A signed session cookie header for a given email (founder gating reads this).
const cookieFor = (email) => `${SESSION_COOKIE}=${signSession(email)}`;

// In-memory fake of the KV REST API (kv.js talks to it via global fetch). Covers the SET/GET/DEL
// the catalog store + account-reset use.
function fakeKv() {
  const store = new Map();
  const fn = vi.fn(async (_url, opts) => {
    const [cmd, key, ...rest] = JSON.parse(opts.body);
    let result = null;
    switch (cmd) {
      case "SET": store.set(key, rest[0]); result = "OK"; break;
      case "GET": result = store.has(key) ? store.get(key) : null; break;
      case "DEL": result = store.delete(key) ? 1 : 0; break;
      default: result = null;
    }
    return { ok: true, json: async () => ({ result }) };
  });
  fn._store = store;
  return fn;
}
function makeRes() {
  return {
    statusCode: 0, payload: null, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(o) { this.payload = o; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
}
const req = (method, { query = {}, body = null, headers = {} } = {}) => ({
  method, query, body, headers,
  on: (ev, cb) => { if (ev === "end") cb(); }, // readRaw fallback (unused when body is an object)
});

let kv;
describe("cohorts + founder-admin endpoints (fake KV)", () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = "https://fake.kv";
    process.env.KV_REST_API_TOKEN = "fake-token";
    process.env.AUTH_SECRET = "endpoint-test-secret";
    process.env.FOUNDER_EMAILS = "founder@x.com";
    kv = fakeKv();
    vi.stubGlobal("fetch", kv);
  });
  afterEach(() => { vi.restoreAllMocks(); delete process.env.FOUNDER_EMAILS; });

  it("GET /api/cohorts returns a catalog (public; defaults when KV is empty)", async () => {
    const res = makeRes();
    await cohortsHandler(req("GET"), res);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.payload.batches)).toBe(true);
    expect(res.payload.batches.length).toBeGreaterThan(0);
  });

  it("PUT /api/funnel saves the catalog (founder-session gated) and GET reflects it", async () => {
    const body = { batches: [{ id: "only", season: "fall", track: "Builders", start: "Sep 7, 2026", day: "Mon & Wed", price: 1234, seats: 8, zoom: "", stripeLink: "" }], checkins: 2 };

    // no session → 403
    let res = makeRes();
    await funnelHandler(req("PUT", { body }), res);
    expect(res.statusCode).toBe(403);

    // a non-founder session → 403
    res = makeRes();
    await funnelHandler(req("PUT", { headers: { cookie: cookieFor("nobody@x.com") }, body }), res);
    expect(res.statusCode).toBe(403);

    // a founder session → saves a sanitized catalog
    res = makeRes();
    await funnelHandler(req("PUT", { headers: { cookie: cookieFor("founder@x.com") }, body }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);

    // GET (public) now returns exactly what was saved
    const g = makeRes();
    await cohortsHandler(req("GET"), g);
    expect(g.payload.batches).toHaveLength(1);
    expect(g.payload.batches[0]).toMatchObject({ id: "only", price: 1234, seats: 8 });
    expect(g.payload.checkins).toBe(2);
  });

  it("a founder adds/removes admins on the allowlist (PUT ?resource=founders)", async () => {
    const asFounder = { headers: { cookie: cookieFor("founder@x.com") }, query: { resource: "founders" } };
    // add new@x.com
    let res = makeRes();
    await funnelHandler(req("PUT", { ...asFounder, body: { emails: ["new@x.com"] } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.founders).toEqual(expect.arrayContaining(["founder@x.com", "new@x.com"])); // env kept

    // the newly-added admin can now read the dashboard
    res = makeRes();
    await funnelHandler(req("GET", { headers: { cookie: cookieFor("new@x.com") } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.founders).toContain("new@x.com");

    // remove it again (save empty) — the env bootstrap admin stays
    res = makeRes();
    await funnelHandler(req("PUT", { ...asFounder, body: { emails: [] } }), res);
    expect(res.payload.founders).not.toContain("new@x.com");
    expect(res.payload.founders).toContain("founder@x.com");

    // a non-founder can't edit the allowlist
    res = makeRes();
    await funnelHandler(req("PUT", { headers: { cookie: cookieFor("nobody@x.com") }, query: { resource: "founders" }, body: { emails: ["x@x.com"] } }), res);
    expect(res.statusCode).toBe(403);
  });

  it("GET /api/funnel (read) is 403 without a founder session", async () => {
    const res = makeRes();
    await funnelHandler(req("GET", { headers: { cookie: cookieFor("nobody@x.com") } }), res);
    expect(res.statusCode).toBe(403);
  });

  it("DELETE /api/funnel wipes a test account's user + state (founder-session gated)", async () => {
    kv._store.set("user:a@x.com", "{}");
    kv._store.set("state:a@x.com", "{}");

    // non-founder session → 403, account untouched
    let res = makeRes();
    await funnelHandler(req("DELETE", { headers: { cookie: cookieFor("nobody@x.com") }, query: { email: "a@x.com" } }), res);
    expect(res.statusCode).toBe(403);
    expect(kv._store.has("user:a@x.com")).toBe(true);

    // founder session → deleted (email normalized)
    res = makeRes();
    await funnelHandler(req("DELETE", { headers: { cookie: cookieFor("founder@x.com") }, query: { email: "A@x.com" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
    expect(kv._store.has("user:a@x.com")).toBe(false);
    expect(kv._store.has("state:a@x.com")).toBe(false);
  });
});
