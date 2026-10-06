import { describe, expect, it } from "vitest";
import { applySetupKey, setupChoices, type SetupSelection } from "./setupKeyboard";

const ready: SetupSelection = {
  cursor: "start",
  duration: 30,
  testMode: "famous-lines",
  leaderboard: "continue",
};

describe("applySetupKey", () => {
  it("moves the cursor without changing the selected choice", () => {
    const moved = applySetupKey(ready, "ArrowUp", { shiftKey: false, canContinue: true });
    expect(moved).toEqual({ ...ready, cursor: "all-time" });
  });

  it("selects the cursor's choice on Enter and leaves the other groups alone", () => {
    // CLEAR ALL SCORES is last, so Down from it wraps to the first choice.
    const onLength = applySetupKey({ ...ready, cursor: "clear" }, "ArrowDown", { shiftKey: false, canContinue: true });
    expect(onLength).toEqual({ ...ready, cursor: "30" });
    if (onLength === null || typeof onLength === "string") {
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

describe("all-time choice", () => {
  it("follows Continue, and only while an event exists", () => {
    const choices = setupChoices("famous-lines", true);
    expect(choices.slice(choices.indexOf("continue"), choices.indexOf("start") + 1)).toEqual(["continue", "all-time", "start"]);
    expect(setupChoices("famous-lines", false)).not.toContain("all-time");
  });

  it("selects the all-time leaderboard on Enter", () => {
    expect(
      applySetupKey({ ...ready, cursor: "all-time" }, "Enter", { shiftKey: false, canContinue: true }),
    ).toEqual({ ...ready, cursor: "all-time", leaderboard: "all-time" });
  });
});

describe("clear choice", () => {
  it("comes right after START EVENT, and only while an event exists", () => {
    expect(setupChoices("famous-lines", true).slice(-2)).toEqual(["start", "clear"]);
    expect(setupChoices("famous-lines", false)).not.toContain("clear");
    expect(applySetupKey(ready, "ArrowDown", { shiftKey: false, canContinue: true })).toEqual({ ...ready, cursor: "clear" });
  });

  it("asks to clear on Enter", () => {
    expect(applySetupKey({ ...ready, cursor: "clear" }, "Enter", { shiftKey: false, canContinue: true })).toBe("clear");
  });
});

describe("update choice", () => {
  it("puts UPDATE NOW first only while an update is ready", () => {
    expect(setupChoices("famous-lines", true, true)[0]).toBe("update");
    expect(setupChoices("famous-lines", true, false)).not.toContain("update");
    expect(setupChoices("famous-lines", true)).not.toContain("update");
  });

  it("reaches UPDATE NOW by wrapping down from CLEAR ALL SCORES, and Enter on it asks for the update", () => {
    const options = { shiftKey: false, canContinue: true, updateReady: true };
    const onUpdate = applySetupKey({ ...ready, cursor: "clear" }, "ArrowDown", options);
    expect(onUpdate).toEqual({ ...ready, cursor: "update" });
    if (onUpdate === null || typeof onUpdate === "string") {
      throw new Error("ArrowDown should land on UPDATE NOW");
    }
    expect(applySetupKey(onUpdate, "Enter", options)).toBe("update");
  });

  it("moves a cursor left on UPDATE NOW back to START EVENT once the update is gone", () => {
    expect(applySetupKey({ ...ready, cursor: "update" }, "Enter", { shiftKey: false, canContinue: true })).toBe("start");
  });
});

