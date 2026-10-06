/** How long the Results WPM takes to roll up. Short, so the real score is readable almost at once. */
export const COUNT_UP_MS = 800;

/** The WPM shown `elapsedMs` into the count-up: eases out from 0 and settles exactly on `target`. */
export function countUpValue(target: number, elapsedMs: number, durationMs = COUNT_UP_MS): number {
  if (target <= 0 || elapsedMs >= durationMs) {
    return Math.max(0, target);
  }
  const progress = Math.max(0, elapsedMs) / durationMs;
  const eased = 1 - (1 - progress) ** 3;
  return Math.min(target, Math.floor(target * eased));
}
