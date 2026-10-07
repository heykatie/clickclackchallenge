// @vitest-environment jsdom
import "./test/domSetup";
import "fake-indexeddb/auto";
import { act, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDatabase, DB_NAME, listAllScores, loadBooth } from "./db/persistence";
import App from "./App";
import { boothSound } from "./sound/boothSound";

// These tests drive the whole app, so a screen change can take longer than the 1-second default when the
// machine is busy running every test file at once. A passing wait returns as soon as it passes.
configure({ asyncUtilTimeout: 5_000 });

// The service worker only exists in a real build.
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({ needRefresh: [false, vi.fn()], updateServiceWorker: vi.fn() }),
}));

/** Moves the typing clock on without waiting, so a round types at a believable speed in no real time. */
let skew = 0;
const realNow = performance.now.bind(performance);

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

function press(key: string) {
  fireEvent.keyDown(window, { key });
  fireEvent.keyUp(window, { key });
}

/** From Event Setup: a Story event, started, then one Story round typed perfectly, ending on Results. */
async function playStoryRound(eventName?: string) {
  await screen.findByText("Set up today's typing test");
  fireEvent.click(screen.getByLabelText("Story"));
  if (eventName !== undefined) {
    fireEvent.change(screen.getByLabelText("Event name (optional)"), { target: { value: eventName } });
  }
  fireEvent.click(screen.getByRole("button", { name: /START EVENT/ }));
  await screen.findByText(/PRESS ANY KEY TO START/i);
  // The key that starts the round is not typed.
  press("Shift");
  await waitFor(() => expect(document.querySelector(".caret")).toBeTruthy());
  while (document.querySelector(".caret")) {
    const glyph = document.querySelector(".caret")!.closest(".passage-char")!.querySelector(".passage-char-glyph")!;
    // 150 ms a key is about 80 WPM: fast enough to rank, well under the 200 WPM cap.
    skew += 150;
    press(glyph.textContent!);
  }
  await waitFor(() => expect(document.querySelector(".results-screen")).toBeTruthy());
}

async function resetDatabase() {
  await closeDatabase();
  await deleteDB(DB_NAME);
}

beforeEach(async () => {
  skew = 0;
  vi.spyOn(performance, "now").mockImplementation(() => realNow() + skew);
  await resetDatabase();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await resetDatabase();
});

describe("App", () => {
  it("plays a round, saves the name typed on Results with Enter, and shows it on the Leaderboard", async () => {
    render(<App />);
    await playStoryRound();
    fireEvent.change(await screen.findByRole("textbox", { name: "Name" }), { target: { value: "Robin" } });
    press("Enter");
    await waitFor(() => expect(document.querySelector(".leaderboard-screen")).toBeTruthy());
    expect(document.querySelector(".is-current")?.textContent).toContain("Robin");
    const scores = await listAllScores();
    expect(scores).toHaveLength(1);
    expect(scores[0]!.name).toBe("Robin");
    expect(scores[0]!.testMode).toBe("story");
  }, 15_000);

  it("keeps the attempt, once, when staff long-press the logo on Results to open Event Setup", async () => {
    render(<App />);
    await playStoryRound();
    // Results saves the attempt as soon as it opens.
    await waitFor(async () => expect(await listAllScores()).toHaveLength(1));
    const logo = document.querySelector(".logo-badge")!;
    fireEvent.pointerDown(logo, { button: 0 });
    await wait(700);
    fireEvent.pointerUp(document.querySelector("main")!, { button: 0 });
    await screen.findByText("Set up today's typing test");
    const scores = await listAllScores();
    expect(scores).toHaveLength(1);
    expect(scores[0]!.name).toBeNull();
  }, 15_000);

  it("keeps each day's event name on its own scores when the same board is continued under a new name", async () => {
    render(<App />);
    await playStoryRound("Fanime Sat");
    await waitFor(async () => expect(await listAllScores()).toHaveLength(1));
    // Staff go back to Event Setup and continue the same board on the next day.
    fireEvent.pointerDown(document.querySelector(".logo-badge")!, { button: 0 });
    await wait(700);
    fireEvent.pointerUp(document.querySelector("main")!, { button: 0 });
    await playStoryRound("Fanime Sun");
    await waitFor(async () => expect(await listAllScores()).toHaveLength(2));
    const scores = await listAllScores();
    expect(new Set(scores.map((score) => score.eventId)).size).toBe(1);
    expect(scores.map((score) => score.eventName).sort()).toEqual(["Fanime Sat", "Fanime Sun"]);
  }, 20_000);

  it("plays a key's sound during the key press itself, before the screen redraws", async () => {
    const play = vi.spyOn(boothSound, "play").mockImplementation(() => {});
    render(<App />);
    await screen.findByText("Set up today's typing test");
    fireEvent.click(screen.getByRole("button", { name: /START EVENT/ }));
    await screen.findByText(/PRESS ANY KEY TO START/i);
    press("Shift");
    await waitFor(() => expect(document.querySelector(".caret")).toBeTruthy());
    const glyph = document.querySelector(".caret")!.closest(".passage-char")!.querySelector(".passage-char-glyph")!;
    play.mockClear();
    // A plain browser event, outside React's test helpers, so nothing flushes React's work early.
    window.dispatchEvent(new KeyboardEvent("keydown", { key: glyph.textContent! }));
    expect(play).toHaveBeenCalledExactlyOnceWith("key");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "~" }));
    expect(play).toHaveBeenLastCalledWith("miss");
    await wait(0);
    // The redraw that follows plays nothing more.
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("starts warm, switches the whole app to the cool palette from Event Setup, and remembers it", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "PALETTE: WARM" }));
    expect(screen.getByRole("button", { name: "PALETTE: COOL" })).toBeTruthy();
    expect(document.documentElement.dataset.palette).toBe("cool");
    await waitFor(async () => expect((await loadBooth()).settings.palette).toBe("cool"));
  });

  it("shows that scores can't be saved when storage does not work", async () => {
    const working = globalThis.indexedDB;
    globalThis.indexedDB = {
      open: () => {
        throw new Error("no storage");
      },
    } as unknown as IDBFactory;
    try {
      render(<App />);
      expect(await screen.findByText("Scores can't be saved")).toBeTruthy();
    } finally {
      globalThis.indexedDB = working;
    }
  });
});
