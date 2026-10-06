// @vitest-environment jsdom
import "../test/domSetup";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BoardScope, TestDuration, TestMode } from "../db/persistence";
import { EventSetupScreen } from "./EventSetupScreen";

function renderSetup(
  stored: { duration: TestDuration; mode: TestMode; board?: BoardScope } | null,
  updateReady = false,
) {
  const onStartFresh = vi.fn();
  const onContinue = vi.fn();
  const onApplyUpdate = vi.fn();
  const onClearScores = vi.fn();
  render(
    <EventSetupScreen
      storedDuration={stored?.duration ?? null}
      storedTestMode={stored?.mode ?? null}
      storedBoardScope={stored?.board ?? null}
      saving={false}
      updateReady={updateReady}
      onApplyUpdate={onApplyUpdate}
      onClearScores={onClearScores}
      onStartFresh={onStartFresh}
      onContinue={onContinue}
    />,
  );
  return { onStartFresh, onContinue, onApplyUpdate, onClearScores };
}

const press = (key: string, shiftKey = false) => fireEvent.keyDown(window, { key, shiftKey });
const existing = { duration: 30, mode: "famous-lines" } as const;

/** From START EVENT, the steps up are All-time leaderboard, Continue, then Start fresh. */
function chooseStartFresh() {
  press("ArrowUp");
  press("ArrowUp");
  press("ArrowUp");
  press("Enter");
  press("ArrowDown");
  press("ArrowDown");
  press("ArrowDown");
}

describe("EventSetupScreen", () => {
  it("continues the existing event without asking", () => {
    const { onContinue } = renderSetup(existing);
    press("Enter");
    expect(onContinue).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", "event");
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

  it("shows no update message when there is no update", () => {
    renderSetup(existing);
    expect(screen.queryByText("An update is ready.")).toBeNull();
    expect(screen.queryByRole("button", { name: "UPDATE NOW" })).toBeNull();
  });

  it("shows the update message and installs it from UPDATE NOW", () => {
    const { onApplyUpdate } = renderSetup(existing, true);
    expect(screen.getByText("An update is ready.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "UPDATE NOW" }));
    expect(onApplyUpdate).toHaveBeenCalledOnce();
  });

  it("reaches UPDATE NOW with the keyboard and installs it with Enter", () => {
    const { onApplyUpdate, onContinue } = renderSetup(existing, true);
    press("ArrowDown");
    press("ArrowDown");
    expect(screen.getByRole("button", { name: "UPDATE NOW" }).className).toContain("is-cursor");
    press("Enter");
    expect(onApplyUpdate).toHaveBeenCalledOnce();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("offers the all-time leaderboard only when an event exists", () => {
    renderSetup(null);
    expect((screen.getByLabelText("All-time leaderboard") as HTMLInputElement).disabled).toBe(true);
  });

  it("keeps the event and switches its board to all-time", () => {
    const { onContinue, onStartFresh } = renderSetup(existing);
    press("ArrowUp");
    press("Enter");
    expect((screen.getByLabelText("All-time leaderboard") as HTMLInputElement).checked).toBe(true);
    press("ArrowDown");
    press("Enter");
    expect(onContinue).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", "all-time");
    expect(onStartFresh).not.toHaveBeenCalled();
    expect(screen.queryByText("Start a fresh leaderboard?")).toBeNull();
  });

  it("shows an all-time event as All-time leaderboard, and Continue switches it back", () => {
    const { onContinue } = renderSetup({ ...existing, board: "all-time" });
    expect((screen.getByLabelText("All-time leaderboard") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText("Continue previous"));
    fireEvent.click(screen.getByRole("button", { name: "START EVENT" }));
    expect(onContinue).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", "event");
  });

  it("offers CLEAR ALL SCORES only when an event exists", () => {
    renderSetup(null);
    expect(screen.queryByRole("button", { name: "CLEAR ALL SCORES" })).toBeNull();
  });

  it("asks before clearing, with CANCEL chosen, and CANCEL or Escape changes nothing", () => {
    const { onClearScores, onContinue } = renderSetup(existing);
    fireEvent.click(screen.getByRole("button", { name: "CLEAR ALL SCORES" }));
    expect(screen.getByText("Clear all scores?")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "CANCEL" }));
    press("Enter");
    expect(screen.queryByText("Clear all scores?")).toBeNull();
    press("ArrowDown");
    press("Enter");
    press("ArrowRight");
    press("Escape");
    expect(screen.queryByText("Clear all scores?")).toBeNull();
    expect(onClearScores).not.toHaveBeenCalled();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("clears with the selected length and mode once CLEAR SCORES is picked", () => {
    const { onClearScores } = renderSetup(existing);
    press("ArrowDown");
    expect(screen.getByRole("button", { name: "CLEAR ALL SCORES" }).className).toContain("is-cursor");
    press("Enter");
    press("ArrowRight");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "CLEAR SCORES" }));
    press("Enter");
    expect(onClearScores).toHaveBeenCalledExactlyOnceWith(30, "famous-lines");
  });
});

