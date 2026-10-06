// @vitest-environment jsdom
import "../test/domSetup";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TestDuration, TestMode } from "../db/persistence";
import { EventSetupScreen } from "./EventSetupScreen";

function renderSetup(stored: { duration: TestDuration; mode: TestMode } | null) {
  const onStartFresh = vi.fn();
  const onContinue = vi.fn();
  render(
    <EventSetupScreen
      storedDuration={stored?.duration ?? null}
      storedTestMode={stored?.mode ?? null}
      saving={false}
      onStartFresh={onStartFresh}
      onContinue={onContinue}
    />,
  );
  return { onStartFresh, onContinue };
}

const press = (key: string, shiftKey = false) => fireEvent.keyDown(window, { key, shiftKey });
const existing = { duration: 30, mode: "famous-lines" } as const;

/** From START EVENT, one step up is Continue and two steps up is Start fresh. */
function chooseStartFresh() {
  press("ArrowUp");
  press("ArrowUp");
  press("Enter");
  press("ArrowDown");
  press("ArrowDown");
}

describe("EventSetupScreen", () => {
  it("continues the existing event without asking", () => {
    const { onContinue } = renderSetup(existing);
    press("Enter");
    expect(onContinue).toHaveBeenCalledExactlyOnceWith(30, "famous-lines");
    expect(screen.queryByText("Start a fresh leaderboard?")).toBeNull();
  });

  it("starts fresh without asking when no event exists yet", () => {
    const { onStartFresh } = renderSetup(null);
    press("Enter");
    expect(onStartFresh).toHaveBeenCalledExactlyOnceWith(30, "famous-lines");
  });

  it("asks before Start fresh replaces an existing event's leaderboard, with CANCEL chosen", () => {
    const { onStartFresh } = renderSetup(existing);
    chooseStartFresh();
    press("Enter");
    expect(screen.getByText("Start a fresh leaderboard?")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "CANCEL" }));
    expect(onStartFresh).not.toHaveBeenCalled();
  });

  it("goes back without starting when Enter picks CANCEL", () => {
    const { onStartFresh, onContinue } = renderSetup(existing);
    chooseStartFresh();
    press("Enter");
    press("Enter");
    expect(screen.queryByText("Start a fresh leaderboard?")).toBeNull();
    expect(onStartFresh).not.toHaveBeenCalled();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("goes back without starting on Escape", () => {
    const { onStartFresh } = renderSetup(existing);
    chooseStartFresh();
    press("Enter");
    press("ArrowRight");
    press("Escape");
    expect(screen.queryByText("Start a fresh leaderboard?")).toBeNull();
    expect(onStartFresh).not.toHaveBeenCalled();
  });

  it("starts fresh once START FRESH is chosen and picked", () => {
    const { onStartFresh } = renderSetup(existing);
    chooseStartFresh();
    press("Enter");
    press("ArrowRight");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "START FRESH" }));
    press("Enter");
    expect(onStartFresh).toHaveBeenCalledExactlyOnceWith(30, "famous-lines");
  });

  it("asks on touch too, and starts fresh from the START FRESH button", () => {
    const { onStartFresh } = renderSetup(existing);
    fireEvent.click(screen.getByLabelText("Start fresh"));
    fireEvent.click(screen.getByRole("button", { name: "START EVENT" }));
    expect(onStartFresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "START FRESH" }));
    expect(onStartFresh).toHaveBeenCalledExactlyOnceWith(30, "famous-lines");
  });
});
