/** A tap of Escape opens the leaderboard only when Results is not asking for a name. */
export function shortEscapeOpensLeaderboard(standing: { showNameEntry: boolean } | null): boolean {
  return standing !== null && !standing.showNameEntry;
}

export function isViewLeaderboardKey(key: { key: string; code?: string }): boolean {
  return (
    key.key === "Enter" ||
    key.key === "NumpadEnter" ||
    key.key === " " ||
    key.code === "Enter" ||
    key.code === "NumpadEnter" ||
    key.code === "Space"
  );
}
