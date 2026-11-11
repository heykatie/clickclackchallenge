// @vitest-environment jsdom
import { fakeBoothClock } from "../test/domSetup";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { boothSound } from "../sound/boothSound";
import { KeycapHop } from "./KeycapHop";

describe("KeycapHop pointer controls", () => {
  const onClose = vi.fn();
  const onSetup = vi.fn();

  beforeEach(() => {
    fakeBoothClock();
    vi.spyOn(boothSound, "play");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hops from a tap anywhere on the viewport outside the dialog stage", () => {
    render(<KeycapHop onClose={onClose} onSetup={onSetup} />);

    fireEvent.pointerDown(document.body, { button: 0 });

    expect(boothSound.play).toHaveBeenCalledWith("key");
  });

  it("keeps the logo tap reserved for closing without hopping", () => {
    render(<KeycapHop onClose={onClose} onSetup={onSetup} />);
    const logo = screen.getByRole("button", { name: "Close Keycap Hop" });

    fireEvent.pointerDown(logo, { button: 0 });
    fireEvent.pointerUp(logo, { button: 0 });

    expect(onClose).toHaveBeenCalledOnce();
    expect(boothSound.play).not.toHaveBeenCalledWith("key");
  });

  it("hops again with a key whose release was missed while the app lost focus", () => {
    render(<KeycapHop onClose={onClose} onSetup={onSetup} />);
    fireEvent.keyDown(window, { key: " " });
    // Space is let go while the app is in the background, so no keyup arrives.
    fireEvent.blur(window);
    act(() => vi.advanceTimersByTime(1_000));
    vi.mocked(boothSound.play).mockClear();

    fireEvent.keyDown(window, { key: " " });

    expect(boothSound.play).toHaveBeenCalledWith("key");
  });

  it("keeps a run's score as the best when the game is closed mid-run", () => {
    const first = render(<KeycapHop onClose={onClose} onSetup={onSetup} />);
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyUp(window, { key: " " });
    act(() => vi.advanceTimersByTime(1_000));
    const score = Number(document.querySelector(".hop-score span")!.textContent);
    expect(score).toBeGreaterThan(0);
    first.unmount();

    render(<KeycapHop onClose={onClose} onSetup={onSetup} />);

    expect(Number(document.querySelector(".hop-best")!.textContent!.replace("BEST ", ""))).toBeGreaterThanOrEqual(score);
  });
});
