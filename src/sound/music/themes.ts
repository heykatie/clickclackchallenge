import type { BoothScreen } from "../../pwa/boothViewport";

/**
 * Five lo-fi themes with fantasy touches, written for one shared band so they sound like the same game:
 * soft electric piano ("keys"), a round bass, a music-box "bell" lead, and dusty drums. The battle swaps the
 * music box for a low orchestra: brass, strings, and timpani. Notes are MIDI
 * numbers (60 is middle C). Each bar has 16 steps; steps are [start, length].
 */
export type ThemeName = "cozy" | "invite" | "adventure" | "nostalgic" | "victory";
export type Instrument = "keys" | "bass" | "bell" | "brass" | "strings" | "timpani" | "kick" | "snare" | "hat";

type Steps = readonly (readonly [start: number, length: number])[];
/** Bass steps may add semitones above the bar's bass note, for a riff. */
type BassSteps = readonly (readonly [start: number, length: number, offset?: number])[];
type Melody = readonly (readonly [start: number, note: number, length: number])[];

interface Theme {
  bpm: number;
  /** How far each off-beat 16th is pushed late, as a share of a 16th: the lo-fi lilt. */
  swing: number;
  /** One chord per bar: the keys voicing and the bass root. */
  chords: readonly { keys: readonly number[]; bass: number }[];
  keys: Steps;
  bass: BassSteps;
  /** One melody per bar, on the music-box lead. */
  melody: readonly Melody[];
  /** The instrument that plays the melody: the music box, or brass for the battle. Defaults to the music box. */
  lead?: "bell" | "brass";
  /** A string figure on every 16th, one per bar of the loop: semitones above the bar's bass note. */
  ostinato?: readonly (readonly number[])[];
  /** A bar played once before the loop: timpani hits on the first chord's bass note, and brass hits. */
  intro?: { timpani: readonly number[]; brass: Melody };
  /** Timpani hits in every bar, and a timpani roll in the last bar of the loop. */
  timpani?: readonly number[];
  roll?: readonly number[];
  drums: { kick: readonly number[]; snare: readonly number[]; hat: readonly number[] };
  /** Volume per instrument. Instruments a theme does not use are left out. */
  mix: Partial<Record<Instrument, number>>;
}

const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14];
const SIXTEENTHS = Array.from({ length: 16 }, (_, step) => step);
/** Battle strings: root and fifth, driving. */
const DRIVE = [12, 12, 19, 12, 12, 12, 19, 12, 12, 12, 19, 12, 19, 17, 19, 17];
/** Battle strings: rising runs up a major chord. */
const MAJOR_RUSH = [7, 12, 16, 19, 12, 16, 19, 24, 7, 12, 16, 19, 12, 16, 19, 24];

