/** How long the Results WPM waits before rolling, so "Nice typing!" (12 letters at 70ms) finishes first. */
export const COUNT_UP_DELAY_MS = 900;

/** How long a middling Results WPM takes to roll up once it starts. Slow enough to watch the number climb. */
export const COUNT_UP_MS = 1600;

const SHORTEST_COUNT_UP_MS = 1200;
const LONGEST_COUNT_UP_MS = 2000;
/** A score at or above this rolls for the longest time. Few booth contestants pass 150 WPM. */
const LONGEST_COUNT_UP_WPM = 150;

/** A bigger score rolls a little longer, so small scores do not crawl and big ones do not blur. */
export function countUpMs(target: number): number {
  const share = Math.min(Math.max(target, 0), LONGEST_COUNT_UP_WPM) / LONGEST_COUNT_UP_WPM;
  return Math.round(SHORTEST_COUNT_UP_MS + share * (LONGEST_COUNT_UP_MS - SHORTEST_COUNT_UP_MS));
}

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
