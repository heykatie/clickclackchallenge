import { afterEach, describe, expect, it, vi } from "vitest";
import { createEscapeHold, ESCAPE_HOLD_MS, ESCAPE_HOLD_READY_MS, escapeHoldMs, HOLD_SETUP_MS } from "./escapeHold";

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

describe("escapeHoldMs", () => {
  it("holds 1.5 seconds on Ready, which includes the rolling list", () => {
    expect(ESCAPE_HOLD_READY_MS).toBe(1_500);
    expect(escapeHoldMs("ready")).toBe(1_500);
  });

  it("holds 3 seconds on Typing, Results, and the Leaderboard", () => {
    expect(ESCAPE_HOLD_MS).toBe(3_000);
    expect(escapeHoldMs("typing")).toBe(3_000);
    expect(escapeHoldMs("results")).toBe(3_000);
    expect(escapeHoldMs("leaderboard")).toBe(3_000);
  });

  it("keeps the logo long-press at 0.6 seconds", () => {
    expect(HOLD_SETUP_MS).toBe(600);
  });
});

describe("escape hold length", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the hold length when Escape goes down", () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    let holdMs = ESCAPE_HOLD_READY_MS;
    const hold = createEscapeHold(onHold, () => holdMs);

    hold.keyDown({ key: "Escape" });
    vi.advanceTimersByTime(ESCAPE_HOLD_READY_MS);
    expect(onHold).toHaveBeenCalledOnce();
    hold.keyUp({ key: "Escape" });

    holdMs = ESCAPE_HOLD_MS;
    hold.keyDown({ key: "Escape" });
    vi.advanceTimersByTime(ESCAPE_HOLD_MS - 1);
    expect(hold.keyUp({ key: "Escape" })).toBe("short");
    expect(onHold).toHaveBeenCalledOnce();
  });
});

