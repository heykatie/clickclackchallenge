import type { TestMode } from "../../db/persistence";
import type { BoothScreen } from "../../pwa/boothViewport";
import type { Instrument, Theme } from "./band";
import { ARCADE } from "./worlds/arcade";
import { FANTASY } from "./worlds/fantasy";
import { HOP } from "./worlds/hop";
import { STORYBOOK } from "./worlds/storybook";

export type { Instrument } from "./band";

/** Every tune: each game mode has its own world, and each world a tune for every page; Hop has its own secret. */
export const THEMES = { ...FANTASY, ...ARCADE, ...STORYBOOK, ...HOP } satisfies Record<string, Theme>;
export type ThemeName = keyof typeof THEMES;

/** Keycap Hop's dedicated loop — not tied to the active event's world. */
export const HOP_THEME = "hop-bounce" satisfies ThemeName;

const WORLDS: Record<TestMode, Record<BoothScreen, ThemeName>> = {
  // Standard: an arcade cabinet.
  words: {
    setup: "arcade-lounge",
    ready: "arcade-attract",
    typing: "arcade-chase",
    results: "arcade-clear",
    leaderboard: "arcade-hiscore",
    rolling: "arcade-demo",
  },
  // Famous Lines: a fantasy RPG.
  "famous-lines": {
    setup: "cozy",
    ready: "invite",
    typing: "adventure",
    results: "victory",
    leaderboard: "nostalgic",
    rolling: "starlight",
  },
  // Story: a storybook adventure.
  story: {
    setup: "story-fireside",
    ready: "story-once",
    typing: "story-chase",
    results: "story-end",
    leaderboard: "story-memories",
    rolling: "story-lullaby",
  },
};

/** The tune for a page in a game mode's world. */
export function themeForScreen(screen: BoothScreen, mode: TestMode): ThemeName {
  return WORLDS[mode][screen];
}

function theme(name: ThemeName): Theme {
  return THEMES[name];
}

export interface MusicEvent {
  /** Seconds after the bar starts. */
  at: number;
  seconds: number;
  instrument: Instrument;
  /** A MIDI note for pitched instruments; drums have none. */
  note: number | null;
  volume: number;
}

export function barSeconds(name: ThemeName): number {
  return (60 / theme(name).bpm) * 4;
}

/** The bar a theme starts on: -1 plays its intro once first, 0 starts straight on the loop. */
export function firstBar(name: ThemeName): number {
  return theme(name).intro ? -1 : 0;
}

/**
 * Every note in one bar of a theme, in time order. Bar -1 is the intro, if the theme has one. The chord cycle
 * repeats, so bar 4 of a 4-bar theme equals bar 0.
 */
export function barEvents(name: ThemeName, bar: number): MusicEvent[] {
  const tune = theme(name);
  if (bar < 0) {
    return introEvents(name);
  }
  const index = bar % tune.chords.length;
  const chord = tune.chords[index]!;
  const step = barSeconds(name) / 16;
  // Off-beat 16ths land a little late, which gives the loop its lazy swing.
  const at = (start: number) => (start + (start % 2 === 1 ? tune.swing : 0)) * step;
  const events: MusicEvent[] = [];
  const add = (instrument: Instrument, start: number, length: number, note: number | null, volume = 1) =>
    events.push({ at: at(start), seconds: length * step, instrument, note, volume: volume * level(tune, instrument) });

  for (const [start, length] of tune.keys) {
    chord.keys.forEach((note) => add("keys", start, length, note, 0.6));
  }
  for (const [start, length, offset = 0] of tune.bass) {
    add("bass", start, length, chord.bass + offset);
  }
  for (const [start, note, length] of tune.melody[index]!) {
    add(tune.lead ?? "bell", start, length, note);
  }
  for (const [start, note, length] of tune.sparkle?.[index] ?? []) {
    add("bell", start, length, note, 0.85);
  }
  tune.ostinato?.[index]?.forEach((offset, start) =>
    add(tune.ostinatoInstrument ?? "strings", start, 1, chord.bass + offset, start % 4 === 0 ? 1 : 0.75),
  );
  for (const start of tune.timpani ?? []) add("timpani", start, 4, chord.bass);
  if (index === tune.chords.length - 1) {
    const drum = tune.rollDrum ?? "timpani";
    tune.roll?.forEach((start, hit) => add(drum, start, 1, drum === "timpani" ? chord.bass : null, 0.5 + hit * 0.15));
  }
  for (const start of tune.drums.kick) add("kick", start, 2, null);
  for (const start of tune.drums.snare) add("snare", start, 2, null);
  for (const start of tune.drums.hat) add("hat", start, 1, null, start % 4 === 0 ? 1 : 0.7);

  return events.sort((left, right) => left.at - right.at);
}

function level(tune: Theme, instrument: Instrument): number {
  return (tune.mix[instrument] ?? 0) * (tune.gain ?? 1);
}

function introEvents(name: ThemeName): MusicEvent[] {
  const tune = theme(name);
  const step = barSeconds(name) / 16;
  const root = tune.chords[0]!.bass;
  const drum = tune.rollDrum ?? "timpani";
  const lead = tune.lead ?? "bell";
  const events: MusicEvent[] = [
    // A crescendo roll: each hit a little louder than the last.
    ...(tune.intro?.hits ?? []).map((start, hit, all) => ({
      at: start * step,
      seconds: step * 2,
      instrument: drum,
      note: drum === "timpani" ? root : null,
      volume: level(tune, drum) * (0.45 + (0.55 * hit) / Math.max(all.length - 1, 1)),
    })),
    ...(tune.intro?.lead ?? []).map(([start, note, length]) => ({
      at: start * step,
      seconds: length * step,
      instrument: lead,
      note,
      volume: level(tune, lead),
    })),
  ];
  return events.sort((left, right) => left.at - right.at);
}
