export const MIN_LEADERBOARD_ACCURACY = 25;
/** Low on purpose: it only stops key-mashing. Random keys land around 5–20%, mostly from lucky spaces. */
export const PLINKO_MIN_ACCURACY = 30;
/**
 * Only the very fastest typists pass 200 WPM, on a normal keyboard; a giant keyboard is far slower.
 * A higher score can only come from a stuck key, a macro, or a glitch, so it is saved but set aside.
 */
export const MAX_PLAUSIBLE_WPM = 200;

export function isPlausibleWpm(displayedWpm: number): boolean {
  return displayedWpm <= MAX_PLAUSIBLE_WPM;
}

export function calculateWpm(
  correctCharacters: number,
  elapsedSeconds: number,
): number {
  if (elapsedSeconds <= 0) {
    return 0;
  }

  const elapsedMinutes = elapsedSeconds / 60;
  return correctCharacters / 5 / elapsedMinutes;
}

export function displayedWpm(rawWpm: number): number {
  return Math.round(rawWpm);
}

/** The Typing screen holds live WPM at 0 this long: over the first few keys it would read as wild speeds. */
export const LIVE_WPM_WARMUP_SECONDS = 2;

/** The running WPM shown while typing. Display only: the final score always uses calculateWpm. */
export function liveWpm(correctCharacters: number, elapsedSeconds: number): number {
  if (elapsedSeconds < LIVE_WPM_WARMUP_SECONDS) {
    return 0;
  }
  return displayedWpm(calculateWpm(correctCharacters, elapsedSeconds));
}

export function calculateAccuracy(
  correctAttempts: number,
  incorrectAttempts: number,
): number | null {
  const totalAttempts = correctAttempts + incorrectAttempts;
  if (totalAttempts === 0) {
    return null;
  }

  return (correctAttempts / totalAttempts) * 100;
}

export function displayedAccuracy(accuracy: number): number {
  return Math.round(accuracy);
}

/** Goes by the accuracy contestants see: a score that shows 25% counts, even when the exact figure is 24.5%. */
export function meetsLeaderboardAccuracy(accuracy: number): boolean {
  return displayedAccuracy(accuracy) >= MIN_LEADERBOARD_ACCURACY;
}

/** A Plinko drop needs a plausible displayed WPM above 50 and displayed accuracy of at least PLINKO_MIN_ACCURACY. */
export function winsPlinko(displayedWpm: number, accuracy: number | null): boolean {
  return (
    displayedWpm > 50 &&
    isPlausibleWpm(displayedWpm) &&
    accuracy !== null &&
    displayedAccuracy(accuracy) >= PLINKO_MIN_ACCURACY
  );
}

/** How many saved scores won a Plinko drop, so staff can keep track of prize stock. */
export function countPlinkoWins(scores: readonly { displayedWpm: number; accuracy: number | null }[]): number {
  return scores.filter((score) => winsPlinko(score.displayedWpm, score.accuracy)).length;
}
