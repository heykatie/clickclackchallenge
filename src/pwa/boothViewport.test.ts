import { describe, expect, it } from "vitest";
import { needsLandscapeGate, showsInPortrait } from "./boothViewport";

describe("needsLandscapeGate", () => {
  it("shows the instruction in portrait", () => {
    expect(needsLandscapeGate(820, 1180)).toBe(true);
  });

  it("allows typing in a windowed landscape viewport", () => {
    expect(needsLandscapeGate(1280, 800)).toBe(false);
  });

  it("keeps the instruction for a square viewport", () => {
    expect(needsLandscapeGate(800, 800)).toBe(true);
  });

  it("hides the booth when the viewport size is unknown", () => {
    expect(needsLandscapeGate(0, 0)).toBe(true);
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
