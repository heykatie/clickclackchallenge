// @vitest-environment jsdom
import "../test/domSetup";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BoardScope, TestDuration, TestMode } from "../db/persistence";
import type { EventRecapStats } from "../features/recap/eventRecap";
import { createBackup } from "../features/backup/backup";
import { EventSetupScreen } from "./EventSetupScreen";

function renderSetup(
  stored: { duration: TestDuration; mode: TestMode; board?: BoardScope; name?: string | null } | null,
  updateReady = false,
  canRestore = false,
  soundOn = false,
  _plinkoWins: number | null = null,
  canClear = true,
  recapOptions?: { stats: EventRecapStats; allTimeStats?: EventRecapStats },
) {
  const onStartFresh = vi.fn();
  const onContinue = vi.fn();
  const onApplyUpdate = vi.fn();
  const onClearScores = vi.fn();
  const onRestoreScores = vi.fn();
  const onDownloadScores = vi.fn();
  const onSaveBackup = vi.fn();
  const onRestoreBackup = vi.fn(async () => ({ eventsAdded: 1, scoresAdded: 2 }));
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
      onSaveBackup={onSaveBackup}
      onRestoreBackup={onRestoreBackup}
      soundOn={soundOn}
      recapStats={recapOptions?.stats ?? null}
      allTimeRecapStats={recapOptions?.allTimeStats ?? null}
      canClear={canClear}
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
  return { onStartFresh, onContinue, onApplyUpdate, onClearScores, onRestoreScores, onDownloadScores, onSaveBackup, onRestoreBackup, onToggleSound, onToggleMusic, onTestModeChange, onTogglePalette };
}

const press = (key: string, shiftKey = false) => fireEvent.keyDown(window, { key, shiftKey });
const existing = { duration: 30, mode: "famous-lines" } as const;

/**
 * Presses an arrow key until the setup cursor rests on the target. The exact arrow-key order is pinned by the
 * setupKeyboard tests, so these screen tests name where they are going instead of counting presses.
 */
function moveCursorTo(target: () => Element, key: "ArrowUp" | "ArrowDown" = "ArrowUp") {
  for (let presses = 0; presses < 40 && !target().className.includes("is-cursor"); presses += 1) {
    press(key);
  }
  expect(target().className).toContain("is-cursor");
}

const startButton = () => screen.getByRole("button", { name: /START EVENT/ });
const tile = (label: string) => screen.getByLabelText(label).closest("label")!;

/** From START EVENT, up to Start fresh, pick it, then back down to START EVENT. */
function chooseStartFresh() {
  moveCursorTo(() => tile("Start fresh"));
  press("Enter");
  moveCursorTo(startButton, "ArrowDown");
}

