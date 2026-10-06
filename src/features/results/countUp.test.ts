import { describe, expect, it } from "vitest";
import { COUNT_UP_DELAY_MS, COUNT_UP_MS, countUpMs, countUpValue } from "./countUp";

const settled = COUNT_UP_DELAY_MS + COUNT_UP_MS;

describe("countUpValue", () => {
  it("holds at 0 while the headline types, then settles exactly on the score", () => {
    expect(countUpValue(234, 0)).toBe(0);
    expect(countUpValue(234, COUNT_UP_DELAY_MS)).toBe(0);
    expect(countUpValue(234, COUNT_UP_DELAY_MS + 100)).toBeGreaterThan(0);
    expect(countUpValue(234, settled)).toBe(234);
    expect(countUpValue(234, settled * 3)).toBe(234);
  });

  it("only rises, shows whole numbers, and never passes the score", () => {
    let previous = 0;
    for (let elapsed = 0; elapsed <= settled; elapsed += 16) {
      const value = countUpValue(234, elapsed);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(234);
      previous = value;
    }
  });

  it("eases out: most of the climb happens early, then it settles", () => {
    expect(countUpValue(100, COUNT_UP_DELAY_MS + COUNT_UP_MS / 2)).toBeGreaterThan(75);
  });

  it("keeps a 0 WPM score at 0", () => {
    expect(countUpValue(0, settled / 2)).toBe(0);
  });

  it("starts once Nice typing! has typed out", () => {
    expect(COUNT_UP_DELAY_MS).toBe(900);
  });

  it("gives a bigger score a longer roll, from 1.2 seconds up to 2 seconds", () => {
    expect(countUpMs(0)).toBe(1200);
    expect(countUpMs(75)).toBe(1600);
    expect(countUpMs(150)).toBe(2000);
    expect(countUpMs(9000)).toBe(2000);
    expect(countUpMs(40)).toBeLessThan(countUpMs(120));
  });
});
