import { describe, expect, it } from "vitest";
import { readyKeyDown, readyPointerUp } from "./readyKeys";

describe("readyKeyDown", () => {
  it("returns to Ready for any key while the rolling list is up", () => {
    expect(readyKeyDown("a", true)).toBe("wake");
    expect(readyKeyDown(" ", true)).toBe("wake");
    expect(readyKeyDown("Enter", true)).toBe("wake");
    expect(readyKeyDown("Escape", true)).toBe("wake");
  });

  it("does not start a test from Escape on Ready", () => {
    expect(readyKeyDown("Escape", false)).toBe("ignore");
  });

  it("starts the test from any other key on Ready", () => {
    expect(readyKeyDown("a", false)).toBe("start");
    expect(readyKeyDown(" ", false)).toBe("start");
  });
});

describe("readyPointerUp", () => {
  it("starts the test from a tap on Ready", () => {
    expect(readyPointerUp({ button: 0, onLogo: false })).toBe("start");
  });

  it("does not start the test from a tap on the logo badge", () => {
    expect(readyPointerUp({ button: 0, onLogo: true })).toBe("ignore");
  });

  it("does not start the test from a secondary button", () => {
    expect(readyPointerUp({ button: 2, onLogo: false })).toBe("ignore");
  });
});
