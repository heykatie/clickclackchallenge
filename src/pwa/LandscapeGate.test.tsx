// @vitest-environment jsdom
import "../test/domSetup";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandscapeGate } from "./LandscapeGate";

function portrait() {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 820 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 1180 });
  Object.defineProperty(window.screen, "availWidth", { configurable: true, value: 820 });
}

describe("the turn-sideways screen", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps the logo badge: a tap goes back to start, a long-press opens Event Setup", () => {
    vi.useFakeTimers();
    portrait();
    const onTap = vi.fn();
    const onHold = vi.fn();
    render(
      <LandscapeGate enabled logo={{ onTap, onHold }}>
        <p>typing</p>
      </LandscapeGate>,
    );
    expect(screen.queryByText("typing")).toBeNull();
    const badge = screen.getByRole("button", { name: "Back to start" });

    fireEvent.pointerDown(badge);
    fireEvent.pointerUp(badge);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onHold).not.toHaveBeenCalled();

    fireEvent.pointerDown(badge);
    act(() => vi.advanceTimersByTime(1_000));
    fireEvent.pointerUp(badge);
    expect(onHold).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
