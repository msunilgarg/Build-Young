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
      case "RPUSH": {
        const arr = store.has(key) ? JSON.parse(store.get(key)) : [];
        rest.forEach((v) => arr.push(v));
        store.set(key, JSON.stringify(arr));
        result = arr.length; break;
      }
      case "LRANGE": {
        const arr = store.has(key) ? JSON.parse(store.get(key)) : [];
        const len = arr.length;
        let s = Number(rest[0]); let e = Number(rest[1]);
        s = s < 0 ? Math.max(0, len + s) : s;
        e = e < 0 ? len + e : e;
        result = arr.slice(s, e + 1); break;
      }
      case "SADD": {
        const set = new Set(store.has(key) ? JSON.parse(store.get(key)) : []);
        rest.forEach((v) => set.add(v));
        store.set(key, JSON.stringify([...set]));
        result = rest.length; break;
      }
      case "SMEMBERS": result = store.has(key) ? JSON.parse(store.get(key)) : []; break;
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

  it("GET /api/cohorts?cert=<id> publicly verifies a certificate (no auth)", async () => {
    const rec = { certId: "abc123", name: "Bani Garg", track: "Builders", season: "fall", completedAt: Date.now() };
    kv._store.set("cert:abc123", JSON.stringify(rec));

    // found → 200 + the cert (no session needed)
    let res = makeRes();
    await cohortsHandler(req("GET", { query: { cert: "abc123" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.cert).toMatchObject({ certId: "abc123", name: "Bani Garg", track: "Builders" });

    // unknown id → 404
    res = makeRes();
    await cohortsHandler(req("GET", { query: { cert: "nope" } }), res);
    expect(res.statusCode).toBe(404);
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

  it("PUT ?resource=settings saves the site settings (founder-gated) and GET /api/cohorts reflects them", async () => {
    const body = { calendlyUrl: "https://calendly.com/sunil/15min", contactEmail: "hi@build-young.com", linkedinUrl: "https://linkedin.com/in/x", junk: "drop" };

    // no session → 403
    let res = makeRes();
    await funnelHandler(req("PUT", { query: { resource: "settings" }, body }), res);
    expect(res.statusCode).toBe(403);

    // founder session → saves sanitized settings (junk dropped)
    res = makeRes();
    await funnelHandler(req("PUT", { headers: { cookie: cookieFor("founder@x.com") }, query: { resource: "settings" }, body }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
    expect(res.payload.settings).not.toHaveProperty("junk");

    // GET (public) folds the settings into the catalog response
    const g = makeRes();
    await cohortsHandler(req("GET"), g);
    expect(g.payload.settings).toMatchObject({ calendlyUrl: "https://calendly.com/sunil/15min", contactEmail: "hi@build-young.com" });
  });

  it("PUT ?resource=homework saves the 12 weeks' homework (founder-gated) and GET reflects it", async () => {
    const homework = Array.from({ length: 12 }, (_, i) => `week ${i + 1} prep`);

    // no session → 403
    let res = makeRes();
    await funnelHandler(req("PUT", { query: { resource: "homework" }, body: { homework } }), res);
    expect(res.statusCode).toBe(403);

    // founder → saves
    res = makeRes();
    await funnelHandler(req("PUT", { headers: { cookie: cookieFor("founder@x.com") }, query: { resource: "homework" }, body: { homework } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
    expect(res.payload.homework).toHaveLength(12);

    // GET /api/cohorts folds the homework into the public read
    const g = makeRes();
    await cohortsHandler(req("GET"), g);
    expect(g.payload.homework[0]).toBe("week 1 prep");
    expect(g.payload.homework).toHaveLength(12);
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

  it("GET /api/funnel?resource=certs lists issued certificates, newest first (founder-gated)", async () => {
    kv._store.set("cert:c1", JSON.stringify({ certId: "c1", name: "Ada", track: "Builders", completedAt: 1 }));
    kv._store.set("cert:c2", JSON.stringify({ certId: "c2", name: "Bo", track: "Builders", completedAt: 2 }));
    kv._store.set("certs:index", JSON.stringify(["c1", "c2"]));

    // non-founder → 403
    let res = makeRes();
    await funnelHandler(req("GET", { headers: { cookie: cookieFor("nobody@x.com") }, query: { resource: "certs" } }), res);
    expect(res.statusCode).toBe(403);

    // founder → list, newest first
    res = makeRes();
    await funnelHandler(req("GET", { headers: { cookie: cookieFor("founder@x.com") }, query: { resource: "certs" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.certs.map((c) => c.certId)).toEqual(["c2", "c1"]);
  });

  it("GET /api/funnel?resource=builds returns students' build plans (founder-gated, content only)", async () => {
    kv._store.set("students:emails", JSON.stringify(["ada@x.com", "blank@x.com"]));
    kv._store.set("state:ada@x.com", JSON.stringify({ student: { name: "Ada", batch: "fall-mw" }, build: { scenario: "flashcards", pain: "classmates cram and forget", pr: "Announcing FlashFast" } }));
    kv._store.set("state:blank@x.com", JSON.stringify({ student: { name: "Bo", batch: "fall-mw" }, build: { scenario: "", pain: "", pr: "" } })); // no content → excluded

    // non-founder → 403
    let res = makeRes();
    await funnelHandler(req("GET", { headers: { cookie: cookieFor("nobody@x.com") }, query: { resource: "builds" } }), res);
    expect(res.statusCode).toBe(403);

    // founder → only the plan with content
    res = makeRes();
    await funnelHandler(req("GET", { headers: { cookie: cookieFor("founder@x.com") }, query: { resource: "builds" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.builds).toHaveLength(1);
    expect(res.payload.builds[0]).toMatchObject({ name: "Ada", scenario: "flashcards", pain: "classmates cram and forget" });
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
