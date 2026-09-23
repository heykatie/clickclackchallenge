import { normalizeName } from "./nameRules";

export const BLANK_NAME_SECONDS = 15;
export const NAME_COUNTDOWN_SECONDS = 5;
/** Quiet time after the last edit of an allowed name, before the save countdown. */
export const STARTED_NAME_QUIET_SECONDS = 20;
export const STARTED_NAME_SECONDS = STARTED_NAME_QUIET_SECONDS + NAME_COUNTDOWN_SECONDS;

export type NameTimerPhase = "blank" | "started" | "off";

export function nameTimerPhase(showNameEntry: boolean, name: string, saving: boolean): NameTimerPhase {
  if (!showNameEntry || saving) {
    return "off";
  }
  return normalizeName(name) === null ? "blank" : "started";
}

export function nameTimerSeconds(phase: NameTimerPhase): number {
  if (phase === "started") {
    return STARTED_NAME_SECONDS;
  }
  if (phase === "blank") {
    return BLANK_NAME_SECONDS;
  }
  return 0;
}

/** Changes when an allowed name is edited, so the quiet wait starts over. A blank name does not. */
export function nameTimerKey(phase: NameTimerPhase, name: string): string {
  return phase === "started" ? `started:${name}` : phase;
}

export function nameTimeoutMessage(phase: NameTimerPhase, secondsLeft: number): string | null {
  if (phase === "off" || secondsLeft <= 0 || secondsLeft > NAME_COUNTDOWN_SECONDS) {
    return null;
  }
  if (phase === "blank") {
    return `Opening the leaderboard in ${secondsLeft}s`;
  }
  return `Saving your score in ${secondsLeft}s`;
}
