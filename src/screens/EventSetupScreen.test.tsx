// @vitest-environment jsdom
import "../test/domSetup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BoardScope, TestDuration, TestMode } from "../db/persistence";
import { EventSetupScreen } from "./EventSetupScreen";

function renderSetup(
  stored: { duration: TestDuration; mode: TestMode; board?: BoardScope; name?: string | null } | null,
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
  const onToggleMusic = vi.fn();
  const onTestModeChange = vi.fn();
  const onTogglePalette = vi.fn();
  render(
    <EventSetupScreen
      storedDuration={stored?.duration ?? null}
      storedTestMode={stored?.mode ?? null}
      storedBoardScope={stored?.board ?? null}
      storedEventName={stored?.name ?? null}
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
      musicOn={false}
      onToggleMusic={onToggleMusic}
      onTestModeChange={onTestModeChange}
      palette="warm"
      onTogglePalette={onTogglePalette}
      onStartFresh={onStartFresh}
      onContinue={onContinue}
    />,
  );
  return { onStartFresh, onContinue, onApplyUpdate, onClearScores, onRestoreScores, onDownloadScores, onToggleSound, onToggleMusic, onTestModeChange, onTogglePalette };
}

const press = (key: string, shiftKey = false) => fireEvent.keyDown(window, { key, shiftKey });
const existing = { duration: 30, mode: "famous-lines" } as const;

/** From START EVENT, the steps up are All-time leaderboard, Continue, then Start fresh. */
// START EVENT → event name → CLEAR → DOWNLOAD → All-time → Continue → Start fresh, then back down to START EVENT.
function chooseStartFresh() {
  press("ArrowUp");
  press("ArrowUp");
  press("ArrowUp");
  press("ArrowUp");
  press("ArrowUp");
  press("ArrowUp");
  press("Enter");
  press("ArrowDown");
  press("ArrowDown");
  press("ArrowDown");
  press("ArrowDown");
  press("ArrowDown");
  press("ArrowDown");
}

