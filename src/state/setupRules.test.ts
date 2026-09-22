import { describe, expect, it } from "vitest";
import { durationChoice } from "./setupRules";

describe("durationChoice", () => {
  it("keeps the stored duration while Continue is selected", () => {
    expect(durationChoice("continue", 60, 30)).toBe(60);
  });

  it("uses the fresh choice only while Start Fresh is selected", () => {
    expect(durationChoice("fresh", 60, 30)).toBe(30);
  });

  it("uses the fresh choice when there is no stored event", () => {
    expect(durationChoice("continue", null, 30)).toBe(30);
  });
});
