import { EIGHTHS, SIXTEENTHS, type Theme } from "../band";

/** Bass that bounces between the root and the octave above, the classic arcade bounce. */
const OCTAVE_BOUNCE = EIGHTHS.map((step, index) => [step, 1, index % 2 === 1 ? 12 : 0] as const);

/**
 * Standard: an arcade cabinet. A mellow square-wave lead, kept low so it never shrills, over the shared band,
 * after classic arcade attract modes and Mega Man-style chases: octave-bouncing bass, catchy fanfares, and a
 * plucked arpeggio driving the race. Every note is original.
 */
export const ARCADE = {
  // Event Setup: an arcade lounge before the doors open. C major, bouncy, unhurried.
  "arcade-lounge": {
    bpm: 96,
    swing: 0.1,
    lead: "square",
    chords: [
      { keys: [48, 52, 55], bass: 36 }, // C
      { keys: [45, 48, 52], bass: 33 }, // Am
      { keys: [45, 48, 53], bass: 41 }, // F
      { keys: [47, 50, 55], bass: 43 }, // G
    ],
    keys: [
      [0, 2],
      [4, 2],
      [8, 2],
      [12, 2],
    ],
    bass: [
      [0, 2],
      [4, 2, 12],
      [8, 2],
      [12, 2, 12],
    ],
    melody: [
      [[0, 64, 2], [2, 67, 2], [4, 72, 4], [10, 71, 2], [12, 67, 4]],
      [[0, 69, 2], [2, 72, 2], [4, 69, 4], [8, 64, 4], [12, 67, 4]],
      [[0, 65, 2], [2, 69, 2], [4, 72, 4], [8, 69, 2], [10, 65, 2], [12, 69, 4]],
      [[0, 67, 4], [4, 71, 2], [6, 74, 2], [8, 72, 8]],
    ],
    drums: { kick: [0, 8], snare: [4, 12], hat: EIGHTHS },
    mix: { keys: 0.4, bass: 0.6, square: 0.45, kick: 0.7, snare: 0.3, hat: 0.1 },
  },

  // Ready: the attract mode. F major, four on the floor, a fanfare hook that calls "insert coin".
  "arcade-attract": {
    bpm: 120,
    swing: 0,
    lead: "square",
    chords: [
      { keys: [53, 57, 60], bass: 41 }, // F
      { keys: [50, 53, 57], bass: 38 }, // Dm
      { keys: [50, 53, 58], bass: 34 }, // Bb
      { keys: [52, 55, 60], bass: 36 }, // C
    ],
    keys: [
      [2, 1],
      [6, 1],
      [10, 1],
      [14, 1],
    ],
    bass: OCTAVE_BOUNCE,
    melody: [
      [[0, 65, 2], [2, 69, 2], [4, 72, 6], [12, 70, 2], [14, 69, 2]],
      [[0, 69, 4], [4, 65, 4], [8, 62, 4], [12, 65, 4]],
      [[0, 70, 2], [2, 72, 2], [4, 74, 6], [12, 72, 2], [14, 70, 2]],
      [[0, 72, 3], [3, 72, 1], [4, 72, 2], [6, 74, 2], [8, 72, 8]],
    ],
    drums: { kick: [0, 4, 8, 12], snare: [4, 12], hat: EIGHTHS },
    mix: { keys: 0.4, bass: 0.6, square: 0.45, kick: 0.7, snare: 0.3, hat: 0.1 },
  },

  // Typing: the high-score chase. A minor at 160 BPM, a one-time intro, then 8 bars: a hook over A minor, and a
  // B section that climbs to a tense E major. The bass bounces octaves on every 16th, Mega Man style, under a
  // plucked arpeggio; a snare roll throws it back to the top.
  "arcade-chase": {
    bpm: 160,
    swing: 0,
    lead: "square",
    chords: [
      { keys: [57, 60, 64], bass: 45 }, // Am
      { keys: [57, 60, 64], bass: 45 }, // Am
      { keys: [53, 57, 60], bass: 41 }, // F
      { keys: [55, 59, 62], bass: 43 }, // G
      { keys: [50, 53, 57], bass: 38 }, // Dm
      { keys: [53, 57, 60], bass: 41 }, // F
      { keys: [55, 59, 62], bass: 43 }, // G
      { keys: [52, 56, 59], bass: 40 }, // E
    ],
    keys: [
      [0, 1],
      [3, 1],
      [6, 1],
      [10, 1],
    ],
    bass: SIXTEENTHS.map((step) => [step, 1, step % 2 === 1 ? 12 : 0] as const),
    ostinato: [
      [12, 15, 19, 24, 12, 15, 19, 24, 12, 15, 19, 24, 12, 15, 19, 24],
      [12, 15, 19, 24, 12, 15, 19, 24, 12, 15, 19, 24, 24, 19, 15, 12],
      [12, 16, 19, 24, 12, 16, 19, 24, 12, 16, 19, 24, 12, 16, 19, 24],
      [12, 16, 19, 24, 12, 16, 19, 24, 12, 16, 19, 24, 24, 19, 16, 12],
      [12, 15, 19, 24, 12, 15, 19, 24, 12, 15, 19, 24, 12, 15, 19, 24],
      [12, 16, 19, 24, 12, 16, 19, 24, 12, 16, 19, 24, 12, 16, 19, 24],
      [12, 16, 19, 24, 12, 16, 19, 24, 12, 16, 19, 24, 12, 16, 19, 24],
      [12, 16, 19, 24, 16, 19, 24, 28, 12, 16, 19, 24, 16, 19, 24, 28],
    ],
    ostinatoInstrument: "pluck",
    melody: [
      [[0, 64, 2], [2, 69, 2], [4, 72, 2], [6, 71, 2], [8, 69, 4], [12, 67, 2], [14, 64, 2]],
      [[0, 65, 4], [4, 64, 2], [6, 62, 2], [8, 64, 8]],
      [[0, 65, 2], [2, 69, 2], [4, 72, 2], [6, 74, 2], [8, 72, 4], [12, 69, 4]],
      [[0, 67, 2], [2, 71, 2], [4, 74, 4], [8, 71, 4], [12, 67, 4]],
      [[0, 65, 3], [3, 65, 1], [4, 69, 4], [8, 72, 4], [12, 69, 4]],
      [[0, 65, 3], [3, 65, 1], [4, 69, 4], [8, 72, 4], [12, 74, 4]],
      [[0, 67, 3], [3, 67, 1], [4, 71, 4], [8, 74, 4], [12, 71, 4]],
      [[0, 68, 4], [4, 71, 4], [8, 74, 4], [12, 71, 2], [14, 68, 2]],
    ],
    intro: {
      hits: [0, 2, 4, 6, 8, 10, 12, 13, 14, 15],
      lead: [[0, 57, 2], [2, 64, 2], [4, 69, 4], [12, 69, 4]],
    },
    rollDrum: "snare",
    roll: [12, 13, 14, 15],
    drums: { kick: [0, 4, 8, 10, 12], snare: [4, 12], hat: SIXTEENTHS },
    mix: { keys: 0.35, bass: 0.6, square: 0.5, pluck: 0.3, kick: 0.75, snare: 0.35, hat: 0.05 },
    // Evens out loudness with the other tunes; the races run a touch hotter.
    gain: 0.87,
  },

  // Results: the level-clear jingle. C major, I, IV, V, I: bright and relieved.
  "arcade-clear": {
    bpm: 112,
    swing: 0.05,
    lead: "square",
    chords: [
      { keys: [48, 52, 55], bass: 36 }, // C
      { keys: [45, 48, 53], bass: 41 }, // F
      { keys: [47, 50, 55], bass: 43 }, // G
      { keys: [48, 52, 55], bass: 36 }, // C
    ],
    keys: [
      [0, 3],
      [4, 2],
      [8, 3],
      [12, 2],
    ],
    bass: OCTAVE_BOUNCE,
    melody: [
      [[0, 60, 2], [2, 64, 2], [4, 67, 2], [6, 72, 6], [12, 71, 2], [14, 72, 2]],
      [[0, 69, 4], [4, 72, 4], [8, 69, 4], [12, 65, 4]],
      [[0, 67, 2], [2, 71, 2], [4, 74, 4], [8, 72, 2], [10, 71, 2], [12, 67, 4]],
      [[0, 72, 4], [4, 67, 2], [6, 64, 2], [8, 60, 8]],
    ],
    drums: { kick: [0, 8, 10], snare: [4, 12], hat: EIGHTHS },
    mix: { keys: 0.4, bass: 0.6, square: 0.45, kick: 0.72, snare: 0.32, hat: 0.1 },
  },

  // Leaderboard: the high-score table. G major, I, vi, IV, V: the sweet loop of an old cabinet.
  "arcade-hiscore": {
    bpm: 92,
    swing: 0.12,
    lead: "square",
    chords: [
      { keys: [50, 55, 59], bass: 43 }, // G
      { keys: [52, 55, 59], bass: 40 }, // Em
      { keys: [48, 52, 55], bass: 36 }, // C
      { keys: [50, 54, 57], bass: 38 }, // D
    ],
    keys: [
      [0, 6],
      [8, 6],
    ],
    bass: [
      [0, 4],
      [6, 2, 12],
      [8, 4],
      [14, 2, 12],
    ],
    melody: [
      [[0, 71, 4], [4, 74, 2], [6, 71, 2], [8, 67, 8]],
      [[0, 67, 4], [4, 71, 2], [6, 67, 2], [8, 64, 8]],
      [[0, 64, 2], [2, 67, 2], [4, 72, 4], [8, 71, 4], [12, 69, 4]],
      [[0, 69, 4], [4, 71, 2], [6, 72, 2], [8, 74, 8]],
    ],
    drums: { kick: [0, 10], snare: [4, 12], hat: EIGHTHS },
    mix: { keys: 0.45, bass: 0.55, square: 0.4, kick: 0.62, snare: 0.26, hat: 0.1 },
  },

  // The idle high-score list: the demo loop, E-flat major and slow, glowing quietly between players.
  "arcade-demo": {
    bpm: 84,
    swing: 0.15,
    lead: "square",
    chords: [
      { keys: [51, 55, 58], bass: 39 }, // Eb
      { keys: [48, 51, 55], bass: 36 }, // Cm
      { keys: [48, 51, 56], bass: 44 }, // Ab
      { keys: [50, 53, 58], bass: 46 }, // Bb
    ],
    keys: [[0, 12]],
    bass: [
      [0, 6],
      [8, 6],
    ],
    melody: [
      [[0, 67, 6], [6, 70, 2], [8, 72, 8]],
      [[0, 72, 4], [4, 70, 4], [8, 67, 8]],
      [[0, 68, 4], [4, 72, 4], [8, 70, 4], [12, 68, 4]],
      [[0, 70, 8], [8, 67, 4], [12, 65, 4]],
    ],
    drums: { kick: [0, 9], snare: [8], hat: [0, 4, 8, 12] },
    mix: { keys: 0.45, bass: 0.55, square: 0.38, kick: 0.6, snare: 0.24, hat: 0.1 },
  },
} satisfies Record<string, Theme>;
