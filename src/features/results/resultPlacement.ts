import type { ScoreRecord, TestDuration, TestMode } from "../../db/persistence";
import { meetsLeaderboardAccuracy } from "../typing/scoring";
import { rankScores } from "../leaderboard/ranking";

/** Later than any saved score, so a tie keeps the earlier attempt ahead. */
const PREVIEW_CREATED_AT = "9999-12-31T23:59:59.999Z";

export interface AttemptSnapshot {
  eventId: string;
  rawWpm: number;
  displayedWpm: number;
  accuracy: number | null;
  correctCharacters: number;
  correctAttempts: number;
  incorrectAttempts: number;
  durationSeconds: TestDuration;
  testMode: TestMode;
  passageSetId: string;
}

export interface ResultStanding {
  isNewHighScore: boolean;
  isTop5: boolean;
  showNameEntry: boolean;
}

export interface ResultCopy {
  headline: string;
  placedLine: string | null;
  plinkoLine: string | null;
}

export function resultCopy(standing: ResultStanding, displayedWpm: number): ResultCopy {
  const placed = standing.isTop5 || standing.showNameEntry;
  const winsPlinko = displayedWpm > 50;
  return {
    headline: standing.isNewHighScore
      ? "NEW HIGH SCORE!"
      : placed || winsPlinko
        ? "Nice typing!"
        : "Thanks for playing!",
    placedLine: standing.isNewHighScore
      ? null
      : standing.isTop5
        ? "You made the Top 5!"
        : standing.showNameEntry
          ? "You made the Top 10!"
          : null,
    plinkoLine: winsPlinko ? "You win a Plinko drop!" : null,
  };
}

export function describeAttempt(
  existing: readonly ScoreRecord[],
  attempt: AttemptSnapshot,
): ResultStanding {
  if (attempt.accuracy === null || !meetsLeaderboardAccuracy(attempt.accuracy)) {
    return { isNewHighScore: false, isTop5: false, showNameEntry: false };
  }

  const preview: ScoreRecord = {
    id: "preview",
    eventId: attempt.eventId,
    name: null,
    rawWpm: attempt.rawWpm,
    displayedWpm: attempt.displayedWpm,
    accuracy: attempt.accuracy,
    correctCharacters: attempt.correctCharacters,
    correctAttempts: attempt.correctAttempts,
    incorrectAttempts: attempt.incorrectAttempts,
    durationSeconds: attempt.durationSeconds,
    testMode: attempt.testMode,
    passageSetId: attempt.passageSetId,
    createdAt: PREVIEW_CREATED_AT,
  };
  const mine = rankScores([...existing, preview]).find((entry) => entry.score.id === "preview");
  return {
    isNewHighScore: mine?.rank === 1,
    isTop5: mine?.isTop5 === true,
    showNameEntry: mine?.isTop10 === true,
  };
}
