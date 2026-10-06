import { describe, expect, it } from "vitest";
import { COUNT_UP_MS, countUpValue } from "./countUp";

describe("countUpValue", () => {
  it("starts at 0 and settles exactly on the score", () => {
    expect(countUpValue(234, 0)).toBe(0);
    expect(countUpValue(234, COUNT_UP_MS)).toBe(234);
    expect(countUpValue(234, COUNT_UP_MS * 3)).toBe(234);
  });

  it("only rises, shows whole numbers, and never passes the score", () => {
    let previous = 0;
    for (let elapsed = 0; elapsed <= COUNT_UP_MS; elapsed += 16) {
      const value = countUpValue(234, elapsed);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(234);
      previous = value;
    }
  });

  it("eases out: most of the climb happens early, then it settles", () => {
    expect(countUpValue(100, COUNT_UP_MS / 2)).toBeGreaterThan(75);
  });

  it("keeps a 0 WPM score at 0", () => {
    expect(countUpValue(0, COUNT_UP_MS / 2)).toBe(0);
  });

  it("lasts under a second", () => {
    expect(COUNT_UP_MS).toBe(800);
  });
});