describe("EventSetupScreen", () => {
  it("continues the existing event without asking", () => {
    const { onContinue } = renderSetup(existing);
    press("Enter");
    expect(onContinue).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", "event", null);
    expect(screen.queryByText("Start a fresh leaderboard?")).toBeNull();
  });

  it("starts fresh without asking when no event exists yet", () => {
    const { onStartFresh } = renderSetup(null);
    press("Enter");
    expect(onStartFresh).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", null);
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
    expect(onStartFresh).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", null);
  });

  it("asks on touch too, and starts fresh from the START FRESH button", () => {
    const { onStartFresh } = renderSetup(existing);
    fireEvent.click(screen.getByLabelText("Start fresh"));
    fireEvent.click(screen.getByRole("button", { name: "START EVENT" }));
    expect(onStartFresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "START FRESH" }));
    expect(onStartFresh).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", null);
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
    // START EVENT → SOUND → MUSIC → PALETTE → wraps to UPDATE NOW.
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
    // START EVENT → event name → CLEAR → DOWNLOAD → All-time.
    press("ArrowUp");
    press("ArrowUp");
    press("ArrowUp");
    press("ArrowUp");
    press("Enter");
    expect((screen.getByLabelText("All-time leaderboard") as HTMLInputElement).checked).toBe(true);
    press("ArrowDown");
    press("ArrowDown");
    press("ArrowDown");
    press("ArrowDown");
    press("Enter");
    expect(onContinue).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", "all-time", null);
    expect(onStartFresh).not.toHaveBeenCalled();
    expect(screen.queryByText("Start a fresh leaderboard?")).toBeNull();
  });

  it("shows an all-time event as All-time leaderboard, and Continue switches it back", () => {
    const { onContinue } = renderSetup({ ...existing, board: "all-time" });
    expect((screen.getByLabelText("All-time leaderboard") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText("Continue previous"));
    fireEvent.click(screen.getByRole("button", { name: "START EVENT" }));
    expect(onContinue).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", "event", null);
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
    // START EVENT → event name → CLEAR ALL SCORES.
    press("ArrowUp");
    press("ArrowUp");
    expect(screen.getByRole("button", { name: "CLEAR ALL SCORES" }).className).toContain("is-cursor");
    press("Enter");
    press("ArrowRight");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "CLEAR SCORES" }));
    press("Enter");
    expect(onClearScores).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", null);
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
    // START EVENT → event name → RESTORE CLEARED SCORES.
    press("ArrowUp");
    press("ArrowUp");
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

  it("reaches DOWNLOAD SCORES before CLEAR ALL SCORES in the arrow-key order, and Enter downloads", () => {
    const { onDownloadScores } = renderSetup({ duration: 30, mode: "famous-lines" });
    // START EVENT → event name → CLEAR ALL SCORES → DOWNLOAD SCORES.
    press("ArrowUp");
    press("ArrowUp");
    press("ArrowUp");
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
    // START EVENT → SOUND.
    press("ArrowDown");
    expect(screen.getByRole("button", { name: "SOUND: ON" }).className).toContain("is-cursor");
    press("Enter");
    expect(onToggleSound).toHaveBeenCalledOnce();
  });

  it("tells staff how many Plinko drops this event has given out", () => {
    renderSetup(existing, false, false, false, 12);
    expect(screen.getByText("Plinko drops won this event: 12")).toBeTruthy();
  });

  it("keeps the plural for one drop, so the line reads the same at any count", () => {
    renderSetup(existing, false, false, false, 1);
    expect(screen.getByText("Plinko drops won this event: 1")).toBeTruthy();
  });

  it("shows no Plinko count before any event exists", () => {
    renderSetup(null);
    expect(screen.queryByText(/won this event/)).toBeNull();
  });

  it("shows the event name field, filled with the current event's name", () => {
    renderSetup({ ...existing, name: "Saturday market" });
    expect((screen.getByLabelText("Event name (optional)") as HTMLInputElement).value).toBe("Saturday market");
  });

  it("lets the operator type a name, Space included, without moving the Setup cursor", () => {
    renderSetup(existing);
    const field = screen.getByLabelText("Event name (optional)") as HTMLInputElement;
    field.focus();
    const space = fireEvent.keyDown(field, { key: " " });
    const left = fireEvent.keyDown(field, { key: "ArrowLeft" });
    expect(space).toBe(true);
    expect(left).toBe(true);
    expect((screen.getByLabelText("Story") as HTMLInputElement).checked).toBe(false);
    expect(document.activeElement).toBe(field);
  });

  it("leaves the field on Enter instead of starting the event", () => {
    const { onContinue, onStartFresh } = renderSetup(existing);
    const field = screen.getByLabelText("Event name (optional)") as HTMLInputElement;
    field.focus();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(document.activeElement).not.toBe(field);
    expect(onContinue).not.toHaveBeenCalled();
    expect(onStartFresh).not.toHaveBeenCalled();
  });

  it("reaches the field with Up from START EVENT, and Enter puts the cursor in it", () => {
    renderSetup(existing);
    press("ArrowUp");
    press("Enter");
    expect(document.activeElement).toBe(screen.getByLabelText("Event name (optional)"));
  });

  it("passes the typed name when the event continues", () => {
    const { onContinue } = renderSetup(existing);
    fireEvent.change(screen.getByLabelText("Event name (optional)"), { target: { value: "Fall pop-up" } });
    fireEvent.click(screen.getByRole("button", { name: /START EVENT/ }));
    expect(onContinue).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", "event", "Fall pop-up");
  });

  it("passes the typed name to a fresh event, after the confirmation", () => {
    const { onStartFresh } = renderSetup(existing);
    fireEvent.change(screen.getByLabelText("Event name (optional)"), { target: { value: "Night market" } });
    fireEvent.click(screen.getByLabelText("Start fresh"));
    fireEvent.click(screen.getByRole("button", { name: /START EVENT/ }));
    fireEvent.click(screen.getByRole("button", { name: "START FRESH" }));
    expect(onStartFresh).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", "Night market");
  });

  it("shows MUSIC: OFF beside SOUND, even before any event exists, and toggles music on click", () => {
    const { onToggleMusic, onToggleSound } = renderSetup(null);
    fireEvent.click(screen.getByRole("button", { name: "MUSIC: OFF" }));
    expect(onToggleMusic).toHaveBeenCalledOnce();
    expect(onToggleSound).not.toHaveBeenCalled();
  });

  it("toggles music with Enter from the keyboard, one step after SOUND", () => {
    const { onToggleMusic } = renderSetup(existing);
    // START EVENT → SOUND → MUSIC.
    press("ArrowDown");
    press("ArrowDown");
    expect(screen.getByRole("button", { name: "MUSIC: OFF" }).className).toContain("is-cursor");
    press("Enter");
    expect(onToggleMusic).toHaveBeenCalledOnce();
  });

  it("reports the highlighted game mode, so the music can preview that mode's world", () => {
    const { onTestModeChange } = renderSetup({ duration: 30, mode: "story" });
    expect(onTestModeChange).toHaveBeenLastCalledWith("story");
    fireEvent.click(screen.getByLabelText("Standard"));
    expect(onTestModeChange).toHaveBeenLastCalledWith("words");
  });

  it("shows PALETTE: WARM after MUSIC, even before any event exists, and switches it on click or Enter", () => {
    const { onTogglePalette } = renderSetup(null);
    fireEvent.click(screen.getByRole("button", { name: "PALETTE: WARM" }));
    expect(onTogglePalette).toHaveBeenCalledOnce();
    // START EVENT → SOUND → MUSIC → PALETTE.
    press("ArrowDown");
    press("ArrowDown");
    press("ArrowDown");
    expect(screen.getByRole("button", { name: "PALETTE: WARM" }).className).toContain("is-cursor");
    press("Enter");
    expect(onTogglePalette).toHaveBeenCalledTimes(2);
  });

  it("says which board Continue previous picks up: From “Fanime Sat”, or From last board when it has no name", () => {
    renderSetup({ ...existing, name: "Fanime Sat" });
    expect(screen.getByLabelText(/Continue previous/).closest("label")!.textContent).toContain("From “Fanime Sat”");
    cleanup();
    renderSetup(existing);
    expect(screen.getByLabelText(/Continue previous/).closest("label")!.textContent).toContain("From last board");
  });

  it("locks Story to 60s with 30s greyed out, and adds no note, so nothing below moves", () => {
    cleanup();
    renderSetup(existing);
    fireEvent.click(screen.getByLabelText("Story"));
    expect((screen.getByLabelText(/60 seconds/) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/30 seconds/) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByLabelText(/30 seconds/).closest("label")!.className).toContain("is-disabled");
    expect(screen.queryByText("Story is always 60s.")).toBeNull();
    const sixty = screen.getByLabelText(/60 seconds/).closest("label")!.className;
    expect(sixty).not.toContain("is-disabled");
    expect(sixty).not.toContain("is-fixed");
  });

  it("keeps each setting chip as wide as its widest value, so switching it does not shift the others", () => {
    cleanup();
    renderSetup(existing);
    const music = screen.getByRole("button", { name: "MUSIC: OFF" });
    const reserved = music.querySelector('[aria-hidden="true"]');
    expect(reserved?.textContent).toBe("ON");
  });

  it("shows a dot of the current palette inside PALETTE, without changing what screen readers hear", () => {
    cleanup();
    renderSetup(existing);
    const chip = screen.getByRole("button", { name: "PALETTE: WARM" });
    const swatch = chip.querySelector(".palette-swatch");
    expect(swatch?.getAttribute("aria-hidden")).toBe("true");
  });

  it("labels the clear button CLEAR ALL, with a Delete scores tooltip and a screen-reader name that says it clears the scores", () => {
    cleanup();
    renderSetup(existing);
    const clear = screen.getByRole("button", { name: "CLEAR ALL SCORES" });
    expect(clear.textContent).toBe("CLEAR ALL");
    expect(clear.getAttribute("data-tooltip")).toBe("Delete scores");
  });
});
