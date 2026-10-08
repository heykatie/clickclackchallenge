/**
 * The shared band every tune is written for, so they all sound like the same game: soft electric piano
 * ("keys"), a round bass, and dusty drums. Each world adds its own lead: a music box (fantasy), a mellow square
 * wave (arcade), or a flute over a plucked harp (storybook); the fantasy battle swaps in brass, strings, and
 * timpani. Notes are MIDI numbers (60 is middle C). Each bar has 16 steps; steps are [start, length].
 */
export type Instrument =
  | "keys"
  | "bass"
  | "bell"
  | "brass"
  | "strings"
  | "timpani"
  | "square"
  | "flute"
  | "pluck"
  | "kick"
  | "snare"
  | "hat";

export type Steps = readonly (readonly [start: number, length: number])[];
/** Bass steps may add semitones above the bar's bass note, for a riff. */
export type BassSteps = readonly (readonly [start: number, length: number, offset?: number])[];
export type Melody = readonly (readonly [start: number, note: number, length: number])[];

export interface Theme {
  bpm: number;
  /** How far each off-beat 16th is pushed late, as a share of a 16th: the lo-fi lilt. */
  swing: number;
  /** One chord per bar: the keys voicing and the bass root. */
  chords: readonly { keys: readonly number[]; bass: number }[];
  keys: Steps;
  bass: BassSteps;
  /** One melody per bar, on the lead. */
  melody: readonly Melody[];
  /** The instrument that plays the melody. Defaults to the music box. */
  lead?: "bell" | "brass" | "square" | "flute";
  /**
   * Sparse music-box accents over the lead (Keycap Hop): short bell winks, not a second full melody.
   * One phrase per bar of the loop.
   */
  sparkle?: readonly Melody[];
  /** A figure on every 16th, one per bar of the loop: semitones above the bar's bass note. */
  ostinato?: readonly (readonly number[])[];
  /** What plays the ostinato. Defaults to strings. */
  ostinatoInstrument?: "strings" | "pluck";
  /** A bar played once before the loop: drum hits (on the first chord's bass note, for timpani), and lead hits. */
  intro?: { hits: readonly number[]; lead: Melody };
  /** Timpani hits in every bar. */
  timpani?: readonly number[];
  /** A roll in the last bar of the loop, back into the start, on the roll drum. */
  roll?: readonly number[];
  /** The drum for the intro hits and the roll. Defaults to timpani. */
  rollDrum?: "timpani" | "snare";
  /** Scales every volume, to even out loudness between tunes. Defaults to 1. */
  gain?: number;
  drums: { kick: readonly number[]; snare: readonly number[]; hat: readonly number[] };
  /** Volume per instrument. Instruments a theme does not use are left out. */
  mix: Partial<Record<Instrument, number>>;
}


export const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14];
export const SIXTEENTHS = Array.from({ length: 16 }, (_, step) => step);
