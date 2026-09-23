import { describe, expect, it } from "vitest";
import { FULL_SCREEN_SLACK_PX, needsLandscapeGate, showsInPortrait } from "./boothViewport";

const SCREEN_WIDTH = 1180;

describe("needsLandscapeGate", () => {
  it("shows the instruction in portrait", () => {
    expect(needsLandscapeGate(820, 1180, SCREEN_WIDTH)).toBe(true);
  });

  it("shows the instruction when a landscape window is narrower than the screen", () => {
    expect(needsLandscapeGate(826, 820, SCREEN_WIDTH)).toBe(true);
  });

  it("shows the booth when landscape fills the screen width", () => {
    expect(needsLandscapeGate(SCREEN_WIDTH, 820, SCREEN_WIDTH)).toBe(false);
  });

  it("still shows the booth when the gap is only a scrollbar", () => {
    expect(needsLandscapeGate(SCREEN_WIDTH - FULL_SCREEN_SLACK_PX, 820, SCREEN_WIDTH)).toBe(false);
  });

  it("hides the booth when the viewport size is unknown", () => {
    expect(needsLandscapeGate(0, 0, SCREEN_WIDTH)).toBe(true);
    expect(needsLandscapeGate(1180, 820, 0)).toBe(true);
  });
});

describe("showsInPortrait", () => {
  it("keeps every screen except Typing visible in portrait", () => {
    expect(showsInPortrait("setup")).toBe(true);
    expect(showsInPortrait("rolling")).toBe(true);
    expect(showsInPortrait("ready")).toBe(true);
    expect(showsInPortrait("results")).toBe(true);
    expect(showsInPortrait("leaderboard")).toBe(true);
  });

  it("keeps Typing in landscape", () => {
    expect(showsInPortrait("typing")).toBe(false);
  });
});
