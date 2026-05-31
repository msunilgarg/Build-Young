import { describe, it, expect, vi, afterEach } from "vitest";
import { getRoster } from "../api/_lib/roster.js";

const ENV = { KV_REST_API_URL: "https://kv.example.com", KV_REST_API_TOKEN: "tok_test" };

describe("getRoster — store first, ROSTER_JSON fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
    delete process.env.ROSTER_JSON;
  });

  it("returns enrollments from the durable store when present", async () => {
    Object.assign(process.env, ENV);
    const stored = ["a@x.com", JSON.stringify({ email: "a@x.com", name: "Avery", batchId: "fall-hs-wed" })];
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ result: stored }) })));
    const roster = await getRoster("fall-hs-wed");
    expect(roster).toEqual([{ email: "a@x.com", name: "Avery", batchId: "fall-hs-wed" }]);
  });

  it("falls back to ROSTER_JSON when the store is empty/unconfigured, filtered by batch", async () => {
    process.env.ROSTER_JSON = JSON.stringify([
      { email: "a@x.com", name: "Avery", batchId: "fall-hs-wed" },
      { email: "b@x.com", batchId: "winter-ms-mon" },
    ]);
    const roster = await getRoster("winter-ms-mon");
    expect(roster).toEqual([{ email: "b@x.com", name: "there", batchId: "winter-ms-mon" }]);
  });

  it("returns [] when neither source has data", async () => {
    expect(await getRoster("spring-hs-thu")).toEqual([]);
  });
});
