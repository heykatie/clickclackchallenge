export const MIN_LEADERBOARD_ACCURACY = 70;
/** Low on purpose: it only stops key-mashing. Random keys land around 5–20%, mostly from lucky spaces. */
export const PLINKO_MIN_ACCURACY = 30;

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

export function meetsLeaderboardAccuracy(accuracy: number): boolean {
  return accuracy >= MIN_LEADERBOARD_ACCURACY;
}

/** A Plinko drop needs displayed WPM above 50 and stored accuracy of at least PLINKO_MIN_ACCURACY. */
export function winsPlinko(displayedWpm: number, accuracy: number | null): boolean {
  return displayedWpm > 50 && accuracy !== null && accuracy >= PLINKO_MIN_ACCURACY;
}
