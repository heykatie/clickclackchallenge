/** How long the Results WPM waits before rolling, so "Nice typing!" (12 letters at 70ms) finishes first. */
export const COUNT_UP_DELAY_MS = 900;

/** How long the Results WPM takes to roll up once it starts. Slow enough to watch the number climb. */
export const COUNT_UP_MS = 1600;

/** The WPM shown `elapsedMs` after Results opens: 0 through the delay, then eases out and settles exactly on `target`. */
export function countUpValue(
  target: number,
  elapsedMs: number,
  durationMs = COUNT_UP_MS,
  delayMs = COUNT_UP_DELAY_MS,
): number {
  const rolling = elapsedMs - delayMs;
  if (target <= 0 || rolling >= durationMs) {
    return Math.max(0, target);
  }
  const progress = Math.max(0, rolling) / durationMs;
  const eased = 1 - (1 - progress) ** 3;
  return Math.min(target, Math.floor(target * eased));
}
