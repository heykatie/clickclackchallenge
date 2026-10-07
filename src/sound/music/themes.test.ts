import { describe, expect, it } from "vitest";
import { barEvents, barSeconds, THEMES, themeForScreen, type ThemeName } from "./themes";

const names = Object.keys(THEMES) as ThemeName[];

describe("themeForScreen", () => {
  it("plays cozy on Event Setup and Ready, adventure while typing, nostalgic on the boards, and victory on Results", () => {
    expect(themeForScreen("setup")).toBe("cozy");
    expect(themeForScreen("ready")).toBe("cozy");
    expect(themeForScreen("typing")).toBe("adventure");
    expect(themeForScreen("rolling")).toBe("nostalgic");
    expect(themeForScreen("leaderboard")).toBe("nostalgic");
    expect(themeForScreen("results")).toBe("victory");
  });
});

describe("themes", () => {
  it("are the four planned moods, with the adventure fastest and the nostalgic slowest", () => {
    expect(names.sort()).toEqual(["adventure", "cozy", "nostalgic", "victory"]);
    const tempos = Object.fromEntries(names.map((name) => [name, THEMES[name].bpm]));
    expect(Math.max(...Object.values(tempos))).toBe(tempos.adventure);
    expect(Math.min(...Object.values(tempos))).toBe(tempos.nostalgic);
  });

  it("share one instrument set, so they sound like the same game", () => {
    for (const name of names) {
      const instruments = new Set(Array.from({ length: 8 }, (_, bar) => barEvents(name, bar).map((event) => event.instrument)).flat());
      expect([...instruments].every((instrument) => ["keys", "bass", "bell", "kick", "snare", "hat"].includes(instrument))).toBe(true);
      expect(instruments.has("keys")).toBe(true);
      expect(instruments.has("bell")).toBe(true);
    }
  });
});

describe("barEvents", () => {
  it("keeps every note inside its bar, in time order, and loops after its chord cycle", () => {
    for (const name of names) {
      const length = THEMES[name].chords.length;
      for (let bar = 0; bar < length * 2; bar += 1) {
        const events = barEvents(name, bar);
        expect(events.length).toBeGreaterThan(0);
        for (const event of events) {
          expect(event.at).toBeGreaterThanOrEqual(0);
          expect(event.at).toBeLessThan(barSeconds(name));
          expect(event.seconds).toBeGreaterThan(0);
        }
        expect(events.map((event) => event.at)).toEqual([...events.map((event) => event.at)].sort((a, b) => a - b));
      }
      expect(barEvents(name, length)).toEqual(barEvents(name, 0));
    }
  });

  it("is the same every time, so the loop never surprises", () => {
    expect(barEvents("adventure", 3)).toEqual(barEvents("adventure", 3));
  });

  it("drives the adventure with more hi-hats than the cozy theme", () => {
    const hats = (name: ThemeName) => barEvents(name, 0).filter((event) => event.instrument === "hat").length;
    expect(hats("adventure")).toBeGreaterThan(hats("cozy"));
  });
});
