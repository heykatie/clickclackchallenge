import type { ScoreRecord } from "../../db/persistence";
import { displayedAccuracy, meetsLeaderboardAccuracy } from "../typing/scoring";

export interface RankedScore {
  score: ScoreRecord;
  rank: number;
  isTop5: boolean;
  isTop10: boolean;
}

export function rankScores(scores: readonly ScoreRecord[]): RankedScore[] {
  const eligible = scores.filter((score) => meetsLeaderboardAccuracy(score.accuracy));
  const ordered = [...eligible].sort((left, right) => {
    if (right.displayedWpm !== left.displayedWpm) {
      return right.displayedWpm - left.displayedWpm;
    }
    const accuracyDelta = displayedAccuracy(right.accuracy) - displayedAccuracy(left.accuracy);
    if (accuracyDelta !== 0) {
      return accuracyDelta;
    }
    if (left.createdAt < right.createdAt) {
      return -1;
    }
    if (left.createdAt > right.createdAt) {
      return 1;
    }
    return 0;
  });

  return ordered.map((score, index) => ({
    score,
    rank: index + 1,
    isTop5: index < 5,
    isTop10: index < 10,
  }));
}

export function highScore(scores: readonly ScoreRecord[]): ScoreRecord | null {
  return rankScores(scores)[0]?.score ?? null;
}
