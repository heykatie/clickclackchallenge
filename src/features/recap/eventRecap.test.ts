import { describe, expect, it } from "vitest";
import { summarizeEvent } from "./eventRecap";

function atLocalHour(hour: number, minute = 0): string {
  const date = new Date(2026, 8, 12, hour, minute, 0, 0);
  return date.toISOString();
}

function score(overrides: Partial<{ displayedWpm: number; accuracy: number | null; createdAt: string; testMode: "words" | "famous-lines" | "story"; durationSeconds: 30 | 60 }> = {}) {
  return {
    displayedWpm: 40,
    accuracy: 95,
    createdAt: atLocalHour(10),
    testMode: "famous-lines" as const,
    durationSeconds: 30 as const,
    ...overrides,
  };
}

describe("summarizeEvent", () => {
  it("counts every completed round, counts Plinko drops by the app rule, and finds the busiest local hour", () => {
    const hour = new Date(atLocalHour(14)).getHours();
    const nextHour = (hour + 1) % 24;
    const summary = summarizeEvent([
      score({ createdAt: atLocalHour(hour), displayedWpm: 51, accuracy: 30, testMode: "words" }),
      score({ createdAt: atLocalHour(hour, 10), displayedWpm: 200, accuracy: 100, testMode: "story", durationSeconds: 60 }),
      score({ createdAt: atLocalHour(hour, 20), displayedWpm: 50, accuracy: 100, testMode: "story", durationSeconds: 60 }),
      score({ createdAt: atLocalHour(nextHour), displayedWpm: 201, accuracy: 100, testMode: "words" }),
    ]);

    expect(summary).toEqual({
      completedRounds: 4,
      averageWpm: 125.5,
      medianWpm: 125.5,
      averageAccuracy: 82.5,
      modeUsage: [
        { mode: "words", rounds: 2, percentage: 50 },
        { mode: "story", rounds: 2, percentage: 50 },
      ],
      durationUsage: [
        { durationSeconds: 30, rounds: 2, percentage: 50 },
        { durationSeconds: 60, rounds: 2, percentage: 50 },
      ],
      plinkoDropsWon: 2,
      plinkoWinnerPercentage: 50,
      roundsByHour: [
        { hour, rounds: 3 },
        { hour: nextHour, rounds: 1 },
      ].sort((a, b) => a.hour - b.hour),
      peakHours: [hour],
      peakHourRounds: 3,
    });
  });

  it("keeps all peak-hour ties and ignores malformed timestamps only for the time histogram", () => {
    const hourA = new Date(atLocalHour(8)).getHours();
    const hourB = (hourA + 2) % 24;
    const summary = summarizeEvent([
      score({ createdAt: atLocalHour(hourA) }),
      score({ createdAt: atLocalHour(hourB) }),
      score({ createdAt: "not-a-date", displayedWpm: 51, accuracy: 30 }),
    ]);

    expect(summary).toEqual({
      completedRounds: 3,
      averageWpm: 43.7,
      medianWpm: 40,
      averageAccuracy: 73.3,
      modeUsage: [{ mode: "famous-lines", rounds: 3, percentage: 100 }],
      durationUsage: [{ durationSeconds: 30, rounds: 3, percentage: 100 }],
      plinkoDropsWon: 1,
      plinkoWinnerPercentage: 33.3,
      roundsByHour: [hourA, hourB].sort((a, b) => a - b).map((hour) => ({ hour, rounds: 1 })),
      peakHours: [hourA, hourB].sort((a, b) => a - b),
      peakHourRounds: 1,
    });
  });

  it("returns an empty peak for an event with no saved rounds", () => {
    expect(summarizeEvent([])).toEqual({
      completedRounds: 0,
      averageWpm: null,
      medianWpm: null,
      averageAccuracy: null,
      modeUsage: [],
      durationUsage: [],
      plinkoDropsWon: 0,
      plinkoWinnerPercentage: 0,
      roundsByHour: [],
      peakHours: [],
      peakHourRounds: 0,
    });
  });

  it("keeps completed rounds counted when all stored completion times are invalid", () => {
    expect(summarizeEvent([score({ createdAt: "invalid" })])).toEqual({
      completedRounds: 1,
      averageWpm: 40,
      medianWpm: 40,
      averageAccuracy: 95,
      modeUsage: [{ mode: "famous-lines", rounds: 1, percentage: 100 }],
      durationUsage: [{ durationSeconds: 30, rounds: 1, percentage: 100 }],
      plinkoDropsWon: 0,
      plinkoWinnerPercentage: 0,
      roundsByHour: [],
      peakHours: [],
      peakHourRounds: 0,
    });
  });

  it("averages only rounds with a recorded accuracy", () => {
    expect(summarizeEvent([score({ accuracy: null }), score({ displayedWpm: 60, accuracy: 80 })])).toMatchObject({
      averageAccuracy: 80,
      modeUsage: [{ mode: "famous-lines", rounds: 2, percentage: 100 }],
      durationUsage: [{ durationSeconds: 30, rounds: 2, percentage: 100 }],
      plinkoDropsWon: 1,
      plinkoWinnerPercentage: 50,
    });
  });
});
