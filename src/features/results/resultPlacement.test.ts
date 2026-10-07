import { describe, expect, it } from "vitest";
import type { ScoreRecord } from "../../db/persistence";
import { celebratesNewHighScore, describeAttempt, resultCopy, type AttemptSnapshot, type ResultStanding } from "./resultPlacement";

function saved(overrides: Partial<ScoreRecord> & Pick<ScoreRecord, "id" | "displayedWpm" | "createdAt">): ScoreRecord {
  return {
    eventId: "event-1",
    name: "Alex",
    rawWpm: overrides.displayedWpm,
    accuracy: 96,
    correctCharacters: 10,
    correctAttempts: 10,
    incorrectAttempts: 0,
    durationSeconds: 30,
    testMode: "famous-lines",
    passageSetId: "common-sentences-v1",
    ...overrides,
  };
}

function attempt(overrides: Partial<AttemptSnapshot> = {}): AttemptSnapshot {
  return {
    eventId: "event-1",
    rawWpm: 80,
    displayedWpm: 80,
    accuracy: 96,
    correctCharacters: 200,
    correctAttempts: 200,
    incorrectAttempts: 8,
    durationSeconds: 30,
    testMode: "famous-lines",
    passageSetId: "common-sentences-v1",
    ...overrides,
  };
}

function standing(overrides: Partial<ResultStanding> = {}): ResultStanding {
  return {
    isNewHighScore: false,
    isTop5: false,
    isTop10: false,
    showNameEntry: false,
    ...overrides,
  };
}

describe("resultCopy", () => {
  it("congratulates a Top 5 result and adds the Plinko line above 50 WPM", () => {
    expect(resultCopy(standing({ isTop5: true, showNameEntry: true }), 80, 100)).toEqual({
      headline: "Nice typing!",
      kind: "nice",
      placedLine: "You made the Top 5!",
      plinkoLine: "You win a Plinko drop!",
    });
  });

  it("uses only NEW HIGH SCORE and the Plinko line for rank 1", () => {
    expect(
      resultCopy(standing({ isNewHighScore: true, isTop5: true, showNameEntry: true }), 80, 100),
    ).toEqual({
      headline: "NEW HIGH SCORE!",
      kind: "new-high-score",
      placedLine: null,
      plinkoLine: "You win a Plinko drop!",
    });
    expect(
      resultCopy(standing({ isNewHighScore: true, isTop5: true, showNameEntry: true }), 50, 100),
    ).toEqual({
      headline: "NEW HIGH SCORE!",
      kind: "new-high-score",
      placedLine: null,
      plinkoLine: null,
    });
  });

  it("uses the Top 10 line when the attempt places sixth through tenth", () => {
    expect(resultCopy(standing({ isTop10: true, showNameEntry: true }), 40, 100).placedLine).toBe(
      "You made the Top 10!",
    );
    expect(resultCopy(standing({ isTop10: true, showNameEntry: true }), 40, 100).headline).toBe("Nice typing!");
    expect(resultCopy(standing({ isTop10: true, showNameEntry: true }), 40, 100).plinkoLine).toBeNull();
  });

  it("offers a name past 10th without the Top 10 cheer", () => {
    expect(resultCopy(standing({ showNameEntry: true }), 40, 100)).toEqual({
      headline: "Thanks for playing!",
      kind: "thanks",
      placedLine: null,
      plinkoLine: null,
    });
  });

  it("gives a Plinko line without a place when the score is above 50 WPM", () => {
    expect(resultCopy(standing(), 51, 100)).toEqual({
      headline: "Nice typing!",
      kind: "nice",
      placedLine: null,
      plinkoLine: "You win a Plinko drop!",
    });
  });

  it("asks if a 0 WPM result is a ghost and does not place them", () => {
    expect(resultCopy(standing({ isTop5: true, showNameEntry: true, isNewHighScore: true }), 0, 100)).toEqual({
      headline: "Casper, is that you?",
      kind: "casper",
      placedLine: null,
      plinkoLine: null,
    });
  });

  it("thanks a result that misses the board and does not win a Plinko drop", () => {
    expect(resultCopy(standing(), 50, 100)).toEqual({
      headline: "Thanks for playing!",
      kind: "thanks",
      placedLine: null,
      plinkoLine: null,
    });
  });
});

