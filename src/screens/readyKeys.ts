/**
 * While the rolling list is up, every other key returns to Ready and does not start the test.
 * Escape is never acted on at key-down: a short press and a hold mirror the logo badge.
 */
export function readyKeyDown(key: string, rolling: boolean): "wake" | "ignore" | "start" {
  if (key === "Escape") {
    return "ignore";
  }
  return rolling ? "wake" : "start";
}

/** A tap on Ready starts the test. The logo badge is for the operator's long-press only. */
export function readyPointerUp(pointer: { button: number; onLogo: boolean }): "start" | "ignore" {
  if (pointer.button !== 0 || pointer.onLogo) {
    return "ignore";
  }
  return "start";
}

/** A tap on the logo badge opens the rolling high-score list early, when it has a score to show. */
export function readyLogoTap(rollingScoreCount: number): "roll" | "ignore" {
  return rollingScoreCount > 0 ? "roll" : "ignore";
}
