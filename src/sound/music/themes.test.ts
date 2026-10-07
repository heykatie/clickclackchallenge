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

  it("share one band, so they sound like the same game: the battle adds an orchestra in place of the music box", () => {
    for (const name of names) {
      const instruments = new Set(Array.from({ length: 8 }, (_, bar) => barEvents(name, bar).map((event) => event.instrument)).flat());
      expect(instruments.has("keys")).toBe(true);
      expect(instruments.has("bass")).toBe(true);
      expect(instruments.has("kick")).toBe(true);
      const lead = name === "adventure" ? ["brass", "strings", "timpani"] : ["bell"];
      lead.forEach((instrument) => expect(instruments.has(instrument as never)).toBe(true));
      const other = name === "adventure" ? ["bell"] : ["brass", "strings", "timpani"];
      other.forEach((instrument) => expect(instruments.has(instrument as never)).toBe(false));
    }
  });
});

describe("invite theme", () => {
  it("is livelier than cozy but calmer than the adventure, so typing still feels like the rush", () => {
    expect(THEMES.invite.bpm).toBeGreaterThan(THEMES.cozy.bpm);
    expect(THEMES.invite.bpm).toBeLessThan(THEMES.adventure.bpm);
  });
});

describe("battle theme", () => {
  const bars = Array.from({ length: THEMES.adventure.chords.length }, (_, bar) => barEvents("adventure", bar));

  it("races at a game-battle tempo, 140 to 170 BPM", () => {
    expect(THEMES.adventure.bpm).toBeGreaterThanOrEqual(140);
    expect(THEMES.adventure.bpm).toBeLessThanOrEqual(170);
  });

  it("keeps the brass lead low enough never to sound shrill: nothing above C5", () => {
    const lead = bars.flat().filter((event) => event.instrument === "brass");
    expect(lead.length).toBeGreaterThan(0);
    expect(Math.max(...lead.map((event) => event.note!))).toBeLessThanOrEqual(72);
  });

  it("drives a low string ostinato on every 16th", () => {
    for (const bar of bars) {
      const strings = bar.filter((event) => event.instrument === "strings");
      expect(strings).toHaveLength(16);
      expect(Math.max(...strings.map((event) => event.note!))).toBeLessThan(62);
    }
  });

  it("holds on D minor, then lifts through B-flat to C, and rolls the timpani back into the loop", () => {
    expect(THEMES.adventure.chords.map((chord) => chord.bass % 12)).toEqual([2, 2, 10, 0]);
    const timpani = (bar: number) => bars[bar]!.filter((event) => event.instrument === "timpani").length;
    expect(timpani(3)).toBeGreaterThan(timpani(0));
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
