import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addEnrollment, listEnrollments, listPartnerEnrollments, storeConfigured } from "../api/_lib/store.js";

const ENV = { KV_REST_API_URL: "https://kv.example.com", KV_REST_API_TOKEN: "tok_test" };

describe("enrollment store (Upstash/Vercel KV over REST)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("is a graceful no-op when not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(storeConfigured()).toBe(false);
    expect(await listEnrollments("fall-hs-wed")).toEqual([]);
    const res = await addEnrollment({ email: "a@b.com", name: "A", batchId: "fall-hs-wed" });
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("addEnrollment issues an idempotent HSET keyed by cohort + email", async () => {
    Object.assign(process.env, ENV);
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ result: 1 }) }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await addEnrollment({ email: "jordan@example.com", name: "Jordan Rivera", batchId: "fall-hs-wed" });
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(ENV.KV_REST_API_URL);
    expect(opts.headers.Authorization).toBe(`Bearer ${ENV.KV_REST_API_TOKEN}`);
    const cmd = JSON.parse(opts.body);
    expect(cmd[0]).toBe("HSET");
    expect(cmd[1]).toBe("enroll:fall-hs-wed");
    expect(cmd[2]).toBe("jordan@example.com");
    expect(JSON.parse(cmd[3])).toMatchObject({ email: "jordan@example.com", name: "Jordan Rivera", batchId: "fall-hs-wed" });
  });

  it("listEnrollments parses an HGETALL flat array into records", async () => {
    Object.assign(process.env, ENV);
    const stored = [
      "jordan@example.com", JSON.stringify({ email: "jordan@example.com", name: "Jordan Rivera", batchId: "fall-hs-wed" }),
      "sam@example.com", JSON.stringify({ email: "sam@example.com", name: "Sam Lee", batchId: "fall-hs-wed" }),
    ];
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ result: stored }) })));

    const roster = await listEnrollments("fall-hs-wed");
    expect(roster).toHaveLength(2);
    expect(roster[0]).toEqual({ email: "jordan@example.com", name: "Jordan Rivera", batchId: "fall-hs-wed" });
    expect(roster[1].email).toBe("sam@example.com");
  });

  it("a PARTNER enrollment is stored PENDING (onboarded:false) with a price+cut snapshot; the store only HSETs (sends nothing)", async () => {
    Object.assign(process.env, ENV);
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ result: 1 }) }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await addEnrollment({ email: "kid@school.org", name: "Kid", batchId: "fall-mw", paymentSource: "partner", partner: "outschool", externalRef: "OS-123", priceCents: 99900, cutPct: 0.3 });
    expect(res.ok).toBe(true);
    // The ONLY network call is the KV HSET — no email/audience side-effect exists in the store layer.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const rec = JSON.parse(JSON.parse(fetchMock.mock.calls[0][1].body)[3]);
    expect(rec).toMatchObject({ email: "kid@school.org", batchId: "fall-mw", paymentSource: "partner", partner: "outschool", externalRef: "OS-123", priceCents: 99900, cutPct: 0.3, onboarded: false });
  });

  it("listEnrollments passes partner fields through; listPartnerEnrollments filters to partner seats", async () => {
    Object.assign(process.env, ENV);
    const stored = [
      "direct@x.com", JSON.stringify({ email: "direct@x.com", name: "Direct", batchId: "fall-mw" }),
      "kid@school.org", JSON.stringify({ email: "kid@school.org", name: "Kid", batchId: "fall-mw", paymentSource: "partner", partner: "outschool", externalRef: "OS-1", priceCents: 99900, cutPct: 0.3, onboarded: false }),
    ];
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ result: stored }) })));

    const all = await listEnrollments("fall-mw");
    expect(all[0]).toEqual({ email: "direct@x.com", name: "Direct", batchId: "fall-mw" }); // direct = unchanged shape
    expect(all[1]).toMatchObject({ paymentSource: "partner", partner: "outschool", onboarded: false });

    const partnerOnly = await listPartnerEnrollments(["fall-mw"]);
    expect(partnerOnly).toHaveLength(1);
    expect(partnerOnly[0].email).toBe("kid@school.org");
  });

  it("also accepts the UPSTASH_* env var names", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://up.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok_up";
    expect(storeConfigured()).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ result: [] }) })));
    expect(await listEnrollments("x")).toEqual([]);
  });
});
