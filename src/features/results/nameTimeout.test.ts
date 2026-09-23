import { describe, expect, it } from "vitest";
import {
  BLANK_NAME_SECONDS,
  NAME_COUNTDOWN_SECONDS,
  STARTED_NAME_SECONDS,
  nameTimeoutMessage,
  nameTimerKey,
  nameTimerPhase,
  nameTimerSeconds,
} from "./nameTimeout";

describe("nameTimerPhase", () => {
  it("waits out an empty or blocked name", () => {
    expect(nameTimerPhase(true, "", false)).toBe("blank");
    expect(nameTimerPhase(true, "   ", false)).toBe("blank");
    expect(nameTimerPhase(true, "shit", false)).toBe("blank");
  });

  it("starts the save wait once the name is allowed", () => {
    expect(nameTimerPhase(true, "Ann", false)).toBe("started");
    expect(nameTimerPhase(true, "  Ann  ", false)).toBe("started");
  });

  it("stays off when name entry is hidden or a save is in progress", () => {
    expect(nameTimerPhase(false, "Ann", false)).toBe("off");
    expect(nameTimerPhase(true, "Ann", true)).toBe("off");
  });
});

describe("nameTimerSeconds", () => {
  it("uses 15 seconds for a blank name and 20 quiet seconds plus a 5 second countdown for a started name", () => {
    expect(nameTimerSeconds("blank")).toBe(BLANK_NAME_SECONDS);
    expect(nameTimerSeconds("blank")).toBe(15);
    expect(nameTimerSeconds("started")).toBe(STARTED_NAME_SECONDS);
    expect(nameTimerSeconds("started") - NAME_COUNTDOWN_SECONDS).toBe(20);
    expect(nameTimerSeconds("off")).toBe(0);
  });
});

describe("nameTimerKey", () => {
  it("restarts only when the allowed name changes", () => {
    expect(nameTimerKey("started", "A")).not.toBe(nameTimerKey("started", "An"));
    expect(nameTimerKey("blank", "")).toBe(nameTimerKey("blank", "shit"));
  });
});

describe("nameTimeoutMessage", () => {
  it("shows the blank exit only for the last 5 seconds", () => {
    expect(nameTimeoutMessage("blank", 6)).toBeNull();
    expect(nameTimeoutMessage("blank", 5)).toBe("Opening the leaderboard in 5s");
    expect(nameTimeoutMessage("blank", 0)).toBeNull();
  });

  it("shows the save countdown only for the last 5 seconds", () => {
    expect(nameTimeoutMessage("started", 6)).toBeNull();
    expect(nameTimeoutMessage("started", 5)).toBe("Saving your score in 5s");
    expect(nameTimeoutMessage("started", 1)).toBe("Saving your score in 1s");
  });

  it("shows nothing while the timer is off", () => {
    expect(nameTimeoutMessage("off", 3)).toBeNull();
  });
});
