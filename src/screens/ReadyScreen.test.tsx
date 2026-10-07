// @vitest-environment jsdom
import { fakeBoothClock } from "../test/domSetup";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScoreRecord } from "../db/persistence";
import { ReadyScreen } from "./ReadyScreen";

const { listAllScores, listScores } = vi.hoisted(() => ({
  listAllScores: vi.fn<() => Promise<ScoreRecord[]>>(),
  listScores: vi.fn<(eventId: string) => Promise<ScoreRecord[]>>(),
}));
vi.mock("../db/persistence", () => ({ listAllScores, listScores }));

const qualifying: ScoreRecord = {
  id: "s1",
  eventId: "event-1",
  name: "Alex",
  rawWpm: 60,
  displayedWpm: 60,
  accuracy: 95,
  correctCharacters: 300,
  correctAttempts: 100,
  incorrectAttempts: 5,
  durationSeconds: 30,
  testMode: "famous-lines",
  passageSetId: "common-sentences-v2",
  createdAt: "2026-10-05T10:00:00.000Z",
};

/** `scores` are the active event's; `allScores` adds other events' scores and defaults to the same list. */
async function renderReady(
  scores: ScoreRecord[] = [qualifying],
  highScore: { displayedWpm: number; name: string | null } | null = { displayedWpm: 60, name: "Alex" },
  allScores: ScoreRecord[] = scores,
  allTime = false,
) {
  listScores.mockImplementation(async (eventId) => scores.filter((score) => score.eventId === eventId));
  listAllScores.mockResolvedValue(allScores);
  const onStart = vi.fn();
  const onSetup = vi.fn();
  const onRollingChange = vi.fn();
  let shortEscape: (() => void) | null = null;
  render(
    <ReadyScreen
      eventId="event-1"
      allTime={allTime}
      highScore={highScore}
      onStart={onStart}
      onSetup={onSetup}
      onRollingChange={onRollingChange}
      claimShortEscape={(handler) => {
        shortEscape = handler;
      }}
    />,
  );
  // Let the scores load.
  await act(async () => {});
  return { onRollingChange, onStart, onSetup, shortEscape: () => act(() => shortEscape?.()) };
}

/** A tap lands its pointerup on whatever screen is showing once pointerdown has been handled. */
function tap(element: Element) {
  fireEvent.pointerDown(element, { button: 0 });
  fireEvent.pointerUp(document.querySelector("main")!, { button: 0 });
}

function tapLogo() {
  const logo = screen.getByRole("button", { name: "Show high scores" });
  fireEvent.pointerDown(logo, { button: 0 });
  fireEvent.pointerUp(logo, { button: 0 });
}

