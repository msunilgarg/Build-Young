import { describe, it, expect, afterEach } from "vitest";
import { createAudience, addContact, removeContact } from "../api/_lib/resendAudience.js";

afterEach(() => { delete process.env.RESEND_API_KEY; });

describe("createAudience", () => {
  it("returns null with no API key (never calls fetch)", async () => {
    let called = false;
    const out = await createAudience("Fall MW", async () => { called = true; return {}; });
    expect(out).toBeNull();
    expect(called).toBe(false);
  });

  it("POSTs to /audiences and returns the new id", async () => {
    process.env.RESEND_API_KEY = "re_test";
    let url, opts;
    const out = await createAudience("Fall MW", async (u, o) => { url = u; opts = o; return { ok: true, json: async () => ({ id: "aud_123", name: "Fall MW" }) }; });
    expect(url).toBe("https://api.resend.com/audiences");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(opts.body).name).toBe("Fall MW");
    expect(out).toBe("aud_123");
  });

  it("returns null on a non-OK response or when fetch throws", async () => {
    process.env.RESEND_API_KEY = "re_test";
    expect(await createAudience("x", async () => ({ ok: false, json: async () => ({}) }))).toBeNull();
    expect(await createAudience("x", async () => { throw new Error("net"); })).toBeNull();
  });
});

describe("addContact", () => {
  it("returns false with no key, no audience, or no email", async () => {
    expect(await addContact("aud_1", { email: "a@x.com" }, async () => ({ ok: true }))).toBe(false); // no key
    process.env.RESEND_API_KEY = "re_test";
    expect(await addContact("", { email: "a@x.com" }, async () => ({ ok: true }))).toBe(false);
    expect(await addContact("aud_1", { email: "" }, async () => ({ ok: true }))).toBe(false);
  });

  it("POSTs the contact to the audience and returns true", async () => {
    process.env.RESEND_API_KEY = "re_test";
    let url, opts;
    const ok = await addContact("aud_123", { email: "jo@x.com", firstName: "Jo", lastName: "Lee" }, async (u, o) => { url = u; opts = o; return { ok: true, json: async () => ({ id: "c_1" }) }; });
    expect(url).toBe("https://api.resend.com/audiences/aud_123/contacts");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.email).toBe("jo@x.com");
    expect(body.first_name).toBe("Jo");
    expect(body.last_name).toBe("Lee");
    expect(ok).toBe(true);
  });

  it("returns false on a non-OK response or when fetch throws", async () => {
    process.env.RESEND_API_KEY = "re_test";
    expect(await addContact("aud_1", { email: "a@x.com" }, async () => ({ ok: false }))).toBe(false);
    expect(await addContact("aud_1", { email: "a@x.com" }, async () => { throw new Error("net"); })).toBe(false);
  });
});

describe("removeContact", () => {
  it("returns false with no key, no audience, or no email", async () => {
    expect(await removeContact("aud_1", "a@x.com", async () => ({ ok: true }))).toBe(false); // no key
    process.env.RESEND_API_KEY = "re_test";
    expect(await removeContact("", "a@x.com", async () => ({ ok: true }))).toBe(false);
    expect(await removeContact("aud_1", "", async () => ({ ok: true }))).toBe(false);
  });

  it("DELETEs the contact by email from the audience and returns true", async () => {
    process.env.RESEND_API_KEY = "re_test";
    let url, opts;
    const ok = await removeContact("aud_123", "jo@x.com", async (u, o) => { url = u; opts = o; return { ok: true, json: async () => ({ deleted: true }) }; });
    expect(url).toBe("https://api.resend.com/audiences/aud_123/contacts/jo%40x.com");
    expect(opts.method).toBe("DELETE");
    expect(opts.headers.Authorization).toBe("Bearer re_test");
    expect(ok).toBe(true);
  });

  it("returns false on a non-OK response or when fetch throws", async () => {
    process.env.RESEND_API_KEY = "re_test";
    expect(await removeContact("aud_1", "a@x.com", async () => ({ ok: false }))).toBe(false);
    expect(await removeContact("aud_1", "a@x.com", async () => { throw new Error("net"); })).toBe(false);
  });
});