describe("describeAttempt", () => {
  it("treats the first eligible score as the high score and a Top 10", () => {
    expect(describeAttempt([], attempt())).toEqual({
      isNewHighScore: true,
      isTop5: true,
      isTop10: true,
      showNameEntry: true,
    });
  });

  it("does not place a displayed 0 WPM score, even at 100% accuracy", () => {
    expect(describeAttempt([], attempt({ displayedWpm: 0, rawWpm: 0.4, accuracy: 100 }))).toEqual({
      isNewHighScore: false,
      isTop5: false,
      isTop10: false,
      showNameEntry: false,
    });
  });

  it("hides the name when accuracy shows below 70, as 69.4 does", () => {
    expect(describeAttempt([], attempt({ accuracy: 69.4 }))).toEqual({
      isNewHighScore: false,
      isTop5: false,
      isTop10: false,
      showNameEntry: false,
    });
  });

  it("keeps an earlier tie ahead, so the new attempt is not the high score", () => {
    const standing = describeAttempt(
      [saved({ id: "earlier", displayedWpm: 80, accuracy: 96, createdAt: "2026-09-22T00:00:00.000Z" })],
      attempt({ displayedWpm: 80, accuracy: 96 }),
    );
    expect(standing.isNewHighScore).toBe(false);
    expect(standing.isTop5).toBe(true);
    expect(standing.showNameEntry).toBe(true);
  });

  it("marks sixth place as Top 10 and not Top 5", () => {
    const existing = Array.from({ length: 5 }, (_, index) =>
      saved({
        id: `score-${index}`,
        displayedWpm: 100 - index,
        createdAt: `2026-09-22T00:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );
    expect(describeAttempt(existing, attempt({ displayedWpm: 70 }))).toMatchObject({
      isTop5: false,
      isTop10: true,
      showNameEntry: true,
    });
  });

  it("offers a name at 20th and withholds the Top 10 cheer", () => {
    const existing = Array.from({ length: 19 }, (_, index) =>
      saved({
        id: `score-${index}`,
        displayedWpm: 100 - index,
        createdAt: `2026-09-22T00:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );
    expect(describeAttempt(existing, attempt({ displayedWpm: 40 }))).toEqual({
      isNewHighScore: false,
      isTop5: false,
      isTop10: false,
      showNameEntry: true,
    });
  });

  it("hides the name when twenty eligible scores are already ahead", () => {
    const existing = Array.from({ length: 20 }, (_, index) =>
      saved({
        id: `score-${index}`,
        displayedWpm: 120 - index,
        createdAt: `2026-09-22T00:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );
    expect(describeAttempt(existing, attempt({ displayedWpm: 50 }))).toEqual({
      isNewHighScore: false,
      isTop5: false,
      isTop10: false,
      showNameEntry: false,
    });
  });

  it("does not change the WPM stored on earlier scores", () => {
    const earlier = saved({
      id: "sixty",
      displayedWpm: 46,
      durationSeconds: 60,
      createdAt: "2026-09-22T00:00:00.000Z",
    });
    describeAttempt([earlier], attempt({ displayedWpm: 92, testMode: "words" }));
    expect(earlier.displayedWpm).toBe(46);
    expect(earlier.durationSeconds).toBe(60);
  });
});

describe("resultCopy with the Plinko accuracy gate", () => {
  it("gives a Plinko drop above 50 WPM at 30% accuracy or better", () => {
    expect(resultCopy(standing(), 60, 30).plinkoLine).toBe("You win a Plinko drop!");
    expect(resultCopy(standing(), 60, 30).headline).toBe("Nice typing!");
  });

  it("gives no Plinko drop below 30% accuracy, even far above 50 WPM", () => {
    expect(resultCopy(standing(), 380, 29.4)).toEqual({
      headline: "Thanks for playing!",
      kind: "thanks",
      placedLine: null,
      plinkoLine: null,
    });
  });

  it("gives no Plinko drop when there were no attempts", () => {
    expect(resultCopy(standing(), 60, null).plinkoLine).toBeNull();
  });
});

describe("celebratesNewHighScore", () => {
  it("bursts only for a new high score", () => {
    expect(celebratesNewHighScore(standing({ isNewHighScore: true, isTop5: true, showNameEntry: true }), 80)).toBe(true);
    expect(celebratesNewHighScore(standing({ isTop5: true, showNameEntry: true }), 80)).toBe(false);
    expect(celebratesNewHighScore(standing(), 80)).toBe(false);
  });

  it("never bursts for a 0 WPM result", () => {
    expect(celebratesNewHighScore(standing({ isNewHighScore: true }), 0)).toBe(false);
  });
});

describe("resultCopy kind", () => {
  it("names the kind of result, so the screen does not depend on the headline's wording", () => {
    expect(resultCopy(standing(), 0, 100).kind).toBe("casper");
    expect(resultCopy(standing({ isNewHighScore: true, isTop5: true, isTop10: true }), 80, 100).kind).toBe("new-high-score");
    expect(resultCopy(standing({ isTop5: true }), 40, 100).kind).toBe("nice");
    expect(resultCopy(standing(), 40, 100).kind).toBe("thanks");
  });
});
