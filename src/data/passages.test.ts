import { describe, expect, it } from "vitest";
import { passages } from "./passages";

describe("passages", () => {
  it("has enough text for a fast sixty second test", () => {
    const characters = passages.reduce((total, sentence) => total + sentence.length, 0);
    expect(passages.length).toBeGreaterThanOrEqual(25);
    expect(characters).toBeGreaterThanOrEqual(1200);
    expect(characters).toBeLessThanOrEqual(1500);
  });

  it("keeps every sentence in the one-line length range", () => {
    for (const sentence of passages) {
      expect(sentence.length).toBeGreaterThanOrEqual(35);
      expect(sentence.length).toBeLessThanOrEqual(50);
    }
  });
});
