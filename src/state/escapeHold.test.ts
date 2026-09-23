import { afterEach, describe, expect, it, vi } from "vitest";
import { createEscapeHold, HOLD_SETUP_MS } from "./escapeHold";

describe("escape hold", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens Event Setup after Escape is held, and the release is not a short press", () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    const hold = createEscapeHold(onHold);

    expect(hold.keyDown({ key: "Escape", repeat: false })).toBe(true);
    hold.keyDown({ key: "Escape", repeat: true });
    vi.advanceTimersByTime(HOLD_SETUP_MS - 1);
    expect(onHold).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onHold).toHaveBeenCalledOnce();
    expect(hold.keyUp({ key: "Escape" })).toBe("held");
  });

  it("reports a short press when Escape is released early", () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    const hold = createEscapeHold(onHold);

    hold.keyDown({ key: "Escape" });
    vi.advanceTimersByTime(HOLD_SETUP_MS - 1);
    expect(hold.keyUp({ key: "Escape" })).toBe("short");

    vi.advanceTimersByTime(HOLD_SETUP_MS);
    expect(onHold).not.toHaveBeenCalled();
  });

  it("ignores keys other than Escape", () => {
    const hold = createEscapeHold(() => {
      throw new Error("other keys do not open Event Setup");
    });

    expect(hold.keyDown({ key: "a" })).toBe(false);
    expect(hold.keyUp({ key: "a" })).toBe("ignore");
    expect(hold.keyUp({ key: "Escape" })).toBe("ignore");
  });
});
