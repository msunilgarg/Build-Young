import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// SPECS/015 — adding a NEW admin auto-provisions their account + emails a set-password invite.
// We mock the email module so we assert the handler's invite LOGIC (delta, skip-if-has-password,
// best-effort) without real Resend/token plumbing; the fake KV backs provisioning + the allowlist.
vi.mock("../api/_lib/sendSetPassword.js", () => ({
  sendSetPasswordEmail: vi.fn(async () => ({ ok: true })),
}));

import funnelHandler from "../api/funnel.js";
import { signSession, SESSION_COOKIE, putUser, getUser } from "../api/_lib/auth.js";
import { sendSetPasswordEmail } from "../api/_lib/sendSetPassword.js";

const cookieFor = (email) => `${SESSION_COOKIE}=${signSession(email)}`;

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
const req = (method, { query = {}, body = null, headers = {} } = {}) => ({ method, query, body, headers });
// Build the cookie at CALL time — signSession needs AUTH_SECRET, which beforeEach sets after import.
const saveAdmins = async (emails) => {
  const res = makeRes();
  await funnelHandler(req("PUT", { headers: { cookie: cookieFor("founder@x.com") }, query: { resource: "founders" }, body: { emails } }), res);
  return res;
};

describe("admin auto-invite (SPECS/015)", () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = "https://fake.kv";
    process.env.KV_REST_API_TOKEN = "fake-token";
    process.env.AUTH_SECRET = "endpoint-test-secret";
    process.env.FOUNDER_EMAILS = "founder@x.com"; // permanent bootstrap admin
    vi.stubGlobal("fetch", fakeKv());
    sendSetPasswordEmail.mockClear();
    sendSetPasswordEmail.mockResolvedValue({ ok: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
    delete process.env.AUTH_SECRET; delete process.env.FOUNDER_EMAILS;
  });

  it("adding a brand-new admin provisions the account AND sends an admin invite", async () => {
    const res = await saveAdmins(["alice@x.com"]);
    expect(res.statusCode).toBe(200);
    expect(res.payload.invited).toEqual(["alice@x.com"]);
    expect(res.payload.inviteFailed).toEqual([]);
    // provisioned in KV…
    expect(await getUser("alice@x.com")).toMatchObject({ email: "alice@x.com" });
    // …and emailed with the ADMIN-flavored copy
    expect(sendSetPasswordEmail).toHaveBeenCalledTimes(1);
    expect(sendSetPasswordEmail).toHaveBeenCalledWith(expect.objectContaining({ email: "alice@x.com", isAdmin: true }));
  });

  it("re-saving with no new emails invites nobody (no spam)", async () => {
    await saveAdmins(["alice@x.com"]);
    sendSetPasswordEmail.mockClear();
    const res = await saveAdmins(["alice@x.com"]); // unchanged
    expect(res.statusCode).toBe(200);
    expect(res.payload.invited).toEqual([]);
    expect(sendSetPasswordEmail).not.toHaveBeenCalled();
  });

  it("the env bootstrap admin is never emailed", async () => {
    const res = await saveAdmins([]); // founder@x.com stays (env), nothing added
    expect(res.payload.founders).toContain("founder@x.com");
    expect(res.payload.invited).toEqual([]);
    expect(sendSetPasswordEmail).not.toHaveBeenCalled();
  });

  it("promoting a user who already has a password elevates silently (no invite)", async () => {
    await putUser("bob@x.com", { name: "Bob", passwordHash: "scrypt$aa$bb" });
    sendSetPasswordEmail.mockClear();
    const res = await saveAdmins(["bob@x.com"]);
    expect(res.statusCode).toBe(200);
    expect(res.payload.founders).toContain("bob@x.com");
    expect(res.payload.invited).toEqual([]);
    expect(sendSetPasswordEmail).not.toHaveBeenCalled();
  });

  it("a send failure is reported in inviteFailed but the save still succeeds", async () => {
    sendSetPasswordEmail.mockResolvedValueOnce({ ok: false, detail: "missing RESEND_API_KEY" });
    const res = await saveAdmins(["carol@x.com"]);
    expect(res.statusCode).toBe(200);
    expect(res.payload.invited).toEqual([]);
    expect(res.payload.inviteFailed).toEqual(["carol@x.com"]);
    // still provisioned so they can use "Forgot password?" as a fallback
    expect(await getUser("carol@x.com")).toMatchObject({ email: "carol@x.com" });
  });

  it("a non-founder cannot trigger invites", async () => {
    const res = makeRes();
    await funnelHandler(req("PUT", { headers: { cookie: cookieFor("nobody@x.com") }, query: { resource: "founders" }, body: { emails: ["x@x.com"] } }), res);
    expect(res.statusCode).toBe(403);
    expect(sendSetPasswordEmail).not.toHaveBeenCalled();
  });
});
