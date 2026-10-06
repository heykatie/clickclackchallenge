import type { ScoreRecord, TestDuration, TestMode } from "../../db/persistence";
import { meetsLeaderboardAccuracy, winsPlinko } from "../typing/scoring";
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

/** What kind of result this is. The screen styles the headline by kind, never by its wording. */
export type ResultKind = "casper" | "new-high-score" | "nice" | "thanks";

export interface ResultCopy {
  headline: string;
  kind: ResultKind;
  placedLine: string | null;
  plinkoLine: string | null;
}

const HEADLINES: Record<ResultKind, string> = {
  casper: "Casper, is that you?",
  "new-high-score": "NEW HIGH SCORE!",
  nice: "Nice typing!",
  thanks: "Thanks for playing!",
};

export function resultCopy(standing: ResultStanding, displayedWpm: number, accuracy: number | null): ResultCopy {
  if (displayedWpm === 0) {
    return {
      headline: HEADLINES.casper,
      kind: "casper",
      placedLine: null,
      plinkoLine: null,
    };
  }
  const cheered = standing.isTop5 || standing.isTop10;
  const plinko = winsPlinko(displayedWpm, accuracy);
  const kind: ResultKind = standing.isNewHighScore ? "new-high-score" : cheered || plinko ? "nice" : "thanks";
  return {
    headline: HEADLINES[kind],
    kind,
    placedLine: standing.isNewHighScore
      ? null
      : standing.isTop5
        ? "You made the Top 5!"
        : standing.isTop10
          ? "You made the Top 10!"
          : null,
    plinkoLine: plinko ? "You win a Plinko drop!" : null,
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

/** Only a new high score gets the doodle burst. Other wins pop their pills; everything else stays calm. */
export function celebratesNewHighScore(standing: ResultStanding, displayedWpm: number): boolean {
  return standing.isNewHighScore && displayedWpm > 0;
}