describe("EventSetupScreen", () => {
  it("continues the existing event without asking", () => {
    const { onContinue } = renderSetup(existing);
    press("Enter");
    expect(onContinue).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", "event", null);
    expect(screen.queryByText("Start a fresh leaderboard?")).toBeNull();
  });

  it("opens an offline-ready deterministic recap with the local totals", () => {
    const recapStats: EventRecapStats = {
      completedRounds: 18,
      averageWpm: 47.6,
      medianWpm: 44,
      fastestWpm: 92,
      averageAccuracy: 91.2,
      modeUsage: [{ mode: "story", rounds: 12, percentage: 66.7 }, { mode: "words", rounds: 6, percentage: 33.3 }],
      durationUsage: [{ durationSeconds: 30, rounds: 8, percentage: 44.4 }, { durationSeconds: 60, rounds: 10, percentage: 55.6 }],
      plinkoDropsWon: 5,
      plinkoWinnerPercentage: 27.8,
      roundsByHour: [{ hour: 14, rounds: 6 }, { hour: 15, rounds: 6 }, { hour: 16, rounds: 2 }],
      peakHours: [14, 15],
      peakHourRounds: 6,
    };
    renderSetup(existing, false, false, false, 5, true, { stats: recapStats });

    const eventNameInput = screen.getByLabelText("Event name (optional)");
    const recapButton = screen.getByRole("button", { name: "EVENT RECAP" });
    // EVENT RECAP sits in the tools row just under the event name.
    expect(recapButton.closest(".setup-footer-tools")?.previousElementSibling?.contains(eventNameInput)).toBe(true);

    fireEvent.click(recapButton);
    expect(screen.getByRole("dialog", { name: "Event recap" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "At a glance" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Settings" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Activity & prizes" })).toBeNull();
    expect(screen.queryByText("Leaderboard setting")).toBeNull();
    expect(screen.getByRole("dialog").querySelectorAll(".setup-recap-highlights .setup-recap-kpi")).toHaveLength(4);
    expect(screen.getByText("Rounds", { exact: true }).parentElement?.textContent).toContain("18");
    expect(screen.getByText("Peak hours").parentElement?.textContent).toContain("6 rounds");
    expect(screen.getByText("Plinko wins", { exact: true }).parentElement?.textContent).toContain("5");
    expect(screen.queryByText("Average WPM")).toBeNull();
    expect(screen.getByText("Median WPM").parentElement?.textContent).toContain("44");
    expect(screen.getByText("Fastest WPM").parentElement?.textContent).toContain("92");
    expect(screen.queryByText("Rounds ≥50 WPM")).toBeNull();
    expect(screen.getByText("Avg. accuracy").parentElement?.textContent).toContain("91.2%");
    expect(screen.queryByText("Plinko rate")).toBeNull();
    expect(screen.getByText("Plinko win rate").parentElement?.textContent).toContain("27.8%");
    expect(screen.getByText("Modes", { exact: true }).parentElement?.textContent).toContain("66.7%");
    expect(screen.getByText("Round lengths", { exact: true }).parentElement?.textContent).toContain("55.6%");
    // Each mode and length is one row: its name on the left, its share on the right, so nothing wraps mid-phrase.
    const modeRows = [...screen.getByRole("list", { name: "Mode breakdown" }).querySelectorAll("li")].map((row) =>
      [...row.children].map((part) => part.textContent),
    );
    expect(modeRows).toEqual([["Story", "66.7% · 12 rounds"], ["Words", "33.3% · 6 rounds"]]);
    const lengthShares = [...screen.getByRole("list", { name: "Round length breakdown" }).querySelectorAll("li")].map(
      (row) => row.children[1]?.textContent,
    );
    expect(lengthShares.some((share) => /^55.6% · \d+ rounds?$/.test(share ?? ""))).toBe(true);
    // The breakdowns flow as one balanced set: modes, lengths, peak hours, hourly activity, then the Plinko pair.
    const flow = screen.getByRole("dialog").querySelector(".setup-recap-flow")!;
    const blocks = [...flow.children].map((block) => block.getAttribute("data-block"));
    expect(blocks).toEqual(["modes", "lengths", "peak", "hourly", "plinko"]);
    // Modes, Round lengths, and Hourly activity read well without a title, so those stay for screen readers only.
    for (const title of ["Modes", "Round lengths", "Hourly activity"]) {
      expect(screen.getByText(title, { selector: "dt" }).className).toContain("visually-hidden");
    }
    const peakRows = [...screen.getByRole("list", { name: "Peak hours" }).querySelectorAll("li")].map((row) =>
      [...row.children].map((part) => part.textContent),
    );
    expect(peakRows).toHaveLength(2);
    expect(peakRows.every(([, rounds]) => rounds === "6 rounds")).toBe(true);
    const hourlyChart = screen.getByRole("list", { name: "Hourly activity" });
    expect(hourlyChart.textContent).toContain("6 rounds");
    expect(hourlyChart.querySelectorAll(".setup-recap-chart-bar")).toHaveLength(3);
    expect(screen.queryByText(/Percentages use completed rounds/)).toBeNull();
    expect(screen.queryByText(/Calculated on this device/)).toBeNull();
    expect(screen.queryByText(/The event completed 18 rounds/)).toBeNull();
    const accuracyHelp = screen.getByRole("button", { name: "Avg. accuracy help" });
    const accuracyTooltipId = accuracyHelp.getAttribute("aria-describedby");
    expect(accuracyTooltipId).toBeTruthy();
    expect(document.getElementById(accuracyTooltipId!)?.textContent).toMatch(/rounds with saved accuracy/);
    const hourHelp = screen.getByRole("button", { name: "Peak hours help" });
    const hourTooltipId = hourHelp.getAttribute("aria-describedby");
    expect(hourTooltipId).toBeTruthy();
    expect(document.getElementById(hourTooltipId!)?.textContent).toMatch(/saved round times.*not foot traffic/i);
    expect(screen.getByRole("button", { name: "Avg. accuracy help" }).querySelector("svg")).toBeTruthy();
  });

  it("switches between current-event and all-time recap totals", () => {
    const eventStats: EventRecapStats = {
      completedRounds: 1, averageWpm: 48, medianWpm: 48, fastestWpm: 48, averageAccuracy: 96,
      modeUsage: [{ mode: "famous-lines", rounds: 1, percentage: 100 }],
      durationUsage: [{ durationSeconds: 30, rounds: 1, percentage: 100 }],
      plinkoDropsWon: 0, plinkoWinnerPercentage: 0, roundsByHour: [{ hour: 14, rounds: 1 },], peakHours: [14], peakHourRounds: 1,
    };
    const allTimeStats = { ...eventStats, completedRounds: 43, medianWpm: 72, fastestWpm: 155 };
    renderSetup(existing, false, false, false, 0, true, { stats: eventStats, allTimeStats });
    fireEvent.click(screen.getByRole("button", { name: "EVENT RECAP" }));

    expect(screen.getByRole("group", { name: "Recap period" })).toBeTruthy();
    expect(screen.getByText("Rounds", { exact: true }).parentElement?.textContent).toContain("1");
    fireEvent.click(screen.getByRole("button", { name: "All time" }));
    expect(screen.getByText("Rounds", { exact: true }).parentElement?.textContent).toContain("43");
    expect(screen.getByText("Median WPM").parentElement?.textContent).toContain("72");
    fireEvent.click(screen.getByRole("button", { name: "This event" }));
    expect(screen.getByText("Rounds", { exact: true }).parentElement?.textContent).toContain("1");
  });

  it("uses the event name in the recap title and shows its saved leaderboard scope", () => {
    const recapStats: EventRecapStats = {
      completedRounds: 1,
      averageWpm: 48,
      medianWpm: 48,
      fastestWpm: 48,
      averageAccuracy: 96,
      modeUsage: [{ mode: "famous-lines", rounds: 1, percentage: 100 }],
      durationUsage: [{ durationSeconds: 30, rounds: 1, percentage: 100 }],
      plinkoDropsWon: 0,
      plinkoWinnerPercentage: 0,
      roundsByHour: [],
      peakHours: [],
      peakHourRounds: 0,
    };
    renderSetup({ ...existing, name: "Saturday Market", board: "all-time" }, false, false, false, 0, true, { stats: recapStats });

    fireEvent.click(screen.getByRole("button", { name: "EVENT RECAP" }));

    expect(screen.getByRole("dialog", { name: "Saturday Market" })).toBeTruthy();
    expect(screen.queryByText("Leaderboard setting")).toBeNull();
  });

  it("keeps the disabled recap hint attached to the button as a hover tooltip", () => {
    renderSetup(existing, false, false, false, 0, true, {
      stats: {
        completedRounds: 0, averageWpm: null, medianWpm: null, fastestWpm: null, averageAccuracy: null,
        modeUsage: [], durationUsage: [], plinkoDropsWon: 0, plinkoWinnerPercentage: 0,
        roundsByHour: [], peakHours: [], peakHourRounds: 0,
      },
    });

    const recapButton = screen.getByRole("button", { name: "EVENT RECAP" }) as HTMLButtonElement;
    expect(recapButton.disabled).toBe(true);
    const hintId = recapButton.getAttribute("aria-describedby");
    expect(hintId).toBeTruthy();
    const hint = document.getElementById(hintId!);
    expect(hint?.getAttribute("role")).toBe("tooltip");
    expect(hint?.textContent).toBe("Complete a round to enable recap");
    expect(recapButton.parentElement?.contains(hint)).toBe(true);
  });

  it("toggles recap help tooltips when tapped", () => {
    const recapStats: EventRecapStats = {
      completedRounds: 1, averageWpm: 40, medianWpm: 40, fastestWpm: 40, averageAccuracy: 95,
      modeUsage: [], durationUsage: [], plinkoDropsWon: 0, plinkoWinnerPercentage: 0,
      roundsByHour: [], peakHours: [], peakHourRounds: 0,
    };
    renderSetup(existing, false, false, false, 0, true, { stats: recapStats });
    fireEvent.click(screen.getByRole("button", { name: "EVENT RECAP" }));

    const helpButton = screen.getByRole("button", { name: "Avg. accuracy help" });
    expect(helpButton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(helpButton);
    expect(helpButton.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(helpButton);
    expect(helpButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens the recap from the arrow-key setup cursor", async () => {
    const recapStats: EventRecapStats = {
      completedRounds: 1, averageWpm: 40, medianWpm: 40, fastestWpm: 40, averageAccuracy: 95,
      modeUsage: [{ mode: "famous-lines", rounds: 1, percentage: 100 }], durationUsage: [{ durationSeconds: 30, rounds: 1, percentage: 100 }],
      plinkoDropsWon: 0, plinkoWinnerPercentage: 0, roundsByHour: [{ hour: 11, rounds: 1 }], peakHours: [11], peakHourRounds: 1,
    };
    renderSetup(existing, false, false, false, 0, true, { stats: recapStats });
    moveCursorTo(() => screen.getByRole("button", { name: "EVENT RECAP" }));
    press("Enter");
    expect(screen.getByRole("dialog", { name: "Event recap" })).toBeTruthy();
    expect(screen.getByText("Peak hour").parentElement?.textContent).toContain("1 round");
  });

  it("shows local event totals offline without a network request", () => {
    const original = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const recapStats: EventRecapStats = {
      completedRounds: 2, averageWpm: 60, medianWpm: 60, fastestWpm: 60, averageAccuracy: 95,
      modeUsage: [{ mode: "famous-lines", rounds: 2, percentage: 100 }], durationUsage: [{ durationSeconds: 30, rounds: 2, percentage: 100 }],
      plinkoDropsWon: 1, plinkoWinnerPercentage: 50, roundsByHour: [{ hour: 9, rounds: 2 }], peakHours: [9], peakHourRounds: 2,
    };
    try {
      renderSetup(existing, false, false, false, 1, true, {
        stats: recapStats,
      });
      fireEvent.click(screen.getByRole("button", { name: "EVENT RECAP" }));
      expect(screen.getByText("Peak hour").parentElement?.textContent).toContain("2 rounds");
      expect(screen.getByRole("dialog", { name: "Event recap" })).toBeTruthy();
      expect(screen.queryByText(/You’re offline|AI recap is unavailable/)).toBeNull();
    } finally {
      Object.defineProperty(navigator, "onLine", { configurable: true, value: original });
    }
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
    moveCursorTo(() => tile("All-time leaderboard"));
    press("Enter");
    expect((screen.getByLabelText("All-time leaderboard") as HTMLInputElement).checked).toBe(true);
    moveCursorTo(startButton, "ArrowDown");
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

  it("offers CLEAR BOARD only when an event exists", () => {
    renderSetup(null);
    expect(screen.queryByRole("button", { name: "CLEAR BOARD" })).toBeNull();
  });

  it("asks before clearing, with CANCEL chosen, and CANCEL or Escape changes nothing", () => {
    const { onClearScores, onContinue } = renderSetup(existing);
    fireEvent.click(screen.getByRole("button", { name: "CLEAR BOARD" }));
    expect(screen.getByText("Clear this board?")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "CANCEL" }));
    press("Enter");
    expect(screen.queryByText("Clear this board?")).toBeNull();
    press("ArrowDown");
    press("Enter");
    press("ArrowRight");
    press("Escape");
    expect(screen.queryByText("Clear this board?")).toBeNull();
    expect(onClearScores).not.toHaveBeenCalled();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("clears with the selected length and mode once CLEAR BOARD is confirmed", () => {
    const { onClearScores } = renderSetup(existing);
    moveCursorTo(() => screen.getByRole("button", { name: "CLEAR BOARD" }));
    press("Enter");
    press("ArrowRight");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "CLEAR BOARD" }));
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
    moveCursorTo(() => screen.getByRole("button", { name: "RESTORE CLEARED SCORES" }));
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

  it("reaches DOWNLOAD SCORES with the arrow keys, and Enter downloads", () => {
    const { onDownloadScores } = renderSetup({ duration: 30, mode: "famous-lines" });
    moveCursorTo(() => screen.getByRole("button", { name: "DOWNLOAD SCORES" }));
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

  it("leaves the Plinko count to the recap, so Event Setup shows no Plinko line", () => {
    renderSetup(existing, false, false, false, 12);
    expect(screen.queryByText(/Plinko drops won/)).toBeNull();
  });

  it("puts EVENT RECAP, SAVE BACKUP, and RESTORE BACKUP under the event name, with the storage line under them", () => {
    renderSetup(existing);
    const footer = document.querySelector(".setup-footer")!;
    const order = [
      screen.getByLabelText("Event name (optional)"),
      screen.getByRole("button", { name: "EVENT RECAP" }),
      screen.getByRole("button", { name: "SAVE BACKUP" }),
      screen.getByRole("button", { name: "RESTORE BACKUP" }),
      screen.getByText(/Storage|storage/),
    ];
    for (const element of order) expect(footer.contains(element)).toBe(true);
    for (let index = 1; index < order.length; index += 1) {
      expect(order[index - 1]!.compareDocumentPosition(order[index]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    const leaderboard = screen.getByText("Leaderboard", { selector: "legend" }).closest("fieldset")!;
    expect(within(leaderboard).queryByRole("button", { name: /BACKUP/ })).toBeNull();
    expect(within(leaderboard).getByRole("button", { name: "DOWNLOAD SCORES" })).toBeTruthy();
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

  it("reaches the field with Up from START EVENT, past the footer tools, and Enter puts the cursor in it", () => {
    renderSetup(existing);
    moveCursorTo(() => screen.getByLabelText("Event name (optional)").closest("label")!);
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

  it("labels the clear button CLEAR BOARD, with a Clear current event tooltip", () => {
    cleanup();
    renderSetup(existing);
    const clear = screen.getByRole("button", { name: "CLEAR BOARD" });
    expect(clear.textContent).toBe("CLEAR BOARD");
    expect(clear.getAttribute("data-tooltip")).toBe("Clear current event");
  });

  it("asks Clear board, Restore, and Start fresh in a modal over Event Setup, with the page behind it shut off", () => {
    cleanup();
    renderSetup(existing, false, true);
    const ask = (button: string, title: string) => {
      fireEvent.click(screen.getByRole("button", { name: button }));
      const dialog = screen.getByRole("alertdialog", { name: title });
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.closest("main")).toBeNull();
      // The page stays in place behind the modal, but cannot be pressed, tabbed to, or read out.
      const behind = document.querySelector(".setup-groups")!;
      expect(behind).toBeTruthy();
      expect(behind.closest("[inert]")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "START EVENT" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "CANCEL" }));
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(document.querySelector("[inert]")).toBeNull();
    };
    ask("CLEAR BOARD", "Clear this board?");
    ask("RESTORE CLEARED SCORES", "Restore cleared scores?");
    fireEvent.click(screen.getByLabelText(/Start fresh/));
    ask("START EVENT", "Start a fresh leaderboard?");
  });

  it("greys out CLEAR BOARD with a No scores to clear yet tooltip when the board is empty", () => {
    cleanup();
    const { onClearScores } = renderSetup(existing, false, false, false, null, false);
    const clear = screen.getByRole("button", { name: "CLEAR BOARD" }) as HTMLButtonElement;
    expect(clear.disabled).toBe(true);
    expect(clear.getAttribute("data-tooltip")).toBe("No scores to clear yet");
    fireEvent.click(clear);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onClearScores).not.toHaveBeenCalled();
  });

  it("starts fresh at once, without asking, when the current board has no scores", () => {
    cleanup();
    const { onStartFresh } = renderSetup(existing, false, false, false, null, false);
    fireEvent.click(screen.getByLabelText("Start fresh"));
    fireEvent.click(screen.getByRole("button", { name: "START EVENT" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onStartFresh).toHaveBeenCalledExactlyOnceWith(30, "famous-lines", null);
  });

  it("keeps Event Setup free of corner motifs", () => {
    cleanup();
    renderSetup(existing);
    const main = document.querySelector("main")!;
    expect(main.classList.contains("has-edge-blob")).toBe(false);
    expect(main.classList.contains("has-edge-ring")).toBe(false);
  });

  it("offers SAVE BACKUP only with an event, and RESTORE BACKUP always, even on a fresh device", () => {
    cleanup();
    renderSetup(null);
    expect(screen.queryByRole("button", { name: "SAVE BACKUP" })).toBeNull();
    expect(screen.getByRole("button", { name: "RESTORE BACKUP" })).toBeTruthy();
    cleanup();
    const { onSaveBackup } = renderSetup(existing);
    fireEvent.click(screen.getByRole("button", { name: "SAVE BACKUP" }));
    expect(onSaveBackup).toHaveBeenCalledOnce();
  });

  it("restores a backup file after asking, then says what came back", async () => {
    cleanup();
    const { onRestoreBackup } = renderSetup(null);
    const backup = createBackup({ events: [], scores: [], settings: null }, new Date("2026-10-15T09:00:00.000Z"));
    const file = new File([JSON.stringify(backup)], "clickclackchallenge-backup-2026-10-15.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Backup file"), { target: { files: [file] } });
    const dialog = await screen.findByRole("alertdialog", { name: "Restore from backup?" });
    expect(dialog.textContent).toMatch(/already on this iPad stay/);
    fireEvent.click(within(dialog).getByRole("button", { name: "RESTORE BACKUP" }));
    expect(onRestoreBackup).toHaveBeenCalledWith(backup);
    expect(await screen.findByText("Restored 2 scores from 1 event.")).toBeTruthy();
  });

  it("refuses a file that is not a backup, without asking or restoring anything", async () => {
    cleanup();
    const { onRestoreBackup } = renderSetup(existing);
    const file = new File(["date,name,wpm\n1,2,3"], "scores.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("Backup file"), { target: { files: [file] } });
    expect(await screen.findByText("That file isn’t a clickclackchallenge backup.")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onRestoreBackup).not.toHaveBeenCalled();
  });
});
