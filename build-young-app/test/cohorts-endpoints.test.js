import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import cohortsHandler from "../api/cohorts.js";
import funnelHandler from "../api/funnel.js";

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
const req = (method, { query = {}, body = null } = {}) => ({
  method, query, body, headers: {},
  on: (ev, cb) => { if (ev === "end") cb(); }, // readRaw fallback (unused when body is an object)
});

let kv;
describe("cohorts + founder-admin endpoints (fake KV)", () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = "https://fake.kv";
    process.env.KV_REST_API_TOKEN = "fake-token";
    process.env.FOUNDER_TOKEN = "founder-secret";
    kv = fakeKv();
    vi.stubGlobal("fetch", kv);
  });
  afterEach(() => { vi.restoreAllMocks(); delete process.env.FOUNDER_TOKEN; });

  it("GET /api/cohorts returns a catalog (defaults when KV is empty)", async () => {
    const res = makeRes();
    await cohortsHandler(req("GET"), res);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.payload.batches)).toBe(true);
    expect(res.payload.batches.length).toBeGreaterThan(0);
  });

  it("PUT /api/funnel saves the catalog (founder-gated) and GET reflects it", async () => {
    // wrong/no token → 403
    let res = makeRes();
    await funnelHandler(req("PUT", { body: { batches: [{ id: "x", price: 999 }] } }), res);
    expect(res.statusCode).toBe(403);

    // correct token → saves a sanitized catalog
    res = makeRes();
    await funnelHandler(req("PUT", {
      query: { token: "founder-secret" },
      body: { batches: [{ id: "only", season: "fall", track: "Builders", start: "Sep 7, 2026", day: "Mon & Wed", price: 1234, seats: 8, zoom: "", stripeLink: "" }], checkins: 2 },
    }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);

    // GET now returns exactly what was saved
    const g = makeRes();
    await cohortsHandler(req("GET"), g);
    expect(g.payload.batches).toHaveLength(1);
    expect(g.payload.batches[0]).toMatchObject({ id: "only", price: 1234, seats: 8 });
    expect(g.payload.checkins).toBe(2);
  });

  it("PUT 404s when FOUNDER_TOKEN is unset", async () => {
    delete process.env.FOUNDER_TOKEN;
    const res = makeRes();
    await funnelHandler(req("PUT", { query: { token: "x" }, body: { batches: [] } }), res);
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /api/funnel wipes a test account's user + state (founder-gated)", async () => {
    kv._store.set("user:a@x.com", "{}");
    kv._store.set("state:a@x.com", "{}");

    // wrong token → 403, account untouched
    let res = makeRes();
    await funnelHandler(req("DELETE", { query: { token: "nope", email: "a@x.com" } }), res);
    expect(res.statusCode).toBe(403);
    expect(kv._store.has("user:a@x.com")).toBe(true);

    // correct token → deleted
    res = makeRes();
    await funnelHandler(req("DELETE", { query: { token: "founder-secret", email: "A@x.com" } }), res); // normalized
    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
    expect(kv._store.has("user:a@x.com")).toBe(false);
    expect(kv._store.has("state:a@x.com")).toBe(false);
  });
});
