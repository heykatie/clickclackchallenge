/**
 * A contestant still typing when the test ends would otherwise skip Results and the Leaderboard
 * with the next Space or Enter. Taps and buttons are not delayed.
 */
export const LEAVE_KEY_GRACE_MS = 1_000;

export function acceptsLeaveKey(shownAt: number, now: number, graceMs = LEAVE_KEY_GRACE_MS): boolean {
  return now - shownAt >= graceMs;
}
