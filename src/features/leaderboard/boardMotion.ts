export type RowMotion = { kind: "climb" | "nudge"; rows: number } | null;

/**
 * How a Top 5 row moves when the Leaderboard opens. The just-saved row climbs from below the board into its
 * place, past (6 - rank) rows; the rows below it slide down one place to make room. Others stay still.
 */
export function rowMotion(rank: number, currentRank: number | null): RowMotion {
  if (currentRank === null || rank < currentRank) {
    return null;
  }
  if (rank === currentRank) {
    return { kind: "climb", rows: 6 - rank };
  }
  return { kind: "nudge", rows: 1 };
}
