import { describe, expect, it } from "vitest";
import { barEvents, barSeconds, firstBar, HOP_THEME, THEMES, themeForScreen, type ThemeName } from "./themes";

const names = Object.keys(THEMES) as ThemeName[];
const pageNames: ThemeName[] = names.filter((name) => name !== HOP_THEME);

const MODES = ["words", "famous-lines", "story"] as const;
const PAGES = ["setup", "ready", "typing", "results", "leaderboard", "rolling"] as const;
const WORLD_LEADS = { words: "square", "famous-lines": "bell", story: "flute" } as const;

describe("themeForScreen", () => {
  it("keeps Famous Lines' fantasy themes: cozy, invite, adventure, victory, nostalgic, and starlight", () => {
    expect(PAGES.map((page) => themeForScreen(page, "famous-lines"))).toEqual([
      "cozy",
      "invite",
      "adventure",
      "victory",
      "nostalgic",
      "starlight",
    ]);
  });

  it("gives every mode its own tune on every page: 18 tunes, none shared", () => {
    const all = MODES.flatMap((mode) => PAGES.map((page) => themeForScreen(page, mode)));
    expect(new Set(all).size).toBe(18);
    expect(pageNames.sort()).toEqual([...all].sort());
  });
});

describe("Keycap Hop tune", () => {
  it("has its own hop-bounce loop, apart from every event world's pages", () => {
    expect(HOP_THEME).toBe("hop-bounce");
    expect(THEMES[HOP_THEME]).toBeTruthy();
    expect(pageNames.includes(HOP_THEME)).toBe(false);
  });

  it("bounces near Ready's tempo with a soft square lead and tiny bell sparkles", () => {
    const hop = THEMES[HOP_THEME];
    expect(hop.bpm).toBeGreaterThanOrEqual(100);
    expect(hop.bpm).toBeLessThanOrEqual(120);
    expect(hop.lead).toBe("square");
    const bar0 = barEvents(HOP_THEME, 0);
    expect(bar0.some((event) => event.instrument === "square")).toBe(true);
    expect(bar0.some((event) => event.instrument === "bell")).toBe(true);
    const square = bar0.filter((event) => event.instrument === "square");
    square.forEach((event) => expect(event.note).toBeLessThanOrEqual(74));
  });
});

describe("worlds", () => {
  it("play the race fastest in every world, so typing always feels like the rush", () => {
    for (const mode of MODES) {
      const typing = THEMES[themeForScreen("typing", mode)].bpm;
      for (const page of PAGES.filter((page) => page !== "typing")) {
        expect(THEMES[themeForScreen(page, mode)].bpm).toBeLessThan(typing);
      }
    }
  });

  it("share one band, keys, bass, and kick, while each world has its own lead", () => {
    for (const mode of MODES) {
      for (const page of PAGES) {
        const name = themeForScreen(page, mode);
        const instruments = new Set(
          Array.from({ length: 8 }, (_, bar) => barEvents(name, bar).map((event) => event.instrument)).flat(),
        );
        expect(instruments.has("keys")).toBe(true);
        expect(instruments.has("bass")).toBe(true);
        expect(instruments.has("kick")).toBe(true);
        // The fantasy battle swaps its music box for brass; every other tune plays its world's lead.
        const lead = name === "adventure" ? "brass" : WORLD_LEADS[mode];
        expect(instruments.has(lead)).toBe(true);
      }
    }
  });

  it("keep the new arcade and storybook leads low enough never to sound shrill: nothing above D5", () => {
    for (const name of names) {
      const lead = Array.from({ length: 8 }, (_, bar) => barEvents(name, bar))
        .flat()
        .filter((event) => ["square", "flute", "pluck"].includes(event.instrument));
      lead.forEach((event) => expect(event.note).toBeLessThanOrEqual(74));
    }
  });

  it("open each world's race with a one-time intro", () => {
    for (const mode of MODES) {
      expect(firstBar(themeForScreen("typing", mode))).toBe(-1);
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

  it("loops 8 bars: an A section on D minor, then a B section that climbs to a tense A major, and rolls back", () => {
    expect(THEMES.adventure.chords.map((chord) => chord.bass % 12)).toEqual([2, 2, 10, 0, 10, 0, 2, 9]);
    // C#, A major's third: the leading tone that pulls back to D minor.
    expect(bars[7]!.some((event) => event.note !== null && event.note % 12 === 1)).toBe(true);
    const timpani = (bar: number) => bars[bar]!.filter((event) => event.instrument === "timpani").length;
    expect(timpani(7)).toBeGreaterThan(timpani(0));
  });

  it("has a hook: the opening motif comes back in sequence two bars later, with the same rhythm", () => {
    const rhythm = (bar: number) => THEMES.adventure.melody[bar]!.map(([start, , length]) => [start, length]);
    expect(rhythm(2)).toEqual(rhythm(0));
    expect(THEMES.adventure.melody[2]![2]![1]).toBeGreaterThan(THEMES.adventure.melody[0]![2]![1]);
  });

  it("rocks a syncopated bass riff that jumps octaves", () => {
    const bass = bars[0]!.filter((event) => event.instrument === "bass");
    const step = barSeconds("adventure") / 16;
    expect(bass.some((event) => Math.round(event.at / step) % 2 === 1)).toBe(true);
    expect(new Set(bass.map((event) => event.note)).size).toBeGreaterThan(1);
    expect(Math.max(...bass.map((event) => event.note!)) - Math.min(...bass.map((event) => event.note!))).toBe(12);
  });

  it("rushes rising string arpeggios in the B section", () => {
    const strings = bars[4]!.filter((event) => event.instrument === "strings").map((event) => event.note!);
    const rises = strings.slice(1).filter((note, index) => note > strings[index]!).length;
    expect(rises).toBeGreaterThanOrEqual(9);
  });

  it("opens with a one-time intro: a timpani roll and a brass hit, before bar 0", () => {
    expect(firstBar("adventure")).toBe(-1);
    expect(firstBar("cozy")).toBe(0);
    const intro = barEvents("adventure", -1);
    expect(intro.filter((event) => event.instrument === "timpani").length).toBeGreaterThanOrEqual(6);
    expect(intro.some((event) => event.instrument === "brass")).toBe(true);
    expect(barEvents("adventure", 8)).toEqual(barEvents("adventure", 0));
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
