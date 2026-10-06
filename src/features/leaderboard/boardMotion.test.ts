import { describe, expect, it } from "vitest";
import { rowMotion } from "./boardMotion";

describe("rowMotion", () => {
  it("climbs the current row from below the board into its place", () => {
    expect(rowMotion(3, 3)).toEqual({ kind: "climb", rows: 3 });
    expect(rowMotion(1, 1)).toEqual({ kind: "climb", rows: 5 });
    expect(rowMotion(5, 5)).toEqual({ kind: "climb", rows: 1 });
  });

  it("slides the rows below it down to make room", () => {
    expect(rowMotion(4, 3)).toEqual({ kind: "nudge", rows: 1 });
    expect(rowMotion(5, 3)).toEqual({ kind: "nudge", rows: 1 });
  });

  it("leaves rows above it, and every row without a current score, still", () => {
    expect(rowMotion(2, 3)).toBeNull();
    expect(rowMotion(1, null)).toBeNull();
  });
});
