import type { ScoreRecord, TestDuration, TestMode } from "../../db/persistence";
import { meetsLeaderboardAccuracy } from "../typing/scoring";
import { NAME_ENTRY_RANK, rankScores } from "../leaderboard/ranking";

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
  isTop10: boolean;
  showNameEntry: boolean;
}

export interface ResultCopy {
  headline: string;
  placedLine: string | null;
  plinkoLine: string | null;
}

export function resultCopy(standing: ResultStanding, displayedWpm: number): ResultCopy {
  if (displayedWpm === 0) {
    return {
      headline: "Casper, is that you?",
      placedLine: null,
      plinkoLine: null,
    };
  }
  const cheered = standing.isTop5 || standing.isTop10;
  const winsPlinko = displayedWpm > 50;
  return {
    headline: standing.isNewHighScore
      ? "NEW HIGH SCORE!"
      : cheered || winsPlinko
        ? "Nice typing!"
        : "Thanks for playing!",
    placedLine: standing.isNewHighScore
      ? null
      : standing.isTop5
        ? "You made the Top 5!"
        : standing.isTop10
          ? "You made the Top 10!"
          : null,
    plinkoLine: winsPlinko ? "You win a Plinko drop!" : null,
  };
}

export function describeAttempt(
  existing: readonly ScoreRecord[],
  attempt: AttemptSnapshot,
): ResultStanding {
  if (attempt.accuracy === null || !meetsLeaderboardAccuracy(attempt.accuracy) || attempt.displayedWpm <= 0) {
    return { isNewHighScore: false, isTop5: false, isTop10: false, showNameEntry: false };
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
    isTop10: mine?.isTop10 === true,
    showNameEntry: mine !== undefined && mine.rank <= NAME_ENTRY_RANK,
  };
}
