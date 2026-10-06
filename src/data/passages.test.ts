import { describe, expect, it } from "vitest";
import { passages, shuffledPassages } from "./passages";

describe("passages", () => {
  it("has enough text for a fast sixty second test", () => {
    const characters = passages.reduce((total, sentence) => total + sentence.length, 0);
    expect(passages.length).toBeGreaterThanOrEqual(25);
    expect(characters).toBeGreaterThanOrEqual(1200);
    expect(characters).toBeLessThanOrEqual(1500);
  });

  it("keeps every sentence in the one-line length range", () => {
    for (const sentence of passages) {
      expect(sentence.length).toBeGreaterThanOrEqual(30);
      expect(sentence.length).toBeLessThanOrEqual(50);
    }
  });
});

describe("shuffledPassages", () => {
  it("uses every line once, in a new order each time", () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const first = shuffledPassages(random);
    const second = shuffledPassages(random);
    expect([...first].sort()).toEqual([...passages].sort());
    expect(first).not.toEqual(second);
    expect(first).not.toEqual([...passages]);
  });
});
