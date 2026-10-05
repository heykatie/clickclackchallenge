import { describe, expect, it } from "vitest";
import { isViewLeaderboardKey } from "./viewLeaderboardKey";

describe("isViewLeaderboardKey", () => {
  it("opens the leaderboard from Results on Enter or Space", () => {
    expect(isViewLeaderboardKey({ key: "Enter" })).toBe(true);
    expect(isViewLeaderboardKey({ key: "NumpadEnter" })).toBe(true);
    expect(isViewLeaderboardKey({ key: " " })).toBe(true);
    expect(isViewLeaderboardKey({ key: "Unidentified", code: "Enter" })).toBe(true);
    expect(isViewLeaderboardKey({ key: "Unidentified", code: "Space" })).toBe(true);
  });

  it("does not treat a letter as View Leaderboard", () => {
    expect(isViewLeaderboardKey({ key: "a", code: "KeyA" })).toBe(false);
  });
});
