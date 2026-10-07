import { describe, expect, it } from "vitest";
import type { ScoreRecord } from "../../db/persistence";
import { describeAttempt, resultCopy, type AttemptSnapshot } from "./resultPlacement";

/**
 * Every result the Results screen can show, checked against the PRD's rules written out again here, plainly,
 * apart from the code under test: the headline, the place line, the Plinko line, and name entry.
 */
function existingBoard(size: number): ScoreRecord[] {
  // Eligible scores at 120, 115, 110, ... WPM: an attempt's place depends only on how many beat it.
  return Array.from({ length: size }, (_, index) => ({
    id: `s${index}`,
    eventId: "e",
    name: `P${index}`,
    rawWpm: 120 - index * 5,
    displayedWpm: 120 - index * 5,
    accuracy: 95,
    correctCharacters: 0,
    correctAttempts: 0,
    incorrectAttempts: 0,
    durationSeconds: 30,
    testMode: "words",
    passageSetId: "w",
    createdAt: `2026-10-07T09:${String(index).padStart(2, "0")}:00.000Z`,
  }));
}

function attempt(displayedWpm: number, accuracy: number | null): AttemptSnapshot {
  return {
    eventId: "e",
    rawWpm: displayedWpm,
    displayedWpm,
    accuracy,
    correctCharacters: 0,
    correctAttempts: 0,
    incorrectAttempts: 0,
    durationSeconds: 30,
    testMode: "words",
    passageSetId: "w",
  };
}

/** The PRD, restated: what Results should show for this attempt on this board. */
function expected(board: readonly ScoreRecord[], wpm: number, accuracy: number | null) {
  // Both gates go by the accuracy contestants see, rounded to a whole percent.
  const plinko = wpm > 50 && wpm <= 200 && accuracy !== null && Math.round(accuracy) >= 30;
  if (wpm === 0) {
    return { headline: "Casper, is that you?", placed: null, plinko: null, nameEntry: false };
  }
  const ranks = accuracy !== null && Math.round(accuracy) >= 25 && wpm <= 200;
  // A tie with an earlier score at the same displayed accuracy goes to the earlier one.
  const place = ranks
    ? board.filter((s) => s.displayedWpm > wpm || (s.displayedWpm === wpm && Math.round(s.accuracy) >= Math.round(accuracy))).length + 1
    : null;
  const plinkoLine = plinko ? "You win a Plinko drop!" : null;
  if (place === 1) {
    return { headline: "NEW HIGH SCORE!", placed: null, plinko: plinkoLine, nameEntry: true };
  }
  const placed = place !== null && place <= 5 ? "You made the Top 5!" : place !== null && place <= 10 ? "You made the Top 10!" : null;
  const headline = placed !== null || plinko ? "Nice typing!" : "Thanks for playing!";
  return { headline, placed, plinko: plinkoLine, nameEntry: place !== null && place <= 20 };
}

describe("every Results outcome", () => {
  const BOARD_SIZES = [0, 1, 4, 5, 9, 10, 19, 20, 25];
  const WPMS = [0, 1, 25, 50, 51, 52, 75, 100, 105, 115, 120, 121, 150, 200, 201, 300];
  const ACCURACIES = [null, 0, 24, 24.4, 24.5, 25, 29, 29.4, 29.5, 30, 31, 69.4, 70, 85, 95, 100];

  it(`matches the PRD for ${BOARD_SIZES.length * WPMS.length * ACCURACIES.length} combinations of board, speed, and accuracy`, () => {
    const mismatches: string[] = [];
    for (const size of BOARD_SIZES) {
      const board = existingBoard(size);
      for (const wpm of WPMS) {
        for (const accuracy of ACCURACIES) {
          const standing = describeAttempt(board, attempt(wpm, accuracy));
          const copy = resultCopy(standing, wpm, accuracy);
          const want = expected(board, wpm, accuracy);
          const got = { headline: copy.headline, placed: copy.placedLine, plinko: copy.plinkoLine, nameEntry: standing.showNameEntry };
          if (JSON.stringify(got) !== JSON.stringify(want)) {
            mismatches.push(`board ${size}, ${wpm} WPM, ${accuracy}%: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
          }
        }
      }
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
  });
});
