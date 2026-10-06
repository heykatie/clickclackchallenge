import { describe, expect, it } from "vitest";
import { pickStory, stories } from "./story";

const total = (story: readonly string[]) => story.reduce((sum, sentence) => sum + sentence.length, 0);

describe("stories", () => {
  it("has several short stories a fast typist can finish in about 15 seconds", () => {
    expect(stories.length).toBeGreaterThanOrEqual(5);
    for (const story of stories) {
      expect(story).toHaveLength(4);
      expect(total(story)).toBeGreaterThanOrEqual(120);
      expect(total(story)).toBeLessThanOrEqual(140);
      for (const sentence of story) {
        expect(sentence.length).toBeGreaterThanOrEqual(30);
        expect(sentence.length).toBeLessThanOrEqual(42);
      }
    }
  });

  it("keeps the stories matched for fairness: lengths within 4 characters, one comma each", () => {
    const lengths = stories.map(total);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThanOrEqual(4);
    for (const story of stories) {
      expect(story.join("").split(",").length - 1).toBe(1);
      expect(story.every((sentence) => sentence.endsWith("."))).toBe(true);
      expect(story.join("")).toMatch(/^[A-Za-z ,.]+$/);
    }
  });
});

describe("pickStory", () => {
  it("picks a story at random", () => {
    expect(pickStory(() => 0, null)).toBe(0);
    expect(pickStory(() => 0.99, null)).toBe(stories.length - 1);
  });

  it("never picks the same story twice in a row", () => {
    for (let last = 0; last < stories.length; last += 1) {
      for (const roll of [0, 0.3, 0.6, 0.99]) {
        expect(pickStory(() => roll, last)).not.toBe(last);
      }
    }
  });
});
