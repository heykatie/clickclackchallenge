import { describe, expect, it } from "vitest";
import {
  calculateAccuracy,
  calculateWpm,
  displayedAccuracy,
  displayedWpm,
  meetsLeaderboardAccuracy,
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
