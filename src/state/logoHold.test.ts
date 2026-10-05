import { afterEach, describe, expect, it, vi } from "vitest";
import { HOLD_SETUP_MS } from "./escapeHold";
import { createLogoHold } from "./logoHold";

describe("logo hold", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens Event Setup after the logo is held", () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    const hold = createLogoHold(onHold);

    hold.begin();
    vi.advanceTimersByTime(HOLD_SETUP_MS - 1);
    expect(onHold).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onHold).toHaveBeenCalledOnce();
  });

  it("does nothing when the logo is released early", () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    const hold = createLogoHold(onHold);

    hold.begin();
    vi.advanceTimersByTime(HOLD_SETUP_MS - 1);
    hold.end();
    vi.advanceTimersByTime(HOLD_SETUP_MS);
    expect(onHold).not.toHaveBeenCalled();
  });

  it("keeps one timer when a second finger presses the logo", () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    const hold = createLogoHold(onHold);

    hold.begin();
    vi.advanceTimersByTime(HOLD_SETUP_MS / 2);
    hold.begin();
    vi.advanceTimersByTime(HOLD_SETUP_MS);
    expect(onHold).toHaveBeenCalledOnce();
  });

  it("does not open Event Setup after its screen has closed", () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    const hold = createLogoHold(onHold);

    hold.begin();
    hold.end();
    hold.begin();
    hold.end();
    vi.advanceTimersByTime(HOLD_SETUP_MS * 2);
    expect(onHold).not.toHaveBeenCalled();
  });

  it("reports a release before the hold as a tap", () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    const hold = createLogoHold(onHold);

    hold.begin();
    vi.advanceTimersByTime(HOLD_SETUP_MS - 1);
    expect(hold.release()).toBe("tap");
    vi.advanceTimersByTime(HOLD_SETUP_MS);
    expect(onHold).not.toHaveBeenCalled();
  });

  it("does not report a tap after the hold has opened Event Setup", () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    const hold = createLogoHold(onHold);

    hold.begin();
    vi.advanceTimersByTime(HOLD_SETUP_MS);
    expect(onHold).toHaveBeenCalledOnce();
    expect(hold.release()).toBe("none");
  });

  it("does not report a tap when the finger slid off before release", () => {
    vi.useFakeTimers();
    const hold = createLogoHold(vi.fn());

    hold.begin();
    hold.end();
    expect(hold.release()).toBe("none");
  });
});
