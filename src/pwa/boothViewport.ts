/** A scrollbar or subpixel gap still counts as the full screen. */
export const FULL_SCREEN_SLACK_PX = 24;

/**
 * Typing is landscape and full screen.
 * Portrait, or a landscape window narrower than the screen, shows the turn-sideways instruction.
 * Every other screen stays visible. showsInPortrait is that exception.
 */
export function needsLandscapeGate(
  viewportWidth: number,
  viewportHeight: number,
  screenWidth: number,
): boolean {
  if (viewportWidth <= 0 || viewportHeight <= 0 || screenWidth <= 0) {
    return true;
  }
  if (viewportHeight > viewportWidth) {
    return true;
  }
  return viewportWidth < screenWidth - FULL_SCREEN_SLACK_PX;
}

export type BoothScreen = "setup" | "rolling" | "ready" | "typing" | "results" | "leaderboard";

/** Only the typing screen requires landscape. */
export function showsInPortrait(screen: BoothScreen): boolean {
  return screen !== "typing";
}
