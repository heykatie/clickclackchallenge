import type { ScoreRecord } from "../../db/persistence";
import { displayedAccuracy, meetsLeaderboardAccuracy } from "../typing/scoring";

export interface RankedScore {
  score: ScoreRecord;
  rank: number;
  isTop5: boolean;
  isTop10: boolean;
}

export function rankScores(scores: readonly ScoreRecord[]): RankedScore[] {
  const eligible = scores.filter(
    (score) => meetsLeaderboardAccuracy(score.accuracy) && score.displayedWpm > 0,
  );
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

/** Rolling high-score list on Ready. Long enough to feel like a history, short enough to come back around. */
export const ROLLING_LIST_CAP = 20;

/** Event rank that may enter a name. The Top 10 cheer stops at 10. */
export const NAME_ENTRY_RANK = 20;

/** The rolling list: the top ranked scores of the board it is given, which is the active event's. */
export function rollingListScores(
  scores: readonly ScoreRecord[],
  cap = ROLLING_LIST_CAP,
): RankedScore[] {
  return rankScores(scores).slice(0, cap);
}

export interface LeaderboardSlot {
  rank: number;
  entry: RankedScore | null;
}

/** The visible board keeps five row positions. Unoccupied places stay empty, never invented. */
export function topFiveSlots(ranked: readonly RankedScore[]): LeaderboardSlot[] {
  return Array.from({ length: 5 }, (_, index) => ({ rank: index + 1, entry: ranked[index] ?? null }));
}

function houseScore(rank: number, name: string, displayedWpm: number): RankedScore {
  return {
    rank,
    isTop5: true,
    isTop10: true,
    score: {
      id: `house-${rank}`,
      eventId: "house",
      name,
      rawWpm: displayedWpm,
      displayedWpm,
      accuracy: 100,
      correctCharacters: 0,
      correctAttempts: 0,
      incorrectAttempts: 0,
      durationSeconds: 30,
      testMode: "famous-lines",
      passageSetId: "house",
      createdAt: "1970-01-01T00:00:00.000Z",
    },
  };
}

/**
 * Realistic targets for an empty board, one either side of the 51 WPM Plinko line.
 * Display only: never saved, ranked, or counted for a high score or prize.
 */
const HOUSE_SCORES: readonly RankedScore[] = [houseScore(1, "Clicky", 54), houseScore(2, "Clacky", 47)];

/** The Leaderboard's entries: the ranked event scores, or the house scores until the first real one exists. */
export function boardEntries(ranked: readonly RankedScore[]): readonly RankedScore[] {
  return ranked.length > 0 ? ranked : HOUSE_SCORES;
}

/**
 * "All-time best: 196 WPM · Zed" for the best eligible score ever saved, from any event.
 * Null when nothing was saved, or when it is this event's own first place, which the screen already shows.
 */
export function allTimeBestLine(best: ScoreRecord | null, eventBest: ScoreRecord | null): string | null {
  if (best === null || (eventBest !== null && best.id === eventBest.id)) {
    return null;
  }
  const line = `All-time best: ${best.displayedWpm} WPM`;
  return best.name ? `${line} · ${best.name}` : line;
}