export const THEMES: Record<ThemeName, Theme> = {
  // Event Setup and Ready: cute and mellow, F major, an unhurried beat and a sparse music box.
  cozy: {
    bpm: 78,
    swing: 0.18,
    chords: [
      { keys: [53, 57, 60, 64], bass: 41 }, // Fmaj7
      { keys: [50, 53, 57, 60], bass: 38 }, // Dm7
      { keys: [55, 58, 62, 65], bass: 43 }, // Gm7
      { keys: [58, 60, 64, 67], bass: 36 }, // C7
    ],
    keys: [
      [0, 6],
      [8, 6],
    ],
    bass: [
      [0, 4],
      [10, 2],
      [12, 4],
    ],
    melody: [
      [
        [2, 72, 2],
        [6, 74, 2],
        [10, 77, 4],
      ],
      [
        [4, 76, 2],
        [8, 74, 2],
        [12, 72, 4],
      ],
      [
        [2, 70, 2],
        [6, 72, 2],
        [10, 74, 6],
      ],
      [
        [0, 72, 4],
        [8, 69, 8],
      ],
    ],
    drums: { kick: [0, 10], snare: [4, 12], hat: EIGHTHS },
    mix: { keys: 0.45, bass: 0.6, bell: 0.4, kick: 0.7, snare: 0.3, hat: 0.14 },
  },

  // Ready: "an adventure awaits". A heroic horn call climbing in fourths and fifths over D minor, ending each
  // loop on A so it hangs unresolved, like a quest about to begin. Livelier than cozy, calmer than typing.
  invite: {
    bpm: 100,
    swing: 0.12,
    chords: [
      { keys: [50, 53, 57, 62], bass: 38 }, // Dm
      { keys: [50, 53, 58, 62], bass: 34 }, // Bb
      { keys: [52, 55, 60, 64], bass: 36 }, // C
      { keys: [52, 57, 61, 64], bass: 33 }, // A
    ],
    keys: [
      [0, 3],
      [6, 2],
      [8, 3],
      [14, 2],
    ],
    bass: [
      [0, 2],
      [3, 1],
      [6, 2],
      [8, 2],
      [11, 1],
      [14, 2],
    ],
    melody: [
      [
        [0, 69, 2],
        [2, 74, 2],
        [4, 76, 2],
        [6, 77, 6],
        [12, 76, 2],
        [14, 74, 2],
      ],
      [
        [0, 77, 4],
        [4, 74, 2],
        [6, 70, 6],
        [12, 74, 4],
      ],
      [
        [0, 72, 2],
        [2, 76, 2],
        [4, 79, 4],
        [8, 84, 6],
        [14, 81, 2],
      ],
      [
        [0, 81, 6],
        [6, 79, 2],
        [8, 76, 2],
        [10, 73, 6],
      ],
    ],
    drums: { kick: [0, 6, 8, 14], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14, 15] },
    mix: { keys: 0.4, bass: 0.6, bell: 0.42, kick: 0.72, snare: 0.32, hat: 0.13 },
  },

  // Typing: a game battle, after classic JRPG, arcade, and Zelda boss themes. A one-time intro hits the timpani
  // and brass; then an 8-bar loop. The A section holds D minor under a driving string ostinato and a brass hook
  // that returns a step higher; the B section climbs B-flat, C, D minor to a tense A major over rushing string
  // arpeggios, and the timpani roll it back round. A syncopated bass riff jumps octaves throughout. The brass
  // stays at C5 or below, never shrill. Every note is original.
  adventure: {
    bpm: 150,
    swing: 0,
    lead: "brass",
    chords: [
      { keys: [50, 53, 57], bass: 38 }, // Dm
      { keys: [50, 53, 57], bass: 38 }, // Dm
      { keys: [50, 53, 58], bass: 34 }, // Bb
      { keys: [52, 55, 60], bass: 36 }, // C
      { keys: [50, 53, 58], bass: 34 }, // Bb
      { keys: [52, 55, 60], bass: 36 }, // C
      { keys: [50, 53, 57], bass: 38 }, // Dm
      { keys: [49, 52, 57], bass: 33 }, // A
    ],
    keys: [
      [0, 2],
      [8, 2],
    ],
    // Root and the octave above, off the beat: the riff that keeps the fight moving.
    bass: [
      [0, 2],
      [3, 1, 12],
      [4, 2],
      [6, 1],
      [7, 1, 12],
      [8, 2],
      [10, 1],
      [11, 1, 12],
      [12, 2],
      [14, 1, 12],
      [15, 1],
    ],
    // Semitones above the bass. The A section drives on root and fifth; the B section rushes up the chord.
    ostinato: [
      DRIVE,
      DRIVE,
      DRIVE,
      DRIVE,
      MAJOR_RUSH,
      MAJOR_RUSH,
      [7, 12, 15, 19, 12, 15, 19, 22, 7, 12, 15, 19, 12, 15, 19, 22],
      MAJOR_RUSH,
    ],
    melody: [
      // The hook: D, F, a long A, then down by step.
      [
        [0, 62, 2],
        [2, 65, 2],
        [4, 69, 6],
        [10, 67, 2],
        [12, 65, 2],
        [14, 64, 2],
      ],
      [
        [0, 62, 6],
        [8, 57, 2],
        [10, 60, 2],
        [12, 62, 4],
      ],
      // The hook again, reaching a step higher.
      [
        [0, 62, 2],
        [2, 65, 2],
        [4, 70, 6],
        [10, 69, 2],
        [12, 67, 2],
        [14, 65, 2],
      ],
      [
        [0, 67, 6],
        [6, 64, 2],
        [8, 72, 8],
      ],
      [
        [0, 70, 3],
        [3, 69, 1],
        [4, 70, 4],
        [8, 65, 4],
        [12, 62, 4],
      ],
      [
        [0, 72, 3],
        [3, 70, 1],
        [4, 72, 4],
        [8, 67, 4],
        [12, 64, 4],
      ],
      [
        [0, 65, 2],
        [2, 67, 2],
        [4, 69, 4],
        [8, 72, 4],
        [12, 69, 4],
      ],
      [
        [0, 69, 4],
        [4, 67, 2],
        [6, 64, 2],
        [8, 61, 4],
        [12, 64, 4],
      ],
    ],
    intro: {
      timpani: [0, 4, 8, 10, 12, 13, 14, 15],
      brass: [
        [0, 50, 3],
        [0, 62, 3],
        [12, 57, 4],
      ],
    },
    drums: { kick: [0, 6, 8, 14], snare: [4, 12], hat: SIXTEENTHS },
    timpani: [0, 8],
    roll: [12, 13, 14, 15],
    mix: { keys: 0.55, bass: 1, brass: 1.15, strings: 0.75, timpani: 1, kick: 0.85, snare: 0.35, hat: 0.03 },
  },

  // The idle list and the Leaderboard: nostalgic and sweet, C major, long chords and a slow melody.
  nostalgic: {
    bpm: 72,
    swing: 0.15,
    chords: [
      { keys: [52, 55, 59, 62], bass: 36 }, // Cmaj9
      { keys: [52, 55, 57, 60], bass: 33 }, // Am7
      { keys: [53, 57, 60, 64], bass: 38 }, // Dm7
      { keys: [53, 55, 60, 62], bass: 43 }, // G7sus
    ],
    keys: [
      [0, 8],
      [8, 8],
    ],
    bass: [
      [0, 8],
      [8, 6],
    ],
    melody: [
      [
        [0, 76, 6],
        [8, 74, 4],
        [12, 72, 4],
      ],
      [
        [0, 72, 8],
        [8, 69, 8],
      ],
      [
        [0, 74, 6],
        [8, 72, 4],
        [12, 69, 4],
      ],
      [[0, 67, 12]],
    ],
    drums: { kick: [0, 9], snare: [8], hat: [0, 4, 8, 12] },
    mix: { keys: 0.45, bass: 0.55, bell: 0.36, kick: 0.6, snare: 0.26, hat: 0.12 },
  },

  // Results: happy, relieved, and proud, D major, a bright fanfare that settles home.
  victory: {
    bpm: 92,
    swing: 0.1,
    chords: [
      { keys: [50, 54, 57, 62], bass: 38 }, // D
      { keys: [52, 57, 61, 64], bass: 37 }, // A/C#
      { keys: [50, 54, 59, 62], bass: 35 }, // Bm
      { keys: [50, 55, 59, 62], bass: 43 }, // G
    ],
    keys: [
      [0, 4],
      [4, 2],
      [8, 4],
      [12, 2],
      [14, 2],
    ],
    bass: [
      [0, 3],
      [4, 2],
      [8, 3],
      [12, 4],
    ],
    melody: [
      [
        [0, 74, 2],
        [2, 78, 2],
        [4, 81, 4],
        [8, 86, 8],
      ],
      [
        [0, 85, 4],
        [4, 81, 4],
        [8, 76, 8],
      ],
      [
        [0, 83, 2],
        [2, 81, 2],
        [4, 78, 4],
        [8, 74, 6],
      ],
      [
        [0, 79, 4],
        [4, 78, 2],
        [6, 76, 2],
        [8, 74, 8],
      ],
    ],
    drums: { kick: [0, 8, 10], snare: [4, 12], hat: EIGHTHS },
    mix: { keys: 0.42, bass: 0.6, bell: 0.4, kick: 0.72, snare: 0.32, hat: 0.13 },
  },
};

