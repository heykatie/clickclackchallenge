// @vitest-environment jsdom
import { fakeBoothClock } from "../test/domSetup";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScoreRecord } from "../db/persistence";
import { ReadyScreen } from "./ReadyScreen";

const { listAllScores } = vi.hoisted(() => ({ listAllScores: vi.fn<() => Promise<ScoreRecord[]>>() }));
vi.mock("../db/persistence", () => ({ listAllScores }));

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

async function renderReady(scores: ScoreRecord[] = [qualifying]) {
  listAllScores.mockResolvedValue(scores);
  const onStart = vi.fn();
  const onSetup = vi.fn();
  let shortEscape: (() => void) | null = null;
  render(
    <ReadyScreen
      highScore={{ displayedWpm: 60, name: "Alex" }}
      onStart={onStart}
      onSetup={onSetup}
      claimShortEscape={(handler) => {
        shortEscape = handler;
      }}
    />,
  );
  // Let the all-time scores load.
  await act(async () => {});
  return { onStart, onSetup, shortEscape: () => act(() => shortEscape?.()) };
}

/** A tap lands its pointerup on whatever screen is showing once pointerdown has been handled. */
function tap(element: Element) {
  fireEvent.pointerDown(element, { button: 0 });
  fireEvent.pointerUp(document.querySelector("main")!, { button: 0 });
}

function tapLogo() {
  const logo = screen.getByRole("button", { name: "Logo" });
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
    const logo = screen.getByRole("button", { name: "Logo" });
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
