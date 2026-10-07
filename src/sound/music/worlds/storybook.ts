import { EIGHTHS, type Theme } from "../band";

/** A harp lilting up and down the chord. */
const LILT = [12, 19, 24, 19, 12, 19, 24, 19, 12, 19, 24, 19, 12, 19, 24, 19];

/**
 * Story: a storybook adventure. A soft flute over a plucked harp and the shared band, after Chrono Trigger and
 * folk-fantasy scores: lilting swing, the open sound of Mixolydian and Dorian modes, and a chase through the
 * woods for the race. Every note is original.
 */
export const STORYBOOK = {
  // Event Setup: a fireside tale. D major with a strong lilt, like a song in three.
  "story-fireside": {
    bpm: 72,
    swing: 0.33,
    lead: "flute",
    chords: [
      { keys: [50, 54, 57], bass: 38 }, // D
      { keys: [50, 55, 59], bass: 43 }, // G
      { keys: [50, 54, 59], bass: 47 }, // Bm
      { keys: [49, 52, 57], bass: 45 }, // A
    ],
    keys: [[0, 8]],
    bass: [
      [0, 6],
      [8, 4],
      [12, 4, 7],
    ],
    ostinato: [LILT, LILT, LILT, LILT],
    ostinatoInstrument: "pluck",
    melody: [
      [[0, 66, 4], [4, 69, 2], [6, 71, 2], [8, 69, 8]],
      [[0, 67, 4], [4, 71, 2], [6, 74, 2], [8, 71, 8]],
      [[0, 71, 2], [2, 69, 2], [4, 66, 4], [8, 62, 8]],
      [[0, 64, 4], [4, 66, 2], [6, 67, 2], [8, 69, 8]],
    ],
    drums: { kick: [0, 8], snare: [], hat: [0, 8] },
    mix: { keys: 0.4, bass: 0.55, flute: 0.42, pluck: 0.22, kick: 0.55, snare: 0, hat: 0.08 },
  },

  // Ready: "once upon a time". G Mixolydian: the F-major chord gives it an open, wandering-hero sound.
  "story-once": {
    bpm: 96,
    swing: 0.2,
    lead: "flute",
    chords: [
      { keys: [55, 59, 62], bass: 43 }, // G
      { keys: [53, 57, 60], bass: 41 }, // F
      { keys: [52, 55, 60], bass: 36 }, // C
      { keys: [55, 59, 62], bass: 43 }, // G
    ],
    keys: [
      [0, 3],
      [6, 2],
      [8, 3],
      [14, 2],
    ],
    bass: [
      [0, 3],
      [3, 1],
      [6, 2, 7],
      [8, 3],
      [11, 1],
      [14, 2, 7],
    ],
    ostinato: [LILT, LILT, LILT, LILT],
    ostinatoInstrument: "pluck",
    melody: [
      [[0, 67, 2], [2, 71, 2], [4, 74, 6], [12, 72, 2], [14, 71, 2]],
      [[0, 72, 4], [4, 69, 4], [8, 65, 4], [12, 69, 4]],
      [[0, 67, 2], [2, 72, 2], [4, 71, 4], [8, 67, 4], [12, 64, 4]],
      [[0, 67, 8], [8, 71, 4], [12, 74, 4]],
    ],
    drums: { kick: [0, 6, 8], snare: [4, 12], hat: EIGHTHS },
    mix: { keys: 0.4, bass: 0.6, flute: 0.45, pluck: 0.24, kick: 0.68, snare: 0.28, hat: 0.1 },
    // Evens out loudness with the other tunes.
    gain: 0.88,
  },

  // Typing: a chase through the woods. E Dorian at 144 BPM: the A-major chord's C# is the Dorian color. A timpani
  // intro, then 8 bars: a flute hook over E minor and A, and a B section climbing C, D, E minor to a tense B
  // major. A harp drives every 16th; the timpani roll it back round.
  "story-chase": {
    bpm: 144,
    swing: 0,
    lead: "flute",
    chords: [
      { keys: [52, 55, 59], bass: 40 }, // Em
      { keys: [49, 52, 57], bass: 45 }, // A
      { keys: [52, 55, 59], bass: 40 }, // Em
      { keys: [49, 52, 57], bass: 45 }, // A
      { keys: [48, 52, 55], bass: 36 }, // C
      { keys: [50, 54, 57], bass: 38 }, // D
      { keys: [52, 55, 59], bass: 40 }, // Em
      { keys: [51, 54, 59], bass: 35 }, // B
    ],
    keys: [
      [0, 2],
      [6, 1],
      [8, 2],
      [14, 1],
    ],
    bass: [
      [0, 2],
      [3, 1, 12],
      [4, 2],
      [6, 1, 7],
      [8, 2],
      [11, 1, 12],
      [12, 2],
      [14, 1, 7],
    ],
    ostinato: [
      [12, 15, 19, 24, 19, 15, 12, 15, 12, 15, 19, 24, 19, 15, 12, 15],
      [12, 16, 19, 24, 19, 16, 12, 16, 12, 16, 19, 24, 19, 16, 12, 16],
      [12, 15, 19, 24, 19, 15, 12, 15, 12, 15, 19, 24, 19, 15, 12, 15],
      [12, 16, 19, 24, 19, 16, 12, 16, 12, 16, 19, 24, 19, 16, 12, 16],
      [12, 16, 19, 24, 12, 16, 19, 24, 12, 16, 19, 24, 12, 16, 19, 24],
      [12, 16, 19, 24, 12, 16, 19, 24, 12, 16, 19, 24, 12, 16, 19, 24],
      [12, 15, 19, 24, 12, 15, 19, 24, 12, 15, 19, 24, 12, 15, 19, 24],
      [12, 16, 19, 24, 16, 19, 24, 28, 12, 16, 19, 24, 16, 19, 24, 28],
    ],
    ostinatoInstrument: "pluck",
    melody: [
      [[0, 64, 2], [2, 67, 2], [4, 71, 4], [8, 69, 2], [10, 67, 2], [12, 66, 4]],
      [[0, 64, 2], [2, 66, 2], [4, 69, 4], [8, 73, 4], [12, 69, 4]],
      [[0, 64, 2], [2, 67, 2], [4, 71, 4], [8, 74, 2], [10, 71, 2], [12, 69, 4]],
      [[0, 73, 4], [4, 69, 4], [8, 66, 4], [12, 69, 4]],
      [[0, 67, 2], [2, 72, 2], [4, 71, 2], [6, 72, 2], [8, 67, 4], [12, 64, 4]],
      [[0, 69, 2], [2, 74, 2], [4, 72, 2], [6, 74, 2], [8, 69, 4], [12, 66, 4]],
      [[0, 71, 4], [4, 67, 4], [8, 64, 4], [12, 67, 4]],
      [[0, 66, 4], [4, 69, 2], [6, 71, 2], [8, 63, 4], [12, 66, 4]],
    ],
    intro: {
      hits: [0, 4, 8, 10, 12, 13, 14, 15],
      lead: [[0, 64, 4], [8, 71, 4], [12, 67, 4]],
    },
    timpani: [0, 8],
    roll: [12, 13, 14, 15],
    drums: { kick: [0, 6, 8, 14], snare: [4, 12], hat: EIGHTHS },
    mix: { keys: 0.35, bass: 0.65, flute: 0.5, pluck: 0.3, timpani: 0.9, kick: 0.75, snare: 0.32, hat: 0.06 },
    // Evens out loudness with the other tunes; the races run a touch hotter.
    gain: 0.85,
  },

  // Results: "and they lived happily ever after". F major; B-flat minor's A-flat makes the ending sweet.
  "story-end": {
    bpm: 88,
    swing: 0.15,
    lead: "flute",
    chords: [
      { keys: [53, 57, 60], bass: 41 }, // F
      { keys: [53, 58, 62], bass: 46 }, // Bb
      { keys: [53, 56, 61], bass: 46 }, // Bbm
      { keys: [53, 57, 60], bass: 41 }, // F
    ],
    keys: [
      [0, 4],
      [4, 2],
      [8, 4],
      [12, 2],
    ],
    bass: [
      [0, 3],
      [4, 2, 7],
      [8, 3],
      [12, 4, 7],
    ],
    ostinato: [LILT, LILT, LILT, LILT],
    ostinatoInstrument: "pluck",
    melody: [
      [[0, 65, 2], [2, 69, 2], [4, 72, 6], [12, 70, 2], [14, 69, 2]],
      [[0, 70, 4], [4, 74, 4], [8, 72, 4], [12, 70, 4]],
      [[0, 68, 4], [4, 70, 2], [6, 68, 2], [8, 65, 8]],
      [[0, 65, 4], [4, 69, 4], [8, 72, 8]],
    ],
    drums: { kick: [0, 8, 10], snare: [4, 12], hat: EIGHTHS },
    mix: { keys: 0.42, bass: 0.6, flute: 0.45, pluck: 0.22, kick: 0.7, snare: 0.3, hat: 0.1 },
    // Evens out loudness with the other tunes.
    gain: 0.81,
  },

  // Leaderboard: memories of the journey. A minor, slow, the flute remembering.
  "story-memories": {
    bpm: 68,
    swing: 0.15,
    lead: "flute",
    chords: [
      { keys: [57, 60, 64], bass: 45 }, // Am
      { keys: [53, 57, 60], bass: 41 }, // F
      { keys: [52, 55, 60], bass: 36 }, // C
      { keys: [50, 55, 59], bass: 43 }, // G
    ],
    keys: [
      [0, 8],
      [8, 8],
    ],
    bass: [
      [0, 8],
      [8, 6],
    ],
    ostinato: [LILT, LILT, LILT, LILT],
    ostinatoInstrument: "pluck",
    melody: [
      [[0, 64, 6], [6, 67, 2], [8, 69, 8]],
      [[0, 72, 4], [4, 69, 4], [8, 65, 8]],
      [[0, 67, 4], [4, 64, 4], [8, 60, 8]],
      [[0, 62, 4], [4, 64, 2], [6, 67, 2], [8, 71, 8]],
    ],
    drums: { kick: [0, 9], snare: [8], hat: [0, 4, 8, 12] },
    mix: { keys: 0.45, bass: 0.55, flute: 0.4, pluck: 0.18, kick: 0.6, snare: 0.24, hat: 0.1 },
    // Evens out loudness with the other tunes.
    gain: 0.84,
  },

  // The idle high-score list: a storybook lullaby. E major, the slowest tune of all.
  "story-lullaby": {
    bpm: 62,
    swing: 0.2,
    lead: "flute",
    chords: [
      { keys: [52, 56, 59], bass: 40 }, // E
      { keys: [49, 52, 56], bass: 37 }, // C#m
      { keys: [49, 52, 57], bass: 45 }, // A
      { keys: [51, 54, 59], bass: 47 }, // B
    ],
    keys: [[0, 12]],
    bass: [
      [0, 8],
      [8, 8],
    ],
    ostinato: [LILT, LILT, LILT, LILT],
    ostinatoInstrument: "pluck",
    melody: [
      [[0, 68, 4], [4, 71, 4], [8, 73, 8]],
      [[0, 71, 4], [4, 68, 4], [8, 64, 8]],
      [[0, 64, 4], [4, 69, 4], [8, 68, 4], [12, 66, 4]],
      [[0, 66, 8], [8, 68, 4], [12, 71, 4]],
    ],
    drums: { kick: [0], snare: [8], hat: [0, 8] },
    mix: { keys: 0.42, bass: 0.5, flute: 0.38, pluck: 0.16, kick: 0.5, snare: 0.2, hat: 0.08 },
  },
} satisfies Record<string, Theme>;