export function themeForScreen(screen: BoothScreen): ThemeName {
  switch (screen) {
    case "setup":
      return "cozy";
    case "ready":
      return "invite";
    case "typing":
      return "adventure";
    case "results":
      return "victory";
    default:
      return "nostalgic";
  }
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
  return (60 / THEMES[name].bpm) * 4;
}

/** The bar a theme starts on: -1 plays its intro once first, 0 starts straight on the loop. */
export function firstBar(name: ThemeName): number {
  return THEMES[name].intro ? -1 : 0;
}

/**
 * Every note in one bar of a theme, in time order. Bar -1 is the intro, if the theme has one. The chord cycle
 * repeats, so bar 4 of a 4-bar theme equals bar 0.
 */
export function barEvents(name: ThemeName, bar: number): MusicEvent[] {
  const theme = THEMES[name];
  if (bar < 0) {
    return introEvents(name);
  }
  const index = bar % theme.chords.length;
  const chord = theme.chords[index]!;
  const step = barSeconds(name) / 16;
  // Off-beat 16ths land a little late, which gives the loop its lazy swing.
  const at = (start: number) => (start + (start % 2 === 1 ? theme.swing : 0)) * step;
  const events: MusicEvent[] = [];
  const add = (instrument: Instrument, start: number, length: number, note: number | null, volume = 1) =>
    events.push({ at: at(start), seconds: length * step, instrument, note, volume: volume * (theme.mix[instrument] ?? 0) });

  for (const [start, length] of theme.keys) {
    chord.keys.forEach((note) => add("keys", start, length, note, 0.6));
  }
  for (const [start, length, offset = 0] of theme.bass) {
    add("bass", start, length, chord.bass + offset);
  }
  for (const [start, note, length] of theme.melody[index]!) {
    add(theme.lead ?? "bell", start, length, note);
  }
  theme.ostinato?.[index]?.forEach((offset, start) =>
    add("strings", start, 1, chord.bass + offset, start % 4 === 0 ? 1 : 0.75),
  );
  const last = index === theme.chords.length - 1;
  for (const start of theme.timpani ?? []) add("timpani", start, 4, chord.bass);
  if (last) {
    theme.roll?.forEach((start, hit) => add("timpani", start, 1, chord.bass, 0.5 + hit * 0.15));
  }
  for (const start of theme.drums.kick) add("kick", start, 2, null);
  for (const start of theme.drums.snare) add("snare", start, 2, null);
  for (const start of theme.drums.hat) add("hat", start, 1, null, start % 4 === 0 ? 1 : 0.7);

  return events.sort((left, right) => left.at - right.at);
}

function introEvents(name: ThemeName): MusicEvent[] {
  const theme = THEMES[name];
  const step = barSeconds(name) / 16;
  const root = theme.chords[0]!.bass;
  const volume = (instrument: Instrument) => theme.mix[instrument] ?? 0;
  const events: MusicEvent[] = [
    // A crescendo roll: each hit a little louder than the last.
    ...(theme.intro?.timpani ?? []).map((start, hit, all) => ({
      at: start * step,
      seconds: step * 2,
      instrument: "timpani" as const,
      note: root,
      volume: volume("timpani") * (0.45 + (0.55 * hit) / Math.max(all.length - 1, 1)),
    })),
    ...(theme.intro?.brass ?? []).map(([start, note, length]) => ({
      at: start * step,
      seconds: length * step,
      instrument: "brass" as const,
      note,
      volume: volume("brass"),
    })),
  ];
  return events.sort((left, right) => left.at - right.at);
}
