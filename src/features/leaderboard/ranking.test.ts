import { describe, expect, it } from "vitest";
import type { ScoreRecord } from "../../db/persistence";
import { calculateWpm, displayedWpm } from "../typing/scoring";
import { allTimeScores, highScore, rankScores } from "./ranking";

function score(overrides: Partial<ScoreRecord> & Pick<ScoreRecord, "displayedWpm" | "accuracy" | "createdAt">): ScoreRecord {
  return {
    id: overrides.id ?? overrides.createdAt,
    eventId: "event-1",
    name: null,
    rawWpm: overrides.displayedWpm,
    correctCharacters: 0,
    correctAttempts: 10,
    incorrectAttempts: 0,
    durationSeconds: 30,
    testMode: "race",
    passageSetId: "common-sentences-v1",
    ...overrides,
  };
}

describe("rankScores", () => {
  it("ranks a higher displayed WPM first", () => {
    const ranked = rankScores([
      score({ displayedWpm: 40, accuracy: 99, createdAt: "2026-09-22T00:00:00.000Z" }),
      score({ displayedWpm: 70, accuracy: 90, createdAt: "2026-09-22T00:01:00.000Z" }),
    ]);
    expect(ranked.map((entry) => entry.score.displayedWpm)).toEqual([70, 40]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2]);
  });

  it("breaks a displayed-WPM tie with rounded accuracy, ignoring hidden tenths", () => {
    const ranked = rankScores([
      score({ displayedWpm: 50, accuracy: 96.2, createdAt: "2026-09-22T00:00:00.000Z" }),
      score({ displayedWpm: 50, accuracy: 96.4, createdAt: "2026-09-22T00:01:00.000Z" }),
      score({ displayedWpm: 50, accuracy: 97.1, createdAt: "2026-09-22T00:02:00.000Z" }),
    ]);
    expect(ranked.map((entry) => entry.score.accuracy)).toEqual([97.1, 96.2, 96.4]);
  });

  it("uses the earlier submission when displayed WPM and displayed accuracy match", () => {
    const ranked = rankScores([
      score({ displayedWpm: 50, accuracy: 96.4, createdAt: "2026-09-22T00:05:00.000Z" }),
      score({ displayedWpm: 50, accuracy: 96.2, createdAt: "2026-09-22T00:01:00.000Z" }),
    ]);
    expect(ranked[0]?.score.createdAt).toBe("2026-09-22T00:01:00.000Z");
  });

  it("excludes scores below 80 percent, including 79.99", () => {
    const ranked = rankScores([
      score({ id: "low", displayedWpm: 99, accuracy: 79.99, createdAt: "2026-09-22T00:00:00.000Z" }),
      score({ id: "eligible", displayedWpm: 40, accuracy: 80, createdAt: "2026-09-22T00:01:00.000Z" }),
    ]);
    expect(ranked.map((entry) => entry.score.id)).toEqual(["eligible"]);
  });

  it("excludes a displayed 0 WPM score and keeps 1 WPM", () => {
    const ranked = rankScores([
      score({ id: "zero", displayedWpm: 0, accuracy: 100, createdAt: "2026-09-22T00:00:00.000Z" }),
      score({ id: "one", displayedWpm: 1, accuracy: 80, createdAt: "2026-09-22T00:01:00.000Z" }),
    ]);
    expect(ranked.map((entry) => entry.score.id)).toEqual(["one"]);
    expect(ranked[0]?.rank).toBe(1);
  });

  it("derives Top 5, Top 10, and the high score from stored WPM", () => {
    const scores = Array.from({ length: 12 }, (_, index) =>
      score({
        id: `score-${index}`,
        displayedWpm: 100 - index,
        accuracy: 90,
        createdAt: `2026-09-22T00:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );
    const ranked = rankScores(scores);
    expect(ranked).toHaveLength(12);
    expect(ranked.filter((entry) => entry.isTop10)).toHaveLength(10);
    expect(ranked.filter((entry) => entry.isTop5)).toHaveLength(5);
    expect(ranked[0]?.rank).toBe(1);
    expect(highScore(scores)?.id).toBe("score-0");
    expect(ranked.every((entry) => !("rank" in entry.score))).toBe(true);
  });

  it("keeps a 60-second score at its own WPM after the event changes to 30 seconds", () => {
    const correctCharacters = 229;
    const sixtySecondWpm = displayedWpm(calculateWpm(correctCharacters, 60));
    const thirtySecondWpm = displayedWpm(calculateWpm(correctCharacters, 30));
    const fromTheLongerTest = score({
      id: "sixty",
      durationSeconds: 60,
      displayedWpm: sixtySecondWpm,
      rawWpm: calculateWpm(correctCharacters, 60),
      accuracy: 99,
      createdAt: "2026-09-22T00:00:00.000Z",
    });
    const fromTheShorterTest = score({
      id: "thirty",
      durationSeconds: 30,
      displayedWpm: thirtySecondWpm,
      rawWpm: calculateWpm(correctCharacters, 30),
      accuracy: 90,
      createdAt: "2026-09-22T00:10:00.000Z",
    });

    const ranked = rankScores([fromTheLongerTest, fromTheShorterTest]);
    expect(sixtySecondWpm).toBe(46);
    expect(thirtySecondWpm).toBe(92);
    expect(ranked.map((entry) => entry.score.id)).toEqual(["thirty", "sixty"]);
    expect(ranked[1]?.score.displayedWpm).toBe(46);
    expect(ranked[1]?.score.durationSeconds).toBe(60);
  });

  it("ranks Standard and Race scores by the WPM each attempt stored", () => {
    const ranked = rankScores([
      score({
        id: "race",
        testMode: "race",
        passageSetId: "common-sentences-v1",
        displayedWpm: 54,
        accuracy: 99,
        createdAt: "2026-09-22T00:00:00.000Z",
      }),
      score({
        id: "words",
        testMode: "words",
        passageSetId: "common-words-v1",
        displayedWpm: 80,
        accuracy: 90,
        createdAt: "2026-09-22T00:05:00.000Z",
      }),
    ]);
    expect(ranked.map((entry) => entry.score.id)).toEqual(["words", "race"]);
    expect(ranked[0]?.score.testMode).toBe("words");
    expect(ranked[0]?.score.displayedWpm).toBe(80);
    expect(ranked[1]?.score.testMode).toBe("race");
    expect(ranked[1]?.score.displayedWpm).toBe(54);
  });
});

describe("allTimeScores", () => {
  it("keeps eligible scores from every event and caps the roll", () => {
    const scores = [
      score({
        id: "low",
        eventId: "older",
        displayedWpm: 90,
        accuracy: 70,
        createdAt: "2026-09-22T00:00:00.000Z",
      }),
      score({
        id: "archived",
        eventId: "older",
        name: "Ada",
        displayedWpm: 80,
        accuracy: 96,
        createdAt: "2026-09-22T00:01:00.000Z",
      }),
      ...Array.from({ length: 52 }, (_, index) =>
        score({
          id: `score-${index}`,
          eventId: "current",
          displayedWpm: 40 + index,
          accuracy: 90,
          createdAt: `2026-09-22T01:${String(index).padStart(2, "0")}:00.000Z`,
        }),
      ),
    ];
    const rolled = allTimeScores(scores, 50);
    expect(rolled).toHaveLength(50);
    expect(rolled.map((entry) => entry.score.id)).not.toContain("low");
    expect(rolled[0]?.rank).toBe(1);
    expect(rolled[0]?.score.displayedWpm).toBeGreaterThan(rolled[49]?.score.displayedWpm ?? 0);
  });

  it("drops a displayed 0 WPM score and keeps 1 WPM", () => {
    const rolled = allTimeScores([
      score({
        id: "zero",
        displayedWpm: 0,
        accuracy: 100,
        createdAt: "2026-09-22T00:00:00.000Z",
      }),
      score({
        id: "one",
        displayedWpm: 1,
        accuracy: 80,
        createdAt: "2026-09-22T00:01:00.000Z",
      }),
    ]);
    expect(rolled.map((entry) => entry.score.id)).toEqual(["one"]);
    expect(rolled[0]?.rank).toBe(1);
  });
});