describe("ReadyScreen", () => {
  beforeEach(fakeBoothClock);

  it("shows the current high score", async () => {
    await renderReady();
    expect(screen.getByText("60 WPM")).toBeTruthy();
    expect(screen.getByText("Alex")).toBeTruthy();
  });

  it("crowns the high score's name", async () => {
    await renderReady();
    const crown = screen.getByText("Alex").querySelector(".high-score-crown");
    expect(crown?.getAttribute("aria-hidden")).toBe("true");
  });

  it("invites the first high score of the day when the event has none", async () => {
    await renderReady([], null);
    expect(screen.getByText("Be the first high score today!")).toBeTruthy();
    expect(document.querySelector(".high-score-crown")).toBeNull();
  });

  it("shows the all-time best under the event's high score when another event holds it", async () => {
    const best = { ...qualifying, id: "best", eventId: "event-0", name: "Zed", displayedWpm: 196 };
    await renderReady([qualifying], { displayedWpm: 60, name: "Alex" }, [qualifying, best]);
    expect(screen.getByText("All-time best: 196 WPM · Zed")).toBeTruthy();
  });

  it("shows the all-time best on an event with no score yet", async () => {
    const best = { ...qualifying, id: "best", eventId: "event-0", name: "Zed", displayedWpm: 196 };
    await renderReady([], null, [best]);
    expect(screen.getByText("Be the first high score today!")).toBeTruthy();
    expect(screen.getByText("All-time best: 196 WPM · Zed")).toBeTruthy();
  });

  it("hides the all-time line when this event's high score is the all-time best", async () => {
    await renderReady();
    expect(screen.queryByText(/All-time best/)).toBeNull();
  });

  it("starts the test from any key through the window listener", async () => {
    const { onStart } = await renderReady();
    fireEvent.keyDown(window, { key: "a" });
    expect(onStart).toHaveBeenCalledExactlyOnceWith("a");
  });

  it("does not start the test from Escape or a repeated key", async () => {
    const { onStart } = await renderReady();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(window, { key: "a", repeat: true });
    expect(onStart).not.toHaveBeenCalled();
  });

  it("starts the test from a tap on Ready, as no typed character", async () => {
    const { onStart } = await renderReady();
    tap(screen.getByRole("main"));
    expect(onStart).toHaveBeenCalledExactlyOnceWith("");
  });

  it("opens the rolling list from a logo tap and does not start the test", async () => {
    const { onStart, onSetup } = await renderReady();
    tapLogo();
    expect(screen.getByText("HIGH SCORES")).toBeTruthy();
    expect(onStart).not.toHaveBeenCalled();
    expect(onSetup).not.toHaveBeenCalled();
  });

  it("reports when the rolling list opens and closes, so the music can follow it", async () => {
    const { onRollingChange, shortEscape } = await renderReady();
    expect(onRollingChange).toHaveBeenLastCalledWith(false);
    tapLogo();
    expect(onRollingChange).toHaveBeenLastCalledWith(true);
    shortEscape();
    expect(onRollingChange).toHaveBeenLastCalledWith(false);
  });

  it("does nothing on a logo tap when there is no score to roll", async () => {
    const { onStart } = await renderReady([]);
    tapLogo();
    expect(screen.queryByText("HIGH SCORES")).toBeNull();
    expect(onStart).not.toHaveBeenCalled();
  });

  it("opens the rolling list on a short Escape, like a logo tap, and closes it on the next", async () => {
    const { onStart, shortEscape } = await renderReady();
    shortEscape();
    expect(screen.getByText("HIGH SCORES")).toBeTruthy();
    shortEscape();
    expect(screen.queryByText("HIGH SCORES")).toBeNull();
    expect(onStart).not.toHaveBeenCalled();
  });

  it("keeps the rolling list up on Escape key-down, so the short press can close it", async () => {
    const { shortEscape } = await renderReady();
    shortEscape();
    fireEvent.keyDown(screen.getByRole("main"), { key: "Escape" });
    expect(screen.getByText("HIGH SCORES")).toBeTruthy();
    shortEscape();
    expect(screen.queryByText("HIGH SCORES")).toBeNull();
  });

  it("does nothing on a short Escape when there is no score to roll", async () => {
    const { shortEscape } = await renderReady([]);
    shortEscape();
    expect(screen.queryByText("HIGH SCORES")).toBeNull();
  });

  it("opens Event Setup on a logo hold without starting the test", async () => {
    const { onStart, onSetup } = await renderReady();
    const logo = screen.getByRole("button", { name: "Show high scores" });
    fireEvent.pointerDown(logo, { button: 0 });
    act(() => vi.advanceTimersByTime(600));
    expect(onSetup).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
  });

  it("shows the rolling list after 2 idle minutes when a qualifying score exists", async () => {
    await renderReady();
    act(() => vi.advanceTimersByTime(119_999));
    expect(screen.queryByText("HIGH SCORES")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("HIGH SCORES")).toBeTruthy();
  });

  it("shimmers only the top score on the rolling list", async () => {
    await renderReady();
    act(() => vi.advanceTimersByTime(120_000));
    const rows = [...document.querySelectorAll(".screensaver-rows:not([aria-hidden='true']) .score-row")];
    expect(rows[0]?.className).toContain("is-shining");
    expect(rows.slice(1).some((row) => row.className.includes("is-shining"))).toBe(false);
  });

  it("rolls the current event's scores, not other events'", async () => {
    const older = { ...qualifying, id: "old", eventId: "event-0", name: "Old Champ", displayedWpm: 99 };
    await renderReady([qualifying], { displayedWpm: 60, name: "Alex" }, [qualifying, older]);
    tapLogo();
    const rolling = document.querySelector(".screensaver-rows:not([aria-hidden='true'])");
    expect(rolling?.textContent).toContain("Alex");
    expect(rolling?.textContent).not.toContain("Old Champ");
  });

  it("rolls every event's scores and says ALL-TIME on an all-time board", async () => {
    const older = { ...qualifying, id: "old", eventId: "event-0", name: "Old Champ", displayedWpm: 99 };
    await renderReady([qualifying], { displayedWpm: 99, name: "Old Champ" }, [qualifying, older], true);
    expect(screen.getByText("ALL-TIME HIGH SCORE")).toBeTruthy();
    tapLogo();
    expect(screen.getByText("ALL-TIME HIGH SCORES")).toBeTruthy();
    const rolling = document.querySelector(".screensaver-rows:not([aria-hidden='true'])");
    expect(rolling?.textContent).toContain("Old Champ");
    expect(rolling?.textContent).toContain("Alex");
  });

  it("does not repeat the all-time best line on an all-time board", async () => {
    const older = { ...qualifying, id: "old", eventId: "event-0", name: "Old Champ", displayedWpm: 99 };
    await renderReady([qualifying], { displayedWpm: 99, name: "Old Champ" }, [qualifying, older], true);
    expect(screen.queryByText(/All-time best/)).toBeNull();
  });

  it("keeps the event labels on an event board", async () => {
    await renderReady();
    expect(screen.getByText("CURRENT HIGH SCORE")).toBeTruthy();
    tapLogo();
    expect(screen.getByText("HIGH SCORES")).toBeTruthy();
  });

  it("does not roll when only other events have scores", async () => {
    const older = { ...qualifying, id: "old", eventId: "event-0", name: "Old Champ" };
    await renderReady([], null, [older]);
    act(() => vi.advanceTimersByTime(180_000));
    expect(screen.queryByText("HIGH SCORES")).toBeNull();
  });

  it("stays on Ready when no qualifying score exists", async () => {
    await renderReady([]);
    act(() => vi.advanceTimersByTime(180_000));
    expect(screen.queryByText("HIGH SCORES")).toBeNull();
  });

  it("returns from the rolling list to Ready on a tap, without starting the test", async () => {
    const { onStart } = await renderReady();
    tapLogo();
    tap(screen.getByRole("main"));
    expect(screen.queryByText("HIGH SCORES")).toBeNull();
    expect(screen.getByText("PRESS ANY KEY TO START")).toBeTruthy();
    expect(onStart).not.toHaveBeenCalled();
  });

  it("returns from the rolling list to Ready on a key, without starting the test", async () => {
    const { onStart } = await renderReady();
    tapLogo();
    fireEvent.keyDown(window, { key: "a" });
    expect(screen.queryByText("HIGH SCORES")).toBeNull();
    expect(onStart).not.toHaveBeenCalled();
  });
});
