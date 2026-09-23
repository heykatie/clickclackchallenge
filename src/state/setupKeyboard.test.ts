import { describe, expect, it } from "vitest";
import { applySetupKey, type SetupSelection } from "./setupKeyboard";

const ready: SetupSelection = {
  cursor: "start",
  duration: 30,
  testMode: "famous-lines",
  leaderboard: "continue",
};

describe("applySetupKey", () => {
  it("moves the cursor without changing the selected choice", () => {
    const moved = applySetupKey(ready, "ArrowUp", { shiftKey: false, canContinue: true });
    expect(moved).toEqual({ ...ready, cursor: "continue" });
  });

  it("selects the cursor's choice on Enter and leaves the other groups alone", () => {
    const onLength = applySetupKey(ready, "ArrowDown", { shiftKey: false, canContinue: true });
    expect(onLength).toEqual({ ...ready, cursor: "30" });
    if (onLength === "start" || onLength === null) {
      throw new Error("ArrowDown should land on 30 seconds");
    }
    expect(applySetupKey({ ...onLength, duration: 60 }, "Enter", { shiftKey: false, canContinue: true })).toEqual({
      ...onLength,
      duration: 30,
    });
  });

  it("starts only when Enter is on START EVENT", () => {
    expect(applySetupKey(ready, "Enter", { shiftKey: false, canContinue: true })).toBe("start");
    expect(applySetupKey({ ...ready, cursor: "fresh" }, " ", { shiftKey: false, canContinue: true })).toMatchObject({
      leaderboard: "fresh",
    });
  });

  it("skips Test length while Story is selected and restores it afterward", () => {
    const story: SetupSelection = { ...ready, cursor: "story", testMode: "story", duration: 30 };
    expect(applySetupKey(story, "ArrowUp", { shiftKey: false, canContinue: true })).toMatchObject({
      cursor: "famous-lines",
    });
    const back = applySetupKey(
      { ...story, cursor: "words", testMode: "words" },
      "ArrowUp",
      { shiftKey: false, canContinue: true },
    );
    expect(back).toMatchObject({ cursor: "60" });
  });

  it("skips Continue when no event exists", () => {
    const fresh: SetupSelection = { ...ready, cursor: "fresh", leaderboard: "fresh" };
    expect(applySetupKey(fresh, "ArrowDown", { shiftKey: false, canContinue: false })).toMatchObject({
      cursor: "start",
    });
  });
});
