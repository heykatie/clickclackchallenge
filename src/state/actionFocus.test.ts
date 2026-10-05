import { describe, expect, it } from "vitest";
import { moveActionFocus } from "./actionFocus";

const results = ["name", "save", "view"] as const;

describe("moveActionFocus", () => {
  it("moves down and right to the next action, wrapping at the end", () => {
    expect(moveActionFocus(results, "name", "ArrowDown")).toBe("save");
    expect(moveActionFocus(results, "save", "ArrowRight")).toBe("view");
    expect(moveActionFocus(results, "view", "ArrowDown")).toBe("name");
  });

  it("moves up and left to the previous action, wrapping at the start", () => {
    expect(moveActionFocus(results, "view", "ArrowUp")).toBe("save");
    expect(moveActionFocus(results, "save", "ArrowLeft")).toBe("name");
    expect(moveActionFocus(results, "name", "ArrowUp")).toBe("view");
  });

  it("starts on the first action when nothing is chosen yet", () => {
    expect(moveActionFocus(["view"], null, "ArrowDown")).toBe("view");
    expect(moveActionFocus(["view"], null, "ArrowUp")).toBe("view");
    expect(moveActionFocus(["next"], "next", "ArrowLeft")).toBe("next");
  });

  it("moves forward on Tab and back on Shift+Tab, like Down and Up", () => {
    expect(moveActionFocus(results, "name", "Tab")).toBe("save");
    expect(moveActionFocus(results, "view", "Tab")).toBe("name");
    expect(moveActionFocus(results, "save", "Tab", { shiftKey: true })).toBe("name");
    expect(moveActionFocus(results, "name", "Tab", { shiftKey: true })).toBe("view");
  });

  it("ignores keys that are not arrows or Tab", () => {
    expect(moveActionFocus(results, "name", "Enter")).toBeNull();
    expect(moveActionFocus(results, "name", "a")).toBeNull();
  });
});
