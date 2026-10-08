/** Typing needs a horizontal viewport; a windowed landscape layout is allowed. */
export function needsLandscapeGate(
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return true;
  }
  return viewportHeight >= viewportWidth;
}

export type BoothScreen = "setup" | "rolling" | "ready" | "typing" | "results" | "leaderboard";

/** Only the typing screen requires landscape. */
export function showsInPortrait(screen: BoothScreen): boolean {
  return screen !== "typing";
}
