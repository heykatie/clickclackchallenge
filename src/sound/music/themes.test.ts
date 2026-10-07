import { describe, expect, it } from "vitest";
import { barEvents, barSeconds, THEMES, themeForScreen, type ThemeName } from "./themes";

const names = Object.keys(THEMES) as ThemeName[];

describe("themeForScreen", () => {
  it("plays cozy on Event Setup, invite on Ready, adventure while typing, nostalgic on the boards, and victory on Results", () => {
    expect(themeForScreen("setup")).toBe("cozy");
    expect(themeForScreen("ready")).toBe("invite");
    expect(themeForScreen("typing")).toBe("adventure");
    expect(themeForScreen("rolling")).toBe("nostalgic");
    expect(themeForScreen("leaderboard")).toBe("nostalgic");
    expect(themeForScreen("results")).toBe("victory");
  });
});

describe("themes", () => {
  it("are the five planned moods, with the adventure fastest and the nostalgic slowest", () => {
    expect(names.sort()).toEqual(["adventure", "cozy", "invite", "nostalgic", "victory"]);
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

describe("invite theme", () => {
  it("is livelier than cozy but calmer than the adventure, so typing still feels like the rush", () => {
    expect(THEMES.invite.bpm).toBeGreaterThan(THEMES.cozy.bpm);
    expect(THEMES.invite.bpm).toBeLessThan(THEMES.adventure.bpm);
  });
});

describe("adventure theme", () => {
  it("is a boss fight: a galloping bass under a melody, ending each loop on a tense B major chord", () => {
    const bass = barEvents("adventure", 0).filter((event) => event.instrument === "bass");
    expect(bass.length).toBeGreaterThanOrEqual(12);
    expect(barEvents("adventure", 0).some((event) => event.instrument === "bell")).toBe(true);
    // D#, the major third of B: the leading tone that pulls back to E minor.
    const lastBar = barEvents("adventure", THEMES.adventure.chords.length - 1);
    expect(lastBar.some((event) => event.instrument === "keys" && event.note! % 12 === 3)).toBe(true);
  });
});

describe("dramatic typing theme", () => {
  it("doubles the melody an octave down and puts a low root under every chord", () => {
    for (let bar = 0; bar < THEMES.adventure.chords.length; bar += 1) {
      const lead = barEvents("adventure", bar).filter((event) => event.instrument === "bell");
      const written = THEMES.adventure.melody[bar]!.filter(([, note]) => note >= 70);
      expect(written.length).toBeGreaterThan(0);
      for (const [, note] of written) {
        expect(lead.some((low) => low.note === note - 12)).toBe(true);
      }
      expect(barEvents("adventure", bar).some((event) => event.instrument === "keys" && event.note! < 48)).toBe(true);
    }
  });

  it("rolls kicks under the snare into each new loop", () => {
    const last = barEvents("adventure", THEMES.adventure.chords.length - 1);
    const kickSteps = last.filter((event) => event.instrument === "kick").length;
    expect(kickSteps).toBeGreaterThan(barEvents("adventure", 0).filter((event) => event.instrument === "kick").length);
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
