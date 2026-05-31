import { describe, it, expect } from "vitest";
import { mediaDrip, MEDIA, marketEventFor, weekResources } from "../src/marketMedia.js";
import { mediaDrip as appMediaDrip, MEDIA as appMEDIA } from "../src/App.jsx";

const studentState = (week) => ({ phase: "course", week, checkin: 0, student: { name: "Jordan Rivera" } });
// The cron picks the email whose `day` matches the dayOffset (3 → breaking, 2 → analysis, 1 → challenge).
const pickByOffset = (week, offset) => mediaDrip(studentState(week), null).find((m) => m.day === offset);

describe("App.jsx re-exports the single-sourced media", () => {
  it("exposes the SAME mediaDrip + MEDIA as marketMedia.js (single source of truth)", () => {
    expect(appMediaDrip).toBe(mediaDrip);
    expect(appMEDIA).toBe(MEDIA);
  });
});

describe("media content selection per dayOffset", () => {
  it("dayOffset 3 → breaking news that names the event", () => {
    const m = pickByOffset(3, 3); // Week 3 = "The Fed hikes rates"
    expect(m.day).toBe(3);
    expect(m.when).toBe("3 days before class");
    expect(m.subject).toContain("Breaking");
    expect(m.subject).toContain("The Fed hikes rates");
    expect(m.type).toBe("media");
  });

  it("dayOffset 2 → analysis email about what it means for your money", () => {
    const m = pickByOffset(3, 2);
    expect(m.day).toBe(2);
    expect(m.when).toBe("2 days before class");
    expect(m.subject.toLowerCase()).toContain("means for your money");
  });

  it("dayOffset 1 → research challenge for class tomorrow", () => {
    const m = pickByOffset(3, 1);
    expect(m.day).toBe(1);
    expect(m.when).toBe("1 day before class");
    expect(m.subject.toLowerCase()).toContain("class tomorrow");
    // the challenge carries the event's research question
    expect(m.body).toContain(MEDIA["The Fed hikes rates"].question.slice(0, 30));
  });

  it("each weekly event (W3–12) has all three offsets with https resources, personalized", () => {
    for (let w = 3; w <= 12; w++) {
      const event = marketEventFor("course", w, 0).h;
      for (const offset of [3, 2, 1]) {
        const m = pickByOffset(w, offset);
        expect(m, `week ${w} offset ${offset}`).toBeTruthy();
        expect(m.event).toBe(event);
        expect(m.body).toContain("Jordan");
        expect(m.resources.length).toBeGreaterThan(0);
        for (const r of m.resources) expect(r.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("uses the configurable newsroom from-address", () => {
    const custom = mediaDrip(studentState(3), null, { fromEmail: "news@builtyoung.com" });
    expect(custom[0].from).toBe("Built Young Newsroom <news@builtyoung.com>");
    // default keeps the historical address so re-exported content is unchanged
    expect(pickByOffset(3, 3).from).toBe("Built Young Newsroom <team@builtyoung.com>");
  });
});

describe("weekResources — per-week event resources for the dashboard hub", () => {
  it("returns the event's resources for live-market weeks (3–12), matching the drip", () => {
    for (let wk = 3; wk <= 12; wk++) {
      const res = weekResources(wk);
      expect(res.length, `week ${wk}`).toBeGreaterThan(0);
      const drip = mediaDrip(studentState(wk), null);
      // same links surfaced in the hub as the emails send
      expect(res).toEqual(drip[0].resources);
      for (const r of res) {
        expect(r.label).toBeTruthy();
        expect(r.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("returns no resources for the flat setup weeks (1–2)", () => {
    expect(weekResources(1)).toEqual([]);
    expect(weekResources(2)).toEqual([]);
  });
});
