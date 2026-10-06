// @vitest-environment jsdom
import { fakeBoothClock } from "../test/domSetup";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResultStanding } from "../features/results/resultPlacement";
import { LEAVE_KEY_GRACE_MS } from "../state/leaveKeyGrace";
import type { TestResult } from "../state/appState";
import { ResultsScreen } from "./ResultsScreen";

const result: TestResult = { rawWpm: 42, displayedWpm: 42, accuracy: 96, displayedAccuracy: 96 };
const ranked: ResultStanding = { isNewHighScore: false, isTop5: true, isTop10: true, showNameEntry: true };
const unranked: ResultStanding = { isNewHighScore: false, isTop5: false, isTop10: false, showNameEntry: false };

function renderResults(standing: ResultStanding) {
  const handlers = {
    onSave: vi.fn(),
    onViewLeaderboard: vi.fn(),
    onSaveAndReady: vi.fn(),
    onSetup: vi.fn(),
  };
  let shortEscape: (() => void) | null = null;
  render(
    <ResultsScreen
      result={result}
      standing={standing}
      saving={false}
      {...handlers}
      claimShortEscape={(handler) => {
        shortEscape = handler;
      }}
    />,
  );
  return { ...handlers, shortEscape: () => act(() => shortEscape?.()) };
}

function nameField() {
  return screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement;
}

function pastGrace() {
  act(() => vi.advanceTimersByTime(LEAVE_KEY_GRACE_MS));
}

