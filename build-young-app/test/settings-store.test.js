import { describe, it, expect } from "vitest";
import { defaultSettings, sanitizeSettings, loadSettings, saveSettings } from "../api/_lib/settingsStore.js";
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

  it("loadSettings falls back to defaults when KV is unconfigured", async () => {
    expect(await loadSettings()).toEqual(SITE_DEFAULTS);
  });

  it("saveSettings refuses an unconfigured store", async () => {
    const res = await saveSettings({ calendlyUrl: "https://cal.com/x" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/store not configured/);
  });
});
