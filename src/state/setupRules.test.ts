import { describe, expect, it } from "vitest";
import { applyFreshConfirmKey, needsFreshConfirm, planEventStart } from "./setupRules";

describe("planEventStart", () => {
  it("keeps the event when Continue selects the other duration", () => {
    expect(planEventStart("continue", true, 30, "words")).toEqual({
      mode: "continue",
      durationSeconds: 30,
      testMode: "words",
      boardScope: "event",
    });
  });

  it("opens a new event when Start Fresh is selected", () => {
    expect(planEventStart("fresh", true, 60, "famous-lines")).toEqual({
      mode: "fresh",
      durationSeconds: 60,
      testMode: "famous-lines",
      boardScope: "event",
    });
  });

  it("uses 60 seconds for Story and keeps the other duration for the timed modes", () => {
    expect(planEventStart("continue", true, 30, "story")).toEqual({
      mode: "continue",
      durationSeconds: 60,
      testMode: "story",
      boardScope: "event",
    });
    expect(planEventStart("fresh", false, 30, "story")).toEqual({
      mode: "fresh",
      durationSeconds: 60,
      testMode: "story",
      boardScope: "event",
    });
  });

  it("opens a new event when Continue has no event to restore", () => {
    expect(planEventStart("continue", false, 30, "famous-lines")).toEqual({
      mode: "fresh",
      durationSeconds: 30,
      testMode: "famous-lines",
      boardScope: "event",
    });
  });
});

describe("planEventStart with the all-time leaderboard", () => {
  it("keeps the event and ranks every event's scores", () => {
    expect(planEventStart("all-time", true, 60, "words")).toEqual({
      mode: "continue",
      durationSeconds: 60,
      testMode: "words",
      boardScope: "all-time",
    });
  });

  it("starts fresh with an event board when there is no event to keep", () => {
    expect(planEventStart("all-time", false, 30, "words")).toEqual({
      mode: "fresh",
      durationSeconds: 30,
      testMode: "words",
      boardScope: "event",
    });
  });
});

describe("needsFreshConfirm", () => {
  it("asks before Start fresh sets aside a board that has scores", () => {
    expect(needsFreshConfirm(planEventStart("fresh", true, 30, "words"), true)).toBe(true);
  });

  it("does not ask when there is no event yet, the board has no scores, or when continuing", () => {
    expect(needsFreshConfirm(planEventStart("fresh", false, 30, "words"), false)).toBe(false);
    // An event whose board has no scores has nothing to set aside, so Start fresh starts at once.
    expect(needsFreshConfirm(planEventStart("fresh", true, 30, "words"), false)).toBe(false);
    expect(needsFreshConfirm(planEventStart("continue", true, 30, "words"), true)).toBe(false);
  });
});

describe("applyFreshConfirmKey", () => {
  it("moves between CANCEL and START FRESH with the arrows and Tab", () => {
    expect(applyFreshConfirmKey("cancel", "ArrowRight")).toBe("confirm");
    expect(applyFreshConfirmKey("confirm", "ArrowLeft")).toBe("cancel");
    expect(applyFreshConfirmKey("cancel", "ArrowDown")).toBe("confirm");
    expect(applyFreshConfirmKey("confirm", "ArrowDown")).toBe("cancel");
    expect(applyFreshConfirmKey("cancel", "Tab")).toBe("confirm");
    expect(applyFreshConfirmKey("confirm", "Tab")).toBe("cancel");
  });

  it("picks the button under the cursor on Enter or Space", () => {
    expect(applyFreshConfirmKey("cancel", "Enter")).toEqual({ choose: "cancel" });
    expect(applyFreshConfirmKey("confirm", "Enter")).toEqual({ choose: "confirm" });
    expect(applyFreshConfirmKey("confirm", " ")).toEqual({ choose: "confirm" });
  });

  it("cancels on Escape wherever the cursor is", () => {
    expect(applyFreshConfirmKey("confirm", "Escape")).toEqual({ choose: "cancel" });
  });

  it("ignores other keys", () => {
    expect(applyFreshConfirmKey("cancel", "a")).toBeNull();
  });
});