describe("ResultsScreen without name entry", () => {
  beforeEach(fakeBoothClock);

  it("shows View Leaderboard and no name field", () => {
    renderResults(unranked);
    expect(screen.getByRole("button", { name: "VIEW LEADERBOARD" })).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("ignores Space and Enter for the first second, then opens the leaderboard", () => {
    const { onViewLeaderboard } = renderResults(unranked);
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onViewLeaderboard).not.toHaveBeenCalled();

    pastGrace();
    fireEvent.keyDown(window, { key: " " });
    expect(onViewLeaderboard).toHaveBeenCalledOnce();
  });

  it("saves with no name and opens Ready on a short Escape after the first second, like a logo tap", () => {
    const { onSaveAndReady, onViewLeaderboard, shortEscape } = renderResults(unranked);
    shortEscape();
    expect(onSaveAndReady).not.toHaveBeenCalled();
    pastGrace();
    shortEscape();
    expect(onSaveAndReady).toHaveBeenCalledExactlyOnceWith(null);
    expect(onViewLeaderboard).not.toHaveBeenCalled();
  });

  it("has no idle timeout", () => {
    const { onViewLeaderboard, onSave } = renderResults(unranked);
    act(() => vi.advanceTimersByTime(120_000));
    expect(onViewLeaderboard).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves with no name and opens Ready on a logo tap", () => {
    const { onSaveAndReady, onViewLeaderboard } = renderResults(unranked);
    const logo = screen.getByRole("button", { name: "Back to start" });
    fireEvent.pointerDown(logo, { button: 0 });
    fireEvent.pointerUp(logo, { button: 0 });
    expect(onSaveAndReady).toHaveBeenCalledExactlyOnceWith(null);
    expect(onViewLeaderboard).not.toHaveBeenCalled();
  });
});

describe("ResultsScreen with name entry", () => {
  beforeEach(fakeBoothClock);

  it("focuses the name field", () => {
    renderResults(ranked);
    expect(document.activeElement).toBe(nameField());
  });

  it("puts the first letter into the name when the field is not focused yet", () => {
    renderResults(ranked);
    nameField().blur();
    fireEvent.keyDown(window, { key: "Z" });
    expect(nameField().value).toBe("Z");
    expect(document.activeElement).toBe(nameField());
  });

  it("saves the typed name on Enter after the first second", () => {
    const { onSave } = renderResults(ranked);
    fireEvent.change(nameField(), { target: { value: "  Zed  " } });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSave).not.toHaveBeenCalled();

    pastGrace();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSave).toHaveBeenCalledExactlyOnceWith("Zed");
  });

  it("does not save from a held Enter, even after the first second", () => {
    const { onSave } = renderResults(ranked);
    fireEvent.change(nameField(), { target: { value: "Zed" } });
    fireEvent.keyDown(nameField(), { key: "Enter" });
    pastGrace();
    fireEvent.keyDown(nameField(), { key: "Enter", repeat: true });
    fireEvent.keyDown(nameField(), { key: "Enter", repeat: true });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("does not save an empty or blocked name on Enter", () => {
    const { onSave } = renderResults(ranked);
    pastGrace();
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.change(nameField(), { target: { value: "f u c k" } });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Pick a different name.")).toBeTruthy();
  });

  it("opens the leaderboard with no name after 15 seconds of an empty name", () => {
    const { onViewLeaderboard, onSave } = renderResults(ranked);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByText("Opening the leaderboard in 5s")).toBeTruthy();
    act(() => vi.advanceTimersByTime(5_000));
    expect(onViewLeaderboard).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves an allowed name 20 quiet seconds after the last change, plus a 5-second countdown", () => {
    const { onSave } = renderResults(ranked);
    fireEvent.change(nameField(), { target: { value: "Zed" } });
    act(() => vi.advanceTimersByTime(20_000));
    expect(screen.getByText("Saving your score in 5s")).toBeTruthy();
    act(() => vi.advanceTimersByTime(5_000));
    expect(onSave).toHaveBeenCalledExactlyOnceWith("Zed");
  });

  it("saves the allowed name and opens Ready on a logo tap", () => {
    const { onSaveAndReady } = renderResults(ranked);
    fireEvent.change(nameField(), { target: { value: "Zed" } });
    const logo = screen.getByRole("button", { name: "Back to start" });
    fireEvent.pointerDown(logo, { button: 0 });
    fireEvent.pointerUp(logo, { button: 0 });
    expect(onSaveAndReady).toHaveBeenCalledExactlyOnceWith("Zed");
  });

  it("saves the allowed name and opens Ready on a short Escape, like a logo tap", () => {
    const { onSaveAndReady, onSave, shortEscape } = renderResults(ranked);
    fireEvent.change(nameField(), { target: { value: "Zed" } });
    pastGrace();
    shortEscape();
    expect(onSaveAndReady).toHaveBeenCalledExactlyOnceWith("Zed");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves with no name on a logo tap when the name is blocked", () => {
    const { onSaveAndReady } = renderResults(ranked);
    fireEvent.change(nameField(), { target: { value: "f u c k" } });
    const logo = screen.getByRole("button", { name: "Back to start" });
    fireEvent.pointerDown(logo, { button: 0 });
    fireEvent.pointerUp(logo, { button: 0 });
    expect(onSaveAndReady).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("opens Event Setup on a logo hold without saving", () => {
    const { onSetup, onSave, onSaveAndReady, onViewLeaderboard } = renderResults(ranked);
    const logo = screen.getByRole("button", { name: "Back to start" });
    fireEvent.pointerDown(logo, { button: 0 });
    act(() => vi.advanceTimersByTime(600));
    fireEvent.pointerUp(logo, { button: 0 });
    expect(onSetup).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
    expect(onSaveAndReady).not.toHaveBeenCalled();
    expect(onViewLeaderboard).not.toHaveBeenCalled();
  });
});

describe("ResultsScreen arrow keys", () => {
  beforeEach(fakeBoothClock);

  const button = (name: string) => screen.getByRole("button", { name });

  it("moves between the name field and the buttons with Up and Down", () => {
    renderResults(ranked);
    fireEvent.change(nameField(), { target: { value: "Zed" } });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(document.activeElement).toBe(button("SAVE SCORE"));
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(document.activeElement).toBe(button("VIEW LEADERBOARD"));
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(document.activeElement).toBe(button("SAVE SCORE"));
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(document.activeElement).toBe(nameField());
  });

  it("skips SAVE SCORE while the name cannot be saved", () => {
    renderResults(ranked);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(document.activeElement).toBe(button("VIEW LEADERBOARD"));
  });

  it("keeps Left and Right for the text cursor inside the name field", () => {
    renderResults(ranked);
    fireEvent.change(nameField(), { target: { value: "Zed" } });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(document.activeElement).toBe(nameField());
  });

  it("moves with Tab and Shift+Tab like Down and Up, never stopping on the logo", () => {
    renderResults(ranked);
    fireEvent.change(nameField(), { target: { value: "Zed" } });
    const order: (Element | null)[] = [];
    for (let i = 0; i < 4; i += 1) {
      fireEvent.keyDown(window, { key: "Tab" });
      order.push(document.activeElement);
    }
    expect(order).toEqual([button("SAVE SCORE"), button("VIEW LEADERBOARD"), nameField(), button("SAVE SCORE")]);
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(nameField());
  });

  it("moves between the buttons with Left and Right", () => {
    renderResults(ranked);
    fireEvent.change(nameField(), { target: { value: "Zed" } });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(document.activeElement).toBe(button("VIEW LEADERBOARD"));
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(button("SAVE SCORE"));
  });

  it("views the leaderboard with no name when Enter is pressed on VIEW LEADERBOARD", () => {
    const { onSave, onViewLeaderboard } = renderResults(ranked);
    fireEvent.change(nameField(), { target: { value: "Zed" } });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    pastGrace();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onViewLeaderboard).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("views the leaderboard when Space is pressed on VIEW LEADERBOARD, without typing a space", () => {
    const { onViewLeaderboard } = renderResults(ranked);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    pastGrace();
    fireEvent.keyDown(window, { key: " " });
    expect(onViewLeaderboard).toHaveBeenCalledOnce();
    expect(nameField().value).toBe("");
  });

  it("saves the name when Enter is pressed on SAVE SCORE", () => {
    const { onSave } = renderResults(ranked);
    fireEvent.change(nameField(), { target: { value: "Zed" } });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    pastGrace();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSave).toHaveBeenCalledExactlyOnceWith("Zed");
  });

  it("does not act on a chosen button in the first second", () => {
    const { onViewLeaderboard } = renderResults(ranked);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onViewLeaderboard).not.toHaveBeenCalled();
  });

  it("chooses VIEW LEADERBOARD with an arrow when there is no name entry", () => {
    const { onViewLeaderboard } = renderResults(unranked);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(document.activeElement).toBe(button("VIEW LEADERBOARD"));
    pastGrace();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onViewLeaderboard).toHaveBeenCalledOnce();
  });
});

