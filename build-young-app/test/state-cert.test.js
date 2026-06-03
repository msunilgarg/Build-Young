import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import stateHandler from "../api/state.js";
import { signSession, SESSION_COOKIE } from "../api/_lib/auth.js";

// Verifies the completion certificate is minted (and returned) when a graduated state is saved,
// and that re-saving doesn't mint a second one. KV + email are faked via global fetch.
const cookieFor = (email) => `${SESSION_COOKIE}=${signSession(email)}`;

function fakeKv() {
  const store = new Map();
  const fn = vi.fn(async (url, opts) => {
    // Resend (email) endpoint — pretend it succeeds; we don't assert on it here.
    if (String(url).includes("resend.com")) return { ok: true, json: async () => ({ id: "e1" }) };
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
const makeRes = () => ({
  statusCode: 0, payload: null,
  status(c) { this.statusCode = c; return this; },
  json(o) { this.payload = o; return this; },
});
const req = (method, { body = null, headers = {} } = {}) => ({ method, body, headers });

let kv;
describe("/api/state — certificate on graduation", () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = "https://fake.kv";
    process.env.KV_REST_API_TOKEN = "tok";
    process.env.AUTH_SECRET = "state-cert-secret";
    kv = fakeKv();
    vi.stubGlobal("fetch", kv);
    kv._store.set("user:bani@x.com", JSON.stringify({ email: "bani@x.com", name: "Bani Garg", batchId: "fall-mw" }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  });

  it("mints + returns a cert when a graduated state is saved, and is idempotent", async () => {
    const grad = { phase: "checkin", week: 12, checkin: 0, student: { name: "anything", batch: "fall-mw" } };

    let res = makeRes();
    await stateHandler(req("PUT", { headers: { cookie: cookieFor("bani@x.com") }, body: { state: grad } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
    // cert uses the AUTHORITATIVE account name + cohort, not the client state's name
    expect(res.payload.cert).toMatchObject({ name: "Bani Garg", track: "Builders", season: "fall" });
    const firstId = res.payload.cert.certId;
    expect(firstId).toBeTruthy();

    // saving again → same cert (no duplicate)
    res = makeRes();
    await stateHandler(req("PUT", { headers: { cookie: cookieFor("bani@x.com") }, body: { state: grad } }), res);
    expect(res.payload.cert.certId).toBe(firstId);

    // GET returns the cert alongside the state
    res = makeRes();
    await stateHandler(req("GET", { headers: { cookie: cookieFor("bani@x.com") } }), res);
    expect(res.payload.cert.certId).toBe(firstId);
  });

  it("does NOT mint a cert mid-course (still in the 'course' phase)", async () => {
    const mid = { phase: "course", week: 5, student: { name: "Bani", batch: "fall-mw" } };
    const res = makeRes();
    await stateHandler(req("PUT", { headers: { cookie: cookieFor("bani@x.com") }, body: { state: mid } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.cert == null).toBe(true);
  });
});
