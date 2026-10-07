import { describe, expect, it } from "vitest";
import type { ScoreRecord } from "../../db/persistence";
import { pick, seededRandom } from "../../test/seededRandom";
import { describeAttempt } from "../results/resultPlacement";
import { rankScores } from "./ranking";

/** A random board: many ties, some failing the accuracy gate, some impossible, some at 0 WPM. */
function randomBoard(random: () => number): ScoreRecord[] {
  const size = Math.floor(random() * 30);
  return Array.from({ length: size }, (_, index) => {
    const wpm = pick(random, [0, 1, 40, 51, 60, 60, 60, 75, 99, 150, 200, 201, 260]);
    return {
      id: `s${index}`,
      eventId: "e",
      name: random() < 0.5 ? `P${index}` : null,
      rawWpm: wpm,
      displayedWpm: wpm,
      accuracy: pick(random, [10, 69.4, 69.99, 70, 70.4, 70.6, 88, 95, 95.2, 100]),
      correctCharacters: 0,
      correctAttempts: 0,
      incorrectAttempts: 0,
      durationSeconds: 30,
      testMode: "words",
      passageSetId: "w",
      // Shuffled save times, so order on the board never follows the order saved.
      createdAt: new Date(Date.UTC(2026, 9, 7, 9, 0, Math.floor(random() * 3600))).toISOString(),
    };
  });
}

const eligible = (score: ScoreRecord) => score.accuracy >= 70 && score.displayedWpm > 0 && score.displayedWpm <= 200;

describe("ranking, on 1,500 random boards", () => {
  const SEEDS = Array.from({ length: 1_500 }, (_, index) => index + 1);

  it("ranks exactly the eligible scores: by WPM, then displayed accuracy, then the earlier save", () => {
    for (const seed of SEEDS) {
      const board = randomBoard(seededRandom(seed));
      const ranked = rankScores(board);
      expect(ranked.map((entry) => entry.score.id).sort(), `seed ${seed}`).toEqual(
        board.filter(eligible).map((score) => score.id).sort(),
      );
      ranked.forEach((entry, index) => {
        expect(entry.rank, `seed ${seed}`).toBe(index + 1);
        expect(entry.isTop5, `seed ${seed}`).toBe(index < 5);
        expect(entry.isTop10, `seed ${seed}`).toBe(index < 10);
        const next = ranked[index + 1]?.score;
        if (!next) return;
        const a = entry.score;
        const ahead =
          a.displayedWpm > next.displayedWpm ||
          (a.displayedWpm === next.displayedWpm && Math.round(a.accuracy) > Math.round(next.accuracy)) ||
          (a.displayedWpm === next.displayedWpm && Math.round(a.accuracy) === Math.round(next.accuracy) && a.createdAt <= next.createdAt);
        expect(ahead, `seed ${seed}: ${a.id} before ${next.id}`).toBe(true);
      });
    }
  }, 60_000);

  it("previews an attempt's place on Results exactly where saving it then ranks it", () => {
    for (const seed of SEEDS) {
      const random = seededRandom(seed * 7919);
      const board = randomBoard(random);
      const wpm = pick(random, [0, 1, 50, 60, 75, 150, 200, 201]);
      const accuracy = pick(random, [null, 20, 69.99, 70, 95]);
      const standing = describeAttempt(board, {
        eventId: "e",
        rawWpm: wpm,
        displayedWpm: wpm,
        accuracy,
        correctCharacters: 0,
        correctAttempts: 0,
        incorrectAttempts: 0,
        durationSeconds: 30,
        testMode: "words",
        passageSetId: "w",
      });
      if (accuracy === null) {
        expect(standing.showNameEntry, `seed ${seed}`).toBe(false);
        continue;
      }
      // Saved now, so later than every score already on the board.
      const saved: ScoreRecord = { ...board[0]!, id: "mine", displayedWpm: wpm, rawWpm: wpm, accuracy, createdAt: "2026-10-07T23:59:59.000Z" };
      const place = rankScores([...board, saved]).find((entry) => entry.score.id === "mine")?.rank ?? null;
      expect(standing.isNewHighScore, `seed ${seed}`).toBe(place === 1);
      expect(standing.isTop5, `seed ${seed}`).toBe(place !== null && place <= 5);
      expect(standing.isTop10, `seed ${seed}`).toBe(place !== null && place <= 10);
      expect(standing.showNameEntry, `seed ${seed}`).toBe(place !== null && place <= 20);
    }
  }, 60_000);
});
