import { describe, expect, it } from "vitest";
import { commonWords, WORD_LIST_ID } from "./commonWords";
import { createWordLines } from "./wordLines";

const wordSet = new Set<string>(commonWords);

describe("common words", () => {
  it("is a stable list of 200 lowercase words", () => {
    expect(WORD_LIST_ID).toBe("common-words-v1");
    expect(commonWords).toHaveLength(200);
    expect(new Set(commonWords).size).toBe(200);
    expect(commonWords.every((word) => /^[a-z]+$/.test(word))).toBe(true);
  });
});

describe("createWordLines", () => {
  it("builds lowercase lines that fit, with a space ready for the next word", () => {
    const lines = createWordLines(() => 0.1);
    const characters = lines.join("").length;
    expect(lines.length).toBeGreaterThanOrEqual(40);
    expect(characters).toBeGreaterThanOrEqual(1500);
    for (const line of lines) {
      expect(line.endsWith(" ")).toBe(true);
      expect(line.length).toBeLessThanOrEqual(48);
      expect(line).toMatch(/^[a-z ]+$/);
      for (const word of line.trim().split(" ")) {
        expect(wordSet.has(word)).toBe(true);
      }
    }
  });

  it("uses the same words for the same random sequence and a new draw for another", () => {
    let step = 0;
    const sequence = () => {
      step += 1;
      return (step % 17) / 17;
    };
    const reset = () => {
      step = 0;
    };

    reset();
    const first = createWordLines(sequence);
    reset();
    const repeat = createWordLines(sequence);
    const other = createWordLines(() => 0.9);
    expect(repeat).toEqual(first);
    expect(other).not.toEqual(first);
  });

  it("does not place the same word twice in a row", () => {
    const lines = createWordLines(() => 0);
    const words = lines.join("").trim().split(/\s+/);
    for (let index = 1; index < words.length; index += 1) {
      expect(words[index]).not.toBe(words[index - 1]);
    }
  });
});