describe("ResultsScreen WPM count-up", () => {
  beforeEach(fakeBoothClock);

  const shownWpm = () => document.querySelector(".result-wpm-count")?.textContent;

  it("gives screen readers the final WPM at once and hides the rolling number", () => {
    renderResults(unranked);
    expect(screen.getByText("42 WPM")).toBeTruthy();
    expect(document.querySelector(".result-wpm-count")?.closest("[aria-hidden='true']")).toBeTruthy();
  });

  it("holds the WPM at 0 while the headline types, then rolls up and settles on the final score", () => {
    renderResults(unranked);
    expect(shownWpm()).toBe("0");
    act(() => vi.advanceTimersByTime(850));
    expect(shownWpm()).toBe("0");
    act(() => vi.advanceTimersByTime(450));
    const midway = Number(shownWpm());
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(42);
    act(() => vi.advanceTimersByTime(1300));
    expect(shownWpm()).toBe("42");
  });

  it("shows the final WPM at once with reduced motion", () => {
    window.matchMedia = vi.fn((query: string) => ({ matches: query.includes("reduce") }) as MediaQueryList);
    try {
      renderResults(unranked);
      expect(shownWpm()).toBe("42");
    } finally {
      delete (window as { matchMedia?: unknown }).matchMedia;
    }
  });
});

describe("ResultsScreen celebration", () => {
  beforeEach(fakeBoothClock);

  const newHigh: ResultStanding = { isNewHighScore: true, isTop5: true, isTop10: true, showNameEntry: true };

  it("bursts doodles around a new high score, hidden from screen readers", () => {
    renderResults(newHigh);
    const burst = document.querySelector(".result-celebration");
    expect(burst?.getAttribute("aria-hidden")).toBe("true");
    expect(burst?.querySelectorAll(".celebration-piece").length).toBeGreaterThanOrEqual(8);
  });

  it("keeps the name field focused and usable during the burst", () => {
    const { onSave } = renderResults(newHigh);
    expect(document.activeElement).toBe(nameField());
    fireEvent.change(nameField(), { target: { value: "Zed" } });
    pastGrace();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onSave).toHaveBeenCalledExactlyOnceWith("Zed");
  });

  it("marks only the NEW HIGH SCORE headline for its celebration font", () => {
    renderResults(newHigh);
    expect(screen.getByRole("heading", { name: "NEW HIGH SCORE!" }).className).toContain("is-new-high-score");
  });

  it("keeps other headlines in the regular display font", () => {
    renderResults(ranked);
    expect(screen.getByRole("heading", { name: "Nice typing!" }).className).not.toContain("is-new-high-score");
  });

  it("types out Nice typing! one letter after another, keeping the heading's name", () => {
    renderResults(ranked);
    const heading = screen.getByRole("heading", { name: "Nice typing!" });
    const letters = [...heading.querySelectorAll(".typed-letter")];
    expect(letters.map((letter) => letter.textContent).join("")).toBe("Nice typing!");
    expect(letters.map((letter) => (letter as HTMLElement).style.getPropertyValue("--letter-index"))).toEqual(
      [..."Nice typing!"].map((_, index) => String(index)),
    );
    expect(letters[0]?.parentElement?.getAttribute("aria-hidden")).toBe("true");
  });

  it("waves the letters of Thanks for playing! one after another, keeping the heading's name", () => {
    renderResults(unranked);
    const heading = screen.getByRole("heading", { name: "Thanks for playing!" });
    const letters = [...heading.querySelectorAll(".wave-letter")];
    expect(letters.map((letter) => letter.textContent).join("")).toBe("Thanks for playing!");
    expect((letters[3] as HTMLElement).style.getPropertyValue("--letter-index")).toBe("3");
    expect(letters[0]?.parentElement?.getAttribute("aria-hidden")).toBe("true");
    expect(heading.querySelector(".typed-letter")).toBeNull();
  });

  it("does not type out NEW HIGH SCORE!", () => {
    renderResults(newHigh);
    expect(document.querySelector(".typed-letter")).toBeNull();
  });

  it("does not burst for a Top 5 place or a calm result", () => {
    renderResults(ranked);
    expect(document.querySelector(".result-celebration")).toBeNull();
  });
});

