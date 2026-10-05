import { describe, expect, it } from "vitest";
import { MIN_ROLL_SECONDS, ROLL_PX_PER_SECOND, rollPlan } from "./rollPlan";

describe("rollPlan", () => {
  it("holds a list still when every score fits", () => {
    expect(rollPlan(300, 600)).toEqual({ rolls: false, seconds: 0 });
    expect(rollPlan(600, 600)).toEqual({ rolls: false, seconds: 0 });
  });

  it("holds still before the list has been measured", () => {
    expect(rollPlan(0, 0)).toEqual({ rolls: false, seconds: 0 });
  });

  it("rolls a list taller than the window at a steady reading speed", () => {
    const listHeight = ROLL_PX_PER_SECOND * 30;
    expect(rollPlan(listHeight, 600)).toEqual({ rolls: true, seconds: 30 });
  });

  it("never rolls faster than the minimum loop", () => {
    expect(rollPlan(110, 100)).toEqual({ rolls: true, seconds: MIN_ROLL_SECONDS });
  });
});
