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
    expect(moved).toEqual({ ...ready, cursor: "name" });
  });

  it("selects the cursor's choice on Enter and leaves the other groups alone", () => {
    // PALETTE is last, so Down from it wraps to the first choice.
    const onLength = applySetupKey({ ...ready, cursor: "palette" }, "ArrowDown", { shiftKey: false, canContinue: true });
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
      cursor: "name",
    });
  });
});

describe("all-time choice", () => {
  it("follows Continue, and only while an event exists", () => {
    const choices = setupChoices("famous-lines", true);
    expect(choices.slice(choices.indexOf("continue"), choices.indexOf("start") + 1)).toEqual([
      "continue",
      "all-time",
      "download",
      "clear",
      "name",
      "start",
    ]);
    expect(setupChoices("famous-lines", false)).not.toContain("all-time");
  });

  it("selects the all-time leaderboard on Enter", () => {
    expect(
      applySetupKey({ ...ready, cursor: "all-time" }, "Enter", { shiftKey: false, canContinue: true }),
    ).toEqual({ ...ready, cursor: "all-time", leaderboard: "all-time" });
  });
});

describe("clear choice", () => {
  it("comes right after DOWNLOAD SCORES in the Leaderboard group, and only while an event exists", () => {
    const choices = setupChoices("famous-lines", true);
    expect(choices[choices.indexOf("download") + 1]).toBe("clear");
    expect(setupChoices("famous-lines", false)).not.toContain("clear");
    expect(applySetupKey({ ...ready, cursor: "download" }, "ArrowDown", { shiftKey: false, canContinue: true })).toEqual({
      ...ready,
      cursor: "clear",
    });
  });

  it("asks to clear on Enter", () => {
    expect(applySetupKey({ ...ready, cursor: "clear" }, "Enter", { shiftKey: false, canContinue: true })).toBe("clear");
  });
});

describe("download choice", () => {
  it("comes first of the score actions, right after the Leaderboard choices, and only while an event exists", () => {
    const choices = setupChoices("famous-lines", true);
    expect(choices[choices.indexOf("all-time") + 1]).toBe("download");
    expect(setupChoices("famous-lines", false)).not.toContain("download");
  });

  it("downloads on Enter", () => {
    expect(applySetupKey({ ...ready, cursor: "download" }, "Enter", { shiftKey: false, canContinue: true })).toBe(
      "download",
    );
  });
});

describe("event name choice", () => {
  it("comes right before START EVENT, so Up from START EVENT reaches it", () => {
    const choices = setupChoices("famous-lines", true);
    expect(choices[choices.indexOf("start") - 1]).toBe("name");
    expect(setupChoices("famous-lines", false)).toContain("name");
    expect(applySetupKey(ready, "ArrowUp", { shiftKey: false, canContinue: true })).toEqual({ ...ready, cursor: "name" });
  });

  it("asks to edit the name on Enter", () => {
    expect(applySetupKey({ ...ready, cursor: "name" }, "Enter", { shiftKey: false, canContinue: true })).toBe("name");
  });
});

describe("score actions", () => {
  it("sit with the Leaderboard choices: DOWNLOAD, then CLEAR, then RESTORE, before the event name", () => {
    const choices = setupChoices("famous-lines", true, false, true);
    const from = choices.indexOf("all-time");
    expect(choices.slice(from, from + 6)).toEqual(["all-time", "download", "clear", "restore", "name", "start"]);
  });
});

describe("sound and music choices", () => {
  it("come last, SOUND then MUSIC then PALETTE, even before any event exists, because they are device settings", () => {
    expect(setupChoices("famous-lines", true).slice(-3)).toEqual(["sound", "music", "palette"]);
    expect(setupChoices("famous-lines", false).slice(-3)).toEqual(["sound", "music", "palette"]);
  });

  it("switches the palette on Enter", () => {
    expect(applySetupKey({ ...ready, cursor: "palette" }, "Enter", { shiftKey: false, canContinue: true })).toBe("palette");
  });

  it("toggles music on Enter", () => {
    expect(applySetupKey({ ...ready, cursor: "music" }, "Enter", { shiftKey: false, canContinue: true })).toBe("music");
  });

  it("toggles on Enter", () => {
    expect(applySetupKey({ ...ready, cursor: "sound" }, "Enter", { shiftKey: false, canContinue: true })).toBe("sound");
  });
});

describe("restore choice", () => {
  it("comes after CLEAR BOARD, and only while a clear can be undone", () => {
    const choices = setupChoices("famous-lines", true, false, true);
    expect(choices.slice(choices.indexOf("clear"), choices.indexOf("clear") + 3)).toEqual(["clear", "restore", "name"]);
    expect(setupChoices("famous-lines", true, false, false)).not.toContain("restore");
  });

  it("asks to restore on Enter", () => {
    expect(
      applySetupKey({ ...ready, cursor: "restore" }, "Enter", { shiftKey: false, canContinue: true, canRestore: true }),
    ).toBe("restore");
  });
});

describe("update choice", () => {
  it("puts UPDATE NOW first only while an update is ready", () => {
    expect(setupChoices("famous-lines", true, true)[0]).toBe("update");
    expect(setupChoices("famous-lines", true, false)).not.toContain("update");
    expect(setupChoices("famous-lines", true)).not.toContain("update");
  });

  it("reaches UPDATE NOW by wrapping down from PALETTE, and Enter on it asks for the update", () => {
    const options = { shiftKey: false, canContinue: true, updateReady: true };
    const onUpdate = applySetupKey({ ...ready, cursor: "palette" }, "ArrowDown", options);
    expect(onUpdate).toEqual({ ...ready, cursor: "update" });
    if (onUpdate === null || typeof onUpdate === "string") {
      throw new Error("ArrowDown should land on UPDATE NOW");
    }
    expect(applySetupKey(onUpdate, "Enter", options)).toBe("update");
  });

  it("moves a cursor left on UPDATE NOW back to START EVENT once the update is gone", () => {
    expect(applySetupKey({ ...ready, cursor: "update" }, "Enter", { shiftKey: false, canContinue: true })).toBe("start");
  });

  it("skips CLEAR BOARD when the board has no scores to clear", () => {
    expect(setupChoices("words", true, false, false, false)).not.toContain("clear");
    expect(setupChoices("words", true, false, false, true)).toContain("clear");
    const fromDownload = applySetupKey(
      { cursor: "download", duration: 30, testMode: "words", leaderboard: "continue" },
      "ArrowDown",
      { shiftKey: false, canContinue: true, canClear: false },
    );
    expect(typeof fromDownload === "object" && fromDownload?.cursor).toBe("name");
  });
});
