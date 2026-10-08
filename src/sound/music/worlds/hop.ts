import { EIGHTHS, type Theme } from "../band";

/**
 * Keycap Hop's own tune: a whimsical bouncy runner loop. Soft square carries the hop; a tiny music-box bell
 * winks on the hook. Tempo sits near Ready (~108) so it feels like a secret side-mode, not a battle. Every note
 * is original — Kirby / Yoshi energy, not a copy.
 */
export const HOP = {
  "hop-bounce": {
    bpm: 108,
    swing: 0.08,
    lead: "square",
    gain: 0.92,
    chords: [
      { keys: [48, 52, 55, 60], bass: 36 }, // C
      { keys: [45, 48, 52, 57], bass: 33 }, // Am
      { keys: [41, 45, 48, 53], bass: 41 }, // F
      { keys: [43, 47, 50, 55], bass: 43 }, // G
    ],
    keys: [
      [0, 2],
      [4, 1],
      [8, 2],
      [12, 1],
    ],
    bass: [
      [0, 2],
      [4, 2, 12],
      [8, 2],
      [12, 1],
      [14, 1, 12],
    ],
    // Square hop: short bouncy phrases, kept at or below D5 so it never shrills.
    melody: [
      [
        [0, 60, 2],
        [2, 64, 2],
        [4, 67, 2],
        [6, 64, 2],
        [8, 72, 4],
        [12, 67, 2],
        [14, 64, 2],
      ],
      [
        [0, 64, 2],
        [2, 67, 2],
        [4, 69, 4],
        [8, 64, 2],
        [10, 60, 2],
        [12, 67, 4],
      ],
      [
        [0, 65, 2],
        [2, 69, 2],
        [4, 72, 2],
        [6, 69, 2],
        [8, 65, 4],
        [12, 69, 2],
        [14, 72, 2],
      ],
      [
        [0, 67, 2],
        [2, 71, 2],
        [4, 74, 4],
        [8, 72, 2],
        [10, 67, 2],
        [12, 64, 2],
        [14, 60, 2],
      ],
    ],
    // Tiny bell winks on the hook — not a full second lead; kept soft, never shrill.
    sparkle: [
      [[8, 72, 1], [12, 76, 1]],
      [[4, 69, 1], [12, 72, 1]],
      [[8, 74, 1], [14, 72, 1]],
      [[4, 74, 1], [8, 76, 1], [12, 72, 2]],
    ],
    drums: { kick: [0, 8], snare: [4, 12], hat: EIGHTHS },
    mix: { keys: 0.32, bass: 0.5, square: 0.4, bell: 0.22, kick: 0.55, snare: 0.22, hat: 0.08 },
  },
} as const satisfies Record<string, Theme>;
