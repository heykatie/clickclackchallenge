import { describe, expect, it } from "vitest";
import type { EventRecord } from "../db/persistence";
import { appReducer, initialState } from "./appState";

const event60: EventRecord = {
  id: "event-60",
  durationSeconds: 60,
  testMode: "race",
  passageSetId: "common-sentences-v1",
  status: "active",
  createdAt: "2026-09-22T00:00:00.000Z",
  updatedAt: "2026-09-22T00:00:00.000Z",
};

describe("appReducer", () => {
  it("opens typing with an unstarted test, so the Ready key is not scored", () => {
    const ready = appReducer(initialState, { type: "ENTER_READY" });
    const typing = appReducer(ready, { type: "ENTER_TYPING" });
    expect(typing.screen).toBe("typing");
    expect(typing.currentTest?.startedAt).toBeNull();
    expect(typing.currentTest?.correctAttempts).toBe(0);
    expect(typing.currentTest?.expectedSentence.startsWith("The little dog")).toBe(
      true,
    );
  });

  it("scores the first printable character and starts the timer", () => {
    const typing = appReducer(
      appReducer(initialState, { type: "ENTER_READY" }),
      { type: "ENTER_TYPING" },
    );
    const typed = appReducer(typing, {
      type: "TYPE_KEY",
      key: "T",
      repeat: false,
      now: 1000,
    });
    expect(typed.currentTest?.startedAt).toBe(1000);
    expect(typed.currentTest?.correctAttempts).toBe(1);
    expect(typed.screen).toBe("typing");
  });

  it("returns to Ready from a waiting or running test and saves nothing", () => {
    const waiting = appReducer(
      appReducer(initialState, { type: "ENTER_READY" }),
      { type: "ENTER_TYPING" },
    );
    const aborted = appReducer(waiting, { type: "RETURN_TO_READY" });
    expect(aborted.screen).toBe("ready");
    expect(aborted.currentTest).toBeNull();
    expect(aborted.latestResult).toBeNull();

    const running = appReducer(waiting, {
      type: "TYPE_KEY",
      key: "T",
      repeat: false,
      now: 1000,
    });
    const left = appReducer(running, { type: "RETURN_TO_READY" });
    expect(left.screen).toBe("ready");
    expect(left.currentTest).toBeNull();
    expect(left.latestResult).toBeNull();
  });

  it("opens Results when the test finishes, using the configured duration for WPM", () => {
    const waiting = appReducer(
      { ...initialState, durationSeconds: 30 },
      { type: "ENTER_TYPING" },
    );
    const running = appReducer(waiting, {
      type: "TYPE_KEY",
      key: "T",
      repeat: false,
      now: 0,
    });
    const finished = appReducer(running, { type: "FINISH_TEST" });
    expect(finished.screen).toBe("results");
    expect(finished.latestResult?.displayedWpm).toBe(
      Math.round((1 / 5) / 0.5),
    );
  });

  it("uses the active event duration for the test", () => {
    const withEvent = appReducer(initialState, {
      type: "SET_ACTIVE_EVENT",
      event: event60,
    });
    const typing = appReducer(appReducer(withEvent, { type: "ENTER_READY" }), {
      type: "ENTER_TYPING",
    });
    expect(typing.durationSeconds).toBe(60);
    expect(typing.currentTest?.durationSeconds).toBe(60);
    expect(typing.currentTest?.testMode).toBe("race");
    expect(typing.currentTest?.expectedSentence.startsWith("The little dog")).toBe(true);
  });

  it("starts a Standard test from a new draw of common words", () => {
    const withEvent = appReducer(initialState, {
      type: "SET_ACTIVE_EVENT",
      event: { ...event60, testMode: "words", passageSetId: "common-words-v1" },
    });
    const typing = appReducer(appReducer(withEvent, { type: "ENTER_READY" }), {
      type: "ENTER_TYPING",
    });
    const sentence = typing.currentTest?.expectedSentence ?? "";
    expect(typing.currentTest?.testMode).toBe("words");
    expect(sentence).toMatch(/^[a-z]+( [a-z]+)* $/);
    expect(sentence.startsWith("The")).toBe(false);
  });

  it("keeps the high score when a waiting test returns to Ready", () => {
    const ready = appReducer(initialState, {
      type: "ENTER_READY",
      highScore: { displayedWpm: 92, name: null },
    });
    const waiting = appReducer(ready, { type: "ENTER_TYPING" });
    const back = appReducer(waiting, { type: "RETURN_TO_READY" });
    expect(back.screen).toBe("ready");
    expect(back.highScore).toEqual({ displayedWpm: 92, name: null });
  });

  it("returns to Event Setup from Ready and keeps the active event", () => {
    const ready = appReducer(
      appReducer(initialState, { type: "SET_ACTIVE_EVENT", event: event60 }),
      { type: "ENTER_READY", highScore: null },
    );
    const setup = appReducer(ready, { type: "ENTER_SETUP" });
    expect(setup.screen).toBe("setup");
    expect(setup.activeEvent?.id).toBe(event60.id);
  });

  it("opens the leaderboard for the saved score and clears it on the way back to Ready", () => {
    const results = appReducer(
      appReducer(initialState, { type: "ENTER_TYPING" }),
      { type: "TYPE_KEY", key: "T", repeat: false, now: 0 },
    );
    const finished = appReducer(results, { type: "FINISH_TEST" });
    const board = appReducer(finished, { type: "SHOW_LEADERBOARD", currentScoreId: "score-1" });
    expect(board.screen).toBe("leaderboard");
    expect(board.currentScoreId).toBe("score-1");
    expect(board.currentTest).toBeNull();

    const ready = appReducer(board, { type: "ENTER_READY", highScore: null });
    expect(ready.screen).toBe("ready");
    expect(ready.currentScoreId).toBeNull();
    expect(ready.latestResult).toBeNull();
  });
});
