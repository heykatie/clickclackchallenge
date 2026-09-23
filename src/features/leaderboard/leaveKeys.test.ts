import { describe, expect, it } from "vitest";
import { isLeaderboardLeaveKey } from "./leaveKeys";

describe("isLeaderboardLeaveKey", () => {
  it("leaves the leaderboard on Escape, Enter, or Space", () => {
    expect(isLeaderboardLeaveKey({ key: "Escape" })).toBe(true);
    expect(isLeaderboardLeaveKey({ key: "Enter" })).toBe(true);
    expect(isLeaderboardLeaveKey({ key: "NumpadEnter" })).toBe(true);
    expect(isLeaderboardLeaveKey({ key: " " })).toBe(true);
    expect(isLeaderboardLeaveKey({ key: "Unidentified", code: "Enter" })).toBe(true);
    expect(isLeaderboardLeaveKey({ key: "Unidentified", code: "Space" })).toBe(true);
  });

  it("does not leave on a letter", () => {
    expect(isLeaderboardLeaveKey({ key: "a", code: "KeyA" })).toBe(false);
  });
});
