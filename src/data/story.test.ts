import { describe, expect, it } from "vitest";
import { story } from "./story";

describe("story", () => {
  it("is a short race that a fast typist can finish in about 15 seconds", () => {
    const characters = story.reduce((total, sentence) => total + sentence.length, 0);
    expect(story.length).toBeGreaterThanOrEqual(3);
    expect(characters).toBeGreaterThanOrEqual(120);
    expect(characters).toBeLessThanOrEqual(140);
    for (const sentence of story) {
      expect(sentence.length).toBeGreaterThanOrEqual(30);
      expect(sentence.length).toBeLessThanOrEqual(42);
    }
  });
});