import { describe, it, expect } from "vitest";
import { defaultSettings, sanitizeSettings, loadSettings, saveSettings, defaultOps, sanitizeOps, loadOps, saveOps } from "../api/_lib/settingsStore.js";
import { SITE_DEFAULTS, SETTINGS_KEYS } from "../src/site.js";

// KV is unconfigured under test (no KV_REST_API_* env), so the store falls back to code defaults
// and refuses writes — exactly what we assert. The validation (sanitize) is pure.

describe("site settings store", () => {
  it("defaultSettings mirrors the code defaults", () => {
    expect(defaultSettings()).toEqual(SITE_DEFAULTS);
  });

  it("sanitizeSettings keeps only known keys, trims strings, and fills gaps from defaults", () => {
    const clean = sanitizeSettings({
      calendlyUrl: "  https://cal.com/x  ",
      contactEmail: "hi@x.com",
      junk: "drop me",
      linkedinUrl: 42, // wrong type → falls back to default
    });
    expect(Object.keys(clean).sort()).toEqual([...SETTINGS_KEYS].sort());
    expect(clean.calendlyUrl).toBe("https://cal.com/x"); // trimmed
    expect(clean.contactEmail).toBe("hi@x.com");
    expect(clean).not.toHaveProperty("junk");
    expect(clean.linkedinUrl).toBe(SITE_DEFAULTS.linkedinUrl); // bad type defaulted
  });

  it("preserves boolean flags (showcaseEnabled) instead of coercing them to strings", () => {
    expect(sanitizeSettings({ showcaseEnabled: true }).showcaseEnabled).toBe(true);
    expect(sanitizeSettings({ showcaseEnabled: "on" }).showcaseEnabled).toBe(true);
    expect(sanitizeSettings({ showcaseEnabled: "off" }).showcaseEnabled).toBe(false);
    expect(sanitizeSettings({}).showcaseEnabled).toBe(false); // default
    expect(sanitizeSettings({ showcaseEnabled: "garbage" }).showcaseEnabled).toBe(false); // default
  });

  it("loadSettings falls back to defaults when KV is unconfigured", async () => {
    expect(await loadSettings()).toEqual(SITE_DEFAULTS);
  });

  it("saveSettings refuses an unconfigured store", async () => {
    const res = await saveSettings({ calendlyUrl: "https://cal.com/x" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/store not configured/);
  });
});

describe("private ops settings store (notifications email + scenario agent)", () => {
  it("defaults: empty notifyEmail, agent on, Haiku model", () => {
    expect(defaultOps()).toEqual({ notifyEmail: "", scenarioAgentEnabled: true, scenarioModel: "claude-haiku-4-5" });
  });

  it("sanitizeOps trims the email, coerces the toggle, validates the model, drops junk", () => {
    expect(sanitizeOps({ notifyEmail: "  founder@x.com  ", junk: "x" }))
      .toEqual({ notifyEmail: "founder@x.com", scenarioAgentEnabled: true, scenarioModel: "claude-haiku-4-5" });
    // "off" string → false; a known model is kept; an unknown model falls back to the default
    expect(sanitizeOps({ scenarioAgentEnabled: "off", scenarioModel: "claude-opus-4-8" }))
      .toMatchObject({ scenarioAgentEnabled: false, scenarioModel: "claude-opus-4-8" });
    expect(sanitizeOps({ scenarioModel: "gpt-4o" }).scenarioModel).toBe("claude-haiku-4-5");
  });

  it("loadOps falls back to defaults + saveOps refuses an unconfigured store", async () => {
    expect(await loadOps()).toEqual({ notifyEmail: "", scenarioAgentEnabled: true, scenarioModel: "claude-haiku-4-5" });
    const res = await saveOps({ notifyEmail: "a@b.com" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/store not configured/);
  });
});
