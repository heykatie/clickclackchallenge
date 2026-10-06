import { describe, expect, it } from "vitest";
import {
  countPlinkoWins,
  isPlausibleWpm,
  MAX_PLAUSIBLE_WPM,
  liveWpm,
  LIVE_WPM_WARMUP_SECONDS,
  calculateAccuracy,
  calculateWpm,
  displayedAccuracy,
  displayedWpm,
  meetsLeaderboardAccuracy,
  PLINKO_MIN_ACCURACY,
  winsPlinko,
} from "./scoring";

describe("calculateWpm", () => {
  it("returns 0 before time has elapsed", () => {
    expect(calculateWpm(50, 0)).toBe(0);
  });

  it("counts a partial word toward WPM", () => {
    expect(calculateWpm(3, 60)).toBeCloseTo(0.6);
  });

  it("uses only correct characters, so incorrect characters do not increase WPM", () => {
    expect(calculateWpm(250, 60)).toBe(50);
  });

  it("calculates a 30-second final WPM from the configured duration", () => {
    expect(calculateWpm(229, 30)).toBeCloseTo(91.6);
    expect(displayedWpm(calculateWpm(229, 30))).toBe(92);
  });

  it("calculates a 60-second final WPM from the configured duration", () => {
    expect(calculateWpm(500, 60)).toBe(100);
  });
});

describe("calculateAccuracy", () => {
  it("returns null when there have been no attempts", () => {
    expect(calculateAccuracy(0, 0)).toBeNull();
  });

  it("lowers accuracy when incorrect attempts increase", () => {
    expect(calculateAccuracy(8, 0)).toBe(100);
    expect(calculateAccuracy(8, 2)).toBe(80);
  });

  it("keeps the precise percentage for the gate and rounds only for display", () => {
    expect(calculateAccuracy(6999, 3001)).toBeCloseTo(69.99);
    expect(displayedAccuracy(69.99)).toBe(70);
  });
});

describe("meetsLeaderboardAccuracy", () => {
  it("accepts 70% and rejects 69.99%", () => {
    expect(meetsLeaderboardAccuracy(70)).toBe(true);
    expect(meetsLeaderboardAccuracy(69.99)).toBe(false);
  });
});

describe("winsPlinko", () => {
  it("needs displayed WPM above 50 and stored accuracy of at least 30%", () => {
    expect(PLINKO_MIN_ACCURACY).toBe(30);
    expect(winsPlinko(51, 30)).toBe(true);
    expect(winsPlinko(50, 100)).toBe(false);
    expect(winsPlinko(51, 29.99)).toBe(false);
    expect(winsPlinko(51, null)).toBe(false);
  });
});

describe("isPlausibleWpm", () => {
  it("accepts up to 200 displayed WPM, far above anyone on a giant keyboard", () => {
    expect(MAX_PLAUSIBLE_WPM).toBe(200);
    expect(isPlausibleWpm(200)).toBe(true);
    expect(isPlausibleWpm(201)).toBe(false);
  });

  it("gives no Plinko drop for a score no person could type", () => {
    expect(winsPlinko(200, 100)).toBe(true);
    expect(winsPlinko(201, 100)).toBe(false);
  });
});

describe("countPlinkoWins", () => {
  it("counts the saved scores that won a Plinko drop", () => {
    const scores = [
      { displayedWpm: 60, accuracy: 95 },
      { displayedWpm: 51, accuracy: 30 },
      { displayedWpm: 50, accuracy: 100 },
      { displayedWpm: 80, accuracy: 29 },
      { displayedWpm: 900, accuracy: 100 },
    ];
    expect(countPlinkoWins(scores)).toBe(2);
    expect(countPlinkoWins([])).toBe(0);
  });
});

describe("liveWpm", () => {
  it("shows 0 for the first 2 seconds, while a few keys would read as wild speeds", () => {
    expect(LIVE_WPM_WARMUP_SECONDS).toBe(2);
    expect(liveWpm(3, 0.2)).toBe(0);
    expect(liveWpm(10, 1.99)).toBe(0);
  });

  it("shows the rounded running WPM once the warm-up is over", () => {
    expect(liveWpm(10, 2)).toBe(60);
    expect(liveWpm(25, 6)).toBe(50);
  });
});
