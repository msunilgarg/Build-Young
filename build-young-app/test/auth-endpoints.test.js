import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import setPasswordHandler from "../api/auth/set-password.js";
import loginHandler from "../api/auth/login.js";
import meHandler from "../api/auth/me.js";
import stateHandler from "../api/state.js";
import { createPasswordToken, putUser, SESSION_COOKIE } from "../api/_lib/auth.js";

// A tiny in-memory fake of the KV REST API, driven through the global `fetch` that kv.js uses.
// Supports the handful of commands the auth/state paths issue.
function fakeKv() {
  const store = new Map();
  const fn = vi.fn(async (_url, opts) => {
    const [cmd, key, ...rest] = JSON.parse(opts.body);
    let result = null;
    switch (cmd) {
      case "SET": store.set(key, rest[0]); result = "OK"; break;            // ignores EX in tests
      case "GET": result = store.has(key) ? store.get(key) : null; break;
      case "DEL": result = store.delete(key) ? 1 : 0; break;
      case "GETDEL": result = store.has(key) ? store.get(key) : null; store.delete(key); break;
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
const post = (body, headers = {}) => ({ method: "POST", body, headers, socket: { remoteAddress: "1.1.1.1" } });
const cookieFrom = (res) => String(res.headers["Set-Cookie"] || "").split(";")[0]; // "by_session=…"

let ipN = 0;
const ip = () => `9.9.9.${++ipN}`;

describe("auth endpoints (with fake KV)", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "endpoint-test-secret";
    process.env.KV_REST_API_URL = "https://fake.kv";
    process.env.KV_REST_API_TOKEN = "fake-token";
    vi.stubGlobal("fetch", fakeKv());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.AUTH_SECRET;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("set-password: a valid token sets the password and signs the student in", async () => {
    await putUser("jordan@example.com", { name: "Jordan Rivera", batchId: "fall-hs-wed" });
    const token = await createPasswordToken("jordan@example.com");

    const res = makeRes();
    await setPasswordHandler({ ...post({ token, password: "hunter2hunter2" }), headers: { "x-forwarded-for": ip() } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.user).toMatchObject({ email: "jordan@example.com", batchId: "fall-hs-wed" });
    expect(res.headers["Set-Cookie"]).toContain(`${SESSION_COOKIE}=`);
  });

  it("set-password: the token is single-use (replay is rejected)", async () => {
    await putUser("a@b.com", { name: "A" });
    const token = await createPasswordToken("a@b.com");
    const r1 = makeRes();
    await setPasswordHandler({ ...post({ token, password: "longenough1" }), headers: { "x-forwarded-for": ip() } }, r1);
    expect(r1.statusCode).toBe(200);
    const r2 = makeRes();
    await setPasswordHandler({ ...post({ token, password: "longenough1" }), headers: { "x-forwarded-for": ip() } }, r2);
    expect(r2.statusCode).toBe(400);
  });

  it("set-password: rejects a too-short password before consuming the token", async () => {
    const token = await createPasswordToken("c@d.com");
    const res = makeRes();
    await setPasswordHandler({ ...post({ token, password: "short" }), headers: { "x-forwarded-for": ip() } }, res);
    expect(res.statusCode).toBe(400);
  });

  it("login: succeeds with the right password, 401s on the wrong one (generic message)", async () => {
    await putUser("kai@example.com", { name: "Kai", batchId: "winter-ms-mon" });
    const token = await createPasswordToken("kai@example.com");
    await setPasswordHandler({ ...post({ token, password: "correcthorse" }), headers: { "x-forwarded-for": ip() } }, makeRes());

    const ok = makeRes();
    await loginHandler({ ...post({ email: "Kai@example.com", password: "correcthorse" }), headers: { "x-forwarded-for": ip() } }, ok);
    expect(ok.statusCode).toBe(200);
    expect(ok.headers["Set-Cookie"]).toContain(`${SESSION_COOKIE}=`);

    const bad = makeRes();
    await loginHandler({ ...post({ email: "kai@example.com", password: "nope" }), headers: { "x-forwarded-for": ip() } }, bad);
    expect(bad.statusCode).toBe(401);
    expect(bad.payload.error).toBe("Incorrect email or password.");
  });

  it("login: does not reveal that an unknown account is unknown", async () => {
    const res = makeRes();
    await loginHandler({ ...post({ email: "ghost@example.com", password: "whatever123" }), headers: { "x-forwarded-for": ip() } }, res);
    expect(res.statusCode).toBe(401);
    expect(res.payload.error).toBe("Incorrect email or password.");
  });

  it("me + state: a session cookie gates and round-trips per-user state", async () => {
    await putUser("sam@example.com", { name: "Sam", batchId: "fall-hs-thu" });
    const token = await createPasswordToken("sam@example.com");
    const setRes = makeRes();
    await setPasswordHandler({ ...post({ token, password: "passwordy1" }), headers: { "x-forwarded-for": ip() } }, setRes);
    const cookie = cookieFrom(setRes);

    // me → returns the user
    const me = makeRes();
    await meHandler({ method: "GET", headers: { cookie } }, me);
    expect(me.statusCode).toBe(200);
    expect(me.payload.user.email).toBe("sam@example.com");

    // state PUT then GET round-trips
    const put = makeRes();
    await stateHandler({ method: "PUT", headers: { cookie }, body: { state: { week: 5, cash: 1234 } } }, put);
    expect(put.statusCode).toBe(200);

    const get = makeRes();
    await stateHandler({ method: "GET", headers: { cookie } }, get);
    expect(get.statusCode).toBe(200);
    expect(get.payload.state).toEqual({ week: 5, cash: 1234 });
  });

  it("state + me: reject requests with no/invalid session", async () => {
    const noAuth = makeRes();
    await stateHandler({ method: "GET", headers: {} }, noAuth);
    expect(noAuth.statusCode).toBe(401);

    const badCookie = makeRes();
    await meHandler({ method: "GET", headers: { cookie: `${SESSION_COOKIE}=forged.token` } }, badCookie);
    expect(badCookie.statusCode).toBe(401);
  });
});
