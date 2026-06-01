import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import handler, { verifyStripeSignature } from "../api/stripe-webhook.js";

const SECRET = "whsec_test_secret";
const ENV = { KV_REST_API_URL: "https://kv.example.com", KV_REST_API_TOKEN: "tok_test" };

// Build a Stripe-style signature header for a raw body.
function sign(raw, secret = SECRET, t = Math.floor(Date.now() / 1000)) {
  const v1 = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

function makeReq({ raw = "{}", sig, method = "POST" } = {}) {
  return { method, rawBody: raw, headers: { "stripe-signature": sig ?? sign(raw) } };
}
function makeRes() {
  return {
    statusCode: 0, payload: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.payload = o; return this; },
  };
}
function checkoutEvent({ email = "jordan@example.com", name = "Jordan Rivera", batchId = "fall-hs-wed" } = {}) {
  return JSON.stringify({
    type: "checkout.session.completed",
    data: { object: { customer_details: { email, name }, metadata: { batchId } } },
  });
}

describe("verifyStripeSignature", () => {
  it("accepts a correctly-signed payload and rejects tampering / bad secret / staleness", () => {
    const raw = checkoutEvent();
    expect(verifyStripeSignature(raw, sign(raw), SECRET)).toBe(true);
    expect(verifyStripeSignature(raw + "x", sign(raw), SECRET)).toBe(false); // body tampered
    expect(verifyStripeSignature(raw, sign(raw, "wrong"), SECRET)).toBe(false); // wrong secret
    const old = Math.floor(Date.now() / 1000) - 9999;
    expect(verifyStripeSignature(raw, sign(raw, SECRET, old), SECRET)).toBe(false); // too old
    expect(verifyStripeSignature(raw, "garbage", SECRET)).toBe(false);
  });
});

describe("/api/stripe-webhook", () => {
  beforeEach(() => { process.env.STRIPE_WEBHOOK_SECRET = SECRET; Object.assign(process.env, ENV); });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  });

  it("rejects a request with a bad signature (400)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(makeReq({ raw: checkoutEvent(), sig: "t=1,v1=deadbeef" }), res);
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 500 when the signing secret is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = makeRes();
    await handler(makeReq({ raw: checkoutEvent() }), res);
    expect(res.statusCode).toBe(500);
  });

  it("stores the enrollment on a valid checkout.session.completed", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ result: 1 }) }));
    vi.stubGlobal("fetch", fetchMock);
    const raw = checkoutEvent({ email: "jordan@example.com", name: "Jordan Rivera", batchId: "fall-hs-wed" });
    const res = makeRes();
    await handler(makeReq({ raw, sig: sign(raw) }), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ received: true, stored: true, batchId: "fall-hs-wed" });
    // it wrote to the store
    const cmd = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(cmd[0]).toBe("HSET");
    expect(cmd[1]).toBe("enroll:fall-hs-wed");
    expect(cmd[2]).toBe("jordan@example.com");
  });

  it("derives batchId from client_reference_id and the ?enrolled= success URL too", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ result: 1 }) })));
    const evt = JSON.stringify({
      type: "checkout.session.completed",
      data: { object: { customer_email: "a@b.com", success_url: "https://buildyoung.com/?enrolled=winter-ms-mon" } },
    });
    const res = makeRes();
    await handler(makeReq({ raw: evt, sig: sign(evt) }), res);
    expect(res.payload).toMatchObject({ stored: true, batchId: "winter-ms-mon" });
  });

  it("acknowledges unrelated events without storing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const evt = JSON.stringify({ type: "payment_intent.succeeded", data: { object: {} } });
    const res = makeRes();
    await handler(makeReq({ raw: evt, sig: sign(evt) }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ received: true, ignored: "payment_intent.succeeded" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("acknowledges (no store) when the session lacks email or batchId", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const evt = JSON.stringify({ type: "checkout.session.completed", data: { object: { customer_details: { email: "a@b.com" } } } });
    const res = makeRes();
    await handler(makeReq({ raw: evt, sig: sign(evt) }), res);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ received: true, stored: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
