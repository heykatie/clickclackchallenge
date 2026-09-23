/** A scrollbar or subpixel gap still counts as the full screen. */
export const FULL_SCREEN_SLACK_PX = 24;

/**
 * The five screens are landscape and full screen only.
 * Portrait, or a landscape window narrower than the screen, shows the turn-sideways instruction.
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
