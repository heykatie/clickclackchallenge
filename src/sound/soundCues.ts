import type { ResultCopy } from "../features/results/resultPlacement";
import type { TestSession } from "../features/typing/typingEngine";

export type SoundCue = "key" | "miss" | "chime" | "ding" | "hop-slow" | "hop-big" | "hop-small" | "hop-bonk";

/** Keycap Hop power-up pickups: each kind has its own little cue. */
export function hopPowerCue(kind: "slow" | "big" | "small"): SoundCue {
  if (kind === "slow") {
    return "hop-slow";
  }
  if (kind === "big") {
    return "hop-big";
  }
  return "hop-small";
}

/** A key press makes a soft click when it was right and a low blip when it was wrong. Other keys are quiet. */
export function keyCue(before: TestSession | null, after: TestSession | null): SoundCue | null {
  if (!before || !after) {
    return null;
  }
  if (after.incorrectAttempts > before.incorrectAttempts) {
    return "miss";
  }
  if (after.correctAttempts > before.correctAttempts) {
    return "key";
  }
  return null;
}

/** Results chimes for a new high score, the bigger moment, and dings for a Plinko win. */
export function resultCue(copy: ResultCopy | null): SoundCue | null {
  if (copy?.kind === "new-high-score") {
    return "chime";
  }
  return copy?.plinkoLine ? "ding" : null;
}
