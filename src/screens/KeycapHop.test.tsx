// @vitest-environment jsdom
import { fakeBoothClock } from "../test/domSetup";
import { fireEvent, render, screen } from "@testing-library/react";
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
});
