import { describe, expect, it } from "vitest";
import { readyKeyDown } from "./readyKeys";

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
