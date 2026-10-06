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

function renderBoard(
  scores: ScoreRecord[],
  currentScoreId: string | null = null,
  allTimeBest: ScoreRecord | null = null,
  allTime = false,
) {
  const onNextPlayer = vi.fn();
  const onSetup = vi.fn();
  let shortEscape: (() => void) | null = null;
  render(
    <LeaderboardScreen
      scores={scores}
      currentScoreId={currentScoreId}
      allTimeBest={allTimeBest}
      allTime={allTime}
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

  it("keeps five places, the empty ones showing one dash, when the board is partly empty", () => {
    renderBoard([score("a", "Alex", 60, 0)]);
    expect(rows()).toHaveLength(5);
    expect(rows()[1]?.textContent).toBe("2—");
    expect(rows()[1]?.className).toContain("is-empty");
    expect(screen.queryByText("No scores yet")).toBeNull();
  });

  it("fills an empty board with two house scores and three empty places", () => {
    renderBoard([]);
    expect(rows().map((row) => row.textContent)).toEqual(["1Clicky54WPM", "2Clacky47WPM", "3—", "4—", "5—"]);
    expect(screen.queryByText("No scores yet")).toBeNull();
    expect(screen.queryByText("YOU")).toBeNull();
  });

  it("does not crown an empty first place", () => {
    renderBoard([]);
    expect(rows()[2]?.className).toContain("is-empty");
    expect(rows()[2]?.className).not.toContain("is-first");
  });

  it("replaces the house scores with the first real score", () => {
    renderBoard([score("a", "Alex", 20, 0)], "a");
    expect(rows().map((row) => row.textContent)).toEqual(["1AlexYOU20WPM", "2—", "3—", "4—", "5—"]);
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

  it("returns to Ready on its own after 25 seconds, showing the countdown for the last 5", () => {
    fakeBoothClock();
    const { onNextPlayer } = renderBoard([score("a", "Alex", 60, 0)]);
    act(() => vi.advanceTimersByTime(19_000));
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

  it("chooses NEXT PLAYER with Tab and keeps it there instead of moving to the logo", () => {
    fakeBoothClock();
    renderBoard([score("a", "Alex", 60, 0)]);
    const next = screen.getByRole("button", { name: /NEXT PLAYER/ });
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(next);
    fireEvent.keyDown(window, { key: "Tab" });
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(next);
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

  it("shows the all-time best under the board when another event holds it", () => {
    const best = { ...score("best", "Zed", 196, 0), eventId: "event-0" };
    renderBoard([score("a", "Alex", 60, 1)], null, best);
    expect(screen.getByText("All-time best: 196 WPM · Zed")).toBeTruthy();
  });

  it("hides the all-time line when this board's first place is the all-time best", () => {
    const alex = score("a", "Alex", 60, 1);
    renderBoard([alex], null, alex);
    expect(screen.queryByText(/All-time best/)).toBeNull();
  });

  it("labels an all-time board ALL-TIME TOP 5 and an event board TOP 5", () => {
    renderBoard([score("a", "Alex", 60, 1)], null, null, true);
    expect(screen.getByText("ALL-TIME TOP 5")).toBeTruthy();
  });

  it("keeps TOP 5 on an event board", () => {
    renderBoard([score("a", "Alex", 60, 1)]);
    expect(screen.getByText("TOP 5")).toBeTruthy();
    expect(screen.queryByText("ALL-TIME TOP 5")).toBeNull();
  });

  it("climbs the just-saved row into place and slides the rows below it down", () => {
    renderBoard([score("a", "Alex", 90, 0), score("b", "Bo", 70, 1), score("c", "Cy", 50, 2)], "b");
    expect(rows()[1]?.className).toContain("is-climbing");
    expect(rows()[1]?.style.getPropertyValue("--climb-rows")).toBe("4");
    expect(rows()[2]?.className).toContain("is-nudged");
    expect(rows()[0]?.className).not.toMatch(/is-climbing|is-nudged/);
  });

  it("shimmers the top score when the player did not make the Top 5", () => {
    const board = [90, 80, 70, 60, 50, 40].map((wpm, index) => score(String(index), `P${index}`, wpm, index));
    renderBoard(board, "5");
    expect(rows()[0]?.className).toContain("is-shining");
    expect(rows().slice(1).some((row) => row.className.includes("is-shining"))).toBe(false);
  });

  it("does not shimmer the top score when the player placed", () => {
    renderBoard([score("a", "Alex", 90, 0), score("b", "Bo", 70, 1)], "b");
    expect(rows().some((row) => row.className.includes("is-shining"))).toBe(false);
  });

  it("bursts confetti only when the player is the new first place", () => {
    renderBoard([score("a", "Alex", 90, 0)], "a");
    expect(document.querySelector(".result-celebration")).toBeTruthy();
  });

  it("does not burst for a lower place", () => {
    renderBoard([score("a", "Alex", 90, 0), score("b", "Bo", 70, 1)], "b");
    expect(document.querySelector(".result-celebration")).toBeNull();
  });

  it("drains a countdown bar on NEXT PLAYER over the 25 seconds", () => {
    renderBoard([score("a", "Alex", 60, 0)]);
    const bar = screen.getByRole("button", { name: /NEXT PLAYER/ }).querySelector(".next-player-countdown");
    expect(bar?.getAttribute("aria-hidden")).toBe("true");
  });
});

