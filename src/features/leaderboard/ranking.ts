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

/** All-time attract board. Longer than the event Top 5, short enough to roll. */
export const ALL_TIME_SCORE_CAP = 50;

export function allTimeScores(
  scores: readonly ScoreRecord[],
  cap = ALL_TIME_SCORE_CAP,
): RankedScore[] {
  const scored = scores.filter((score) => score.displayedWpm > 0);
  return rankScores(scored).slice(0, cap);
}
