import { describe, expect, it } from "vitest";
import { planEventStart } from "./setupRules";

describe("planEventStart", () => {
  it("keeps the event when Continue selects the other duration", () => {
    expect(planEventStart("continue", true, 30)).toEqual({
      mode: "continue",
      durationSeconds: 30,
    });
  });

  it("opens a new event when Start Fresh is selected", () => {
    expect(planEventStart("fresh", true, 60)).toEqual({
      mode: "fresh",
      durationSeconds: 60,
    });
  });

  it("opens a new event when Continue has no event to restore", () => {
    expect(planEventStart("continue", false, 30)).toEqual({
      mode: "fresh",
      durationSeconds: 30,
    });
  });
});
