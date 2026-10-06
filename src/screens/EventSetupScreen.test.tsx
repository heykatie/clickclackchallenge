// @vitest-environment jsdom
import "../test/domSetup";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BoardScope, TestDuration, TestMode } from "../db/persistence";
import { EventSetupScreen } from "./EventSetupScreen";

function renderSetup(
  stored: { duration: TestDuration; mode: TestMode; board?: BoardScope } | null,
  updateReady = false,
  canRestore = false,
  soundOn = false,
  plinkoWins: number | null = null,
) {
  const onStartFresh = vi.fn();
  const onContinue = vi.fn();
  const onApplyUpdate = vi.fn();
  const onClearScores = vi.fn();
  const onRestoreScores = vi.fn();
  const onDownloadScores = vi.fn();
  const onToggleSound = vi.fn();
  render(
    <EventSetupScreen
      storedDuration={stored?.duration ?? null}
      storedTestMode={stored?.mode ?? null}
      storedBoardScope={stored?.board ?? null}
      saving={false}
      updateReady={updateReady}
      onApplyUpdate={onApplyUpdate}
      onClearScores={onClearScores}
      canRestore={canRestore}
      onRestoreScores={onRestoreScores}
      onDownloadScores={onDownloadScores}
      soundOn={soundOn}
      plinkoWins={plinkoWins}
      onToggleSound={onToggleSound}
      onStartFresh={onStartFresh}
      onContinue={onContinue}
    />,
  );
  return { onStartFresh, onContinue, onApplyUpdate, onClearScores, onRestoreScores, onDownloadScores, onToggleSound };
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
    // START EVENT → CLEAR ALL SCORES → DOWNLOAD SCORES → SOUND → wraps to UPDATE NOW.
    press("ArrowDown");
    press("ArrowDown");
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

  it("offers RESTORE CLEARED SCORES only after a clear", () => {
    renderSetup(existing);
    expect(screen.queryByRole("button", { name: "RESTORE CLEARED SCORES" })).toBeNull();
  });

  it("asks before restoring, with CANCEL chosen, and CANCEL changes nothing", () => {
    const { onRestoreScores } = renderSetup(existing, false, true);
    fireEvent.click(screen.getByRole("button", { name: "RESTORE CLEARED SCORES" }));
    expect(screen.getByText("Restore cleared scores?")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "CANCEL" }));
    press("Enter");
    expect(screen.queryByText("Restore cleared scores?")).toBeNull();
    expect(onRestoreScores).not.toHaveBeenCalled();
  });

  it("restores from the keyboard once RESTORE is picked", () => {
    const { onRestoreScores, onClearScores } = renderSetup(existing, false, true);
    press("ArrowDown");
    press("ArrowDown");
    expect(screen.getByRole("button", { name: "RESTORE CLEARED SCORES" }).className).toContain("is-cursor");
    press("Enter");
    press("ArrowRight");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "RESTORE" }));
    press("Enter");
    expect(onRestoreScores).toHaveBeenCalledOnce();
    expect(onClearScores).not.toHaveBeenCalled();
  });

  it("downloads the scores from the DOWNLOAD SCORES link, at once and without a confirmation", () => {
    const { onDownloadScores } = renderSetup({ duration: 30, mode: "famous-lines" });
    fireEvent.click(screen.getByRole("button", { name: "DOWNLOAD SCORES" }));
    expect(onDownloadScores).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("reaches DOWNLOAD SCORES after CLEAR ALL SCORES in the arrow-key order, and Enter downloads", () => {
    const { onDownloadScores } = renderSetup({ duration: 30, mode: "famous-lines" });
    press("ArrowDown");
    press("ArrowDown");
    expect(screen.getByRole("button", { name: "DOWNLOAD SCORES" }).className).toContain("is-cursor");
    press("Enter");
    expect(onDownloadScores).toHaveBeenCalledOnce();
  });

  it("has no DOWNLOAD SCORES link before any event exists", () => {
    renderSetup(null);
    expect(screen.queryByRole("button", { name: "DOWNLOAD SCORES" })).toBeNull();
  });

  it("shows the sound setting and toggles it from the link, before any event too", () => {
    const { onToggleSound } = renderSetup(null);
    fireEvent.click(screen.getByRole("button", { name: "SOUND: OFF" }));
    expect(onToggleSound).toHaveBeenCalledOnce();
  });

  it("says SOUND: ON when sound is on, and toggles with Enter from the keyboard", () => {
    const { onToggleSound } = renderSetup(existing, false, false, true);
    expect(screen.getByRole("button", { name: "SOUND: ON" }).getAttribute("aria-pressed")).toBe("true");
    // START EVENT → CLEAR ALL SCORES → DOWNLOAD SCORES → SOUND.
    press("ArrowDown");
    press("ArrowDown");
    press("ArrowDown");
    expect(screen.getByRole("button", { name: "SOUND: ON" }).className).toContain("is-cursor");
    press("Enter");
    expect(onToggleSound).toHaveBeenCalledOnce();
  });

  it("tells staff how many Plinko drops this event has given out", () => {
    renderSetup(existing, false, false, false, 12);
    expect(screen.getByText("Plinko drops won this event: 12")).toBeTruthy();
  });

  it("uses the singular for one drop", () => {
    renderSetup(existing, false, false, false, 1);
    expect(screen.getByText("Plinko drop won this event: 1")).toBeTruthy();
  });

  it("shows no Plinko count before any event exists", () => {
    renderSetup(null);
    expect(screen.queryByText(/won this event/)).toBeNull();
  });
});
