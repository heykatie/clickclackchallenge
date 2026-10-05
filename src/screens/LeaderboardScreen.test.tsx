// @vitest-environment jsdom
import { fakeBoothClock } from "../test/domSetup";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ScoreRecord } from "../db/persistence";
import { LEAVE_KEY_GRACE_MS } from "../state/leaveKeyGrace";
import { LeaderboardScreen } from "./LeaderboardScreen";

function score(id: string, name: string | null, displayedWpm: number, minute: number): ScoreRecord {
  return {
    id,
    eventId: "event-1",
    name,
    rawWpm: displayedWpm,
    displayedWpm,
    accuracy: 95,
    correctCharacters: displayedWpm * 5,
    correctAttempts: 100,
    incorrectAttempts: 5,
    durationSeconds: 30,
    testMode: "famous-lines",
    passageSetId: "common-sentences-v2",
    createdAt: `2026-10-05T10:${String(minute).padStart(2, "0")}:00.000Z`,
  };
}

function renderBoard(scores: ScoreRecord[], currentScoreId: string | null = null) {
  const onNextPlayer = vi.fn();
  const onSetup = vi.fn();
  let shortEscape: (() => void) | null = null;
  render(
    <LeaderboardScreen
      scores={scores}
      currentScoreId={currentScoreId}
      onNextPlayer={onNextPlayer}
      onSetup={onSetup}
      claimShortEscape={(handler) => {
        shortEscape = handler;
      }}
    />,
  );
  return { onNextPlayer, onSetup, shortEscape: () => act(() => shortEscape?.()) };
}

function rows() {
  return within(screen.getByRole("list")).getAllByRole("listitem");
}

describe("LeaderboardScreen", () => {
  it("renders no more than five rows, in rank order", () => {
    renderBoard(Array.from({ length: 7 }, (_, i) => score(`s${i}`, `P${i}`, 40 + i, i)));
    expect(rows()).toHaveLength(5);
    expect(rows().map((row) => row.textContent)).toEqual([
      "1P646WPM",
      "2P545WPM",
      "3P444WPM",
      "4P343WPM",
      "5P242WPM",
    ]);
  });

  it("keeps five places with dashes when the board is partly empty", () => {
    renderBoard([score("a", "Alex", 60, 0)]);
    expect(rows()).toHaveLength(5);
    expect(rows()[1]?.textContent).toBe("2——");
    expect(rows()[1]?.className).toContain("is-empty");
    expect(screen.queryByText("No scores yet")).toBeNull();
  });

  it("says No scores yet on an empty board and does not crown an empty first place", () => {
    renderBoard([]);
    expect(screen.getByText("No scores yet")).toBeTruthy();
    expect(rows()[0]?.className).not.toContain("is-first");
  });

  it("marks the just-saved result with YOU, matching the score and not the name", () => {
    renderBoard([score("old", "Sam", 70, 0), score("new", "Sam", 50, 1)], "new");
    expect(within(rows()[1]!).getByText("YOU")).toBeTruthy();
    expect(within(rows()[0]!).queryByText("YOU")).toBeNull();
  });

  it("shows a dash for a score saved without a name", () => {
    renderBoard([score("a", null, 60, 0)]);
    expect(rows()[0]?.textContent).toBe("1—60WPM");
  });

  it("returns to Ready on NEXT PLAYER", () => {
    const { onNextPlayer } = renderBoard([score("a", "Alex", 60, 0)]);
    fireEvent.click(screen.getByRole("button", { name: /NEXT PLAYER/ }));
    expect(onNextPlayer).toHaveBeenCalledOnce();
  });

  it("ignores Space and Enter for the first second, then returns to Ready", () => {
    fakeBoothClock();
    const { onNextPlayer } = renderBoard([score("a", "Alex", 60, 0)]);
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onNextPlayer).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(LEAVE_KEY_GRACE_MS));
    fireEvent.keyDown(window, { key: " " });
    expect(onNextPlayer).toHaveBeenCalledOnce();
  });

  it("does not leave on Escape key-down, so Escape can be held for Event Setup", () => {
    fakeBoothClock();
    const { onNextPlayer } = renderBoard([score("a", "Alex", 60, 0)]);
    act(() => vi.advanceTimersByTime(LEAVE_KEY_GRACE_MS));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onNextPlayer).not.toHaveBeenCalled();
  });

  it("returns to Ready on a short Escape after the first second, like a logo tap", () => {
    fakeBoothClock();
    const { onNextPlayer, shortEscape } = renderBoard([score("a", "Alex", 60, 0)]);
    shortEscape();
    expect(onNextPlayer).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(LEAVE_KEY_GRACE_MS));
    shortEscape();
    expect(onNextPlayer).toHaveBeenCalledOnce();
  });

  it("returns to Ready on its own after 15 seconds, showing the countdown for the last 5", () => {
    fakeBoothClock();
    const { onNextPlayer } = renderBoard([score("a", "Alex", 60, 0)]);
    act(() => vi.advanceTimersByTime(9_000));
    expect(screen.queryByText(/Returning to ready screen/)).toBeNull();
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText("Returning to ready screen in 5s")).toBeTruthy();
    act(() => vi.advanceTimersByTime(5_000));
    expect(onNextPlayer).toHaveBeenCalledOnce();
  });

  it("returns to Ready on a logo tap", () => {
    fakeBoothClock();
    const tapped = renderBoard([score("a", "Alex", 60, 0)]);
    const logo = screen.getByRole("button", { name: "Back to start" });
    fireEvent.pointerDown(logo, { button: 0 });
    fireEvent.pointerUp(logo, { button: 0 });
    expect(tapped.onNextPlayer).toHaveBeenCalledOnce();
    expect(tapped.onSetup).not.toHaveBeenCalled();
  });

  it("opens Event Setup on a logo hold without also returning to Ready", () => {
    fakeBoothClock();
    const { onNextPlayer, onSetup } = renderBoard([score("a", "Alex", 60, 0)]);
    const logo = screen.getByRole("button", { name: "Back to start" });
    fireEvent.pointerDown(logo, { button: 0 });
    act(() => vi.advanceTimersByTime(600));
    fireEvent.pointerUp(logo, { button: 0 });
    expect(onSetup).toHaveBeenCalledOnce();
    expect(onNextPlayer).not.toHaveBeenCalled();
  });

  it("chooses NEXT PLAYER with an arrow key, and Enter on it returns to Ready", () => {
    fakeBoothClock();
    const { onNextPlayer } = renderBoard([score("a", "Alex", 60, 0)]);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /NEXT PLAYER/ }));
    act(() => vi.advanceTimersByTime(LEAVE_KEY_GRACE_MS));
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onNextPlayer).toHaveBeenCalledOnce();
  });
});
