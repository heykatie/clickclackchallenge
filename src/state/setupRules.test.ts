import { describe, expect, it } from "vitest";
import { planEventStart } from "./setupRules";

describe("planEventStart", () => {
  it("keeps the event when Continue selects the other duration", () => {
    expect(planEventStart("continue", true, 30, "words")).toEqual({
      mode: "continue",
      durationSeconds: 30,
      testMode: "words",
    });
  });

  it("opens a new event when Start Fresh is selected", () => {
    expect(planEventStart("fresh", true, 60, "famous-lines")).toEqual({
      mode: "fresh",
      durationSeconds: 60,
      testMode: "famous-lines",
    });
  });

  it("opens a new event when Continue has no event to restore", () => {
    expect(planEventStart("continue", false, 30, "famous-lines")).toEqual({
      mode: "fresh",
      durationSeconds: 30,
      testMode: "famous-lines",
    });
  });
});
