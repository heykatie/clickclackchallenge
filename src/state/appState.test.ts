import { describe, expect, it } from "vitest";
import type { EventRecord } from "../db/persistence";
import { appReducer, initialState } from "./appState";

const event60: EventRecord = {
  id: "event-60",
  durationSeconds: 60,
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

  it("returns to Ready from the waiting state and stays after the timer starts", () => {
    const waiting = appReducer(
      appReducer(initialState, { type: "ENTER_READY" }),
      { type: "ENTER_TYPING" },
    );
    const aborted = appReducer(waiting, { type: "RETURN_TO_READY" });
    expect(aborted.screen).toBe("ready");
    expect(aborted.currentTest).toBeNull();

    const running = appReducer(waiting, {
      type: "TYPE_KEY",
      key: "T",
      repeat: false,
      now: 1000,
    });
    const stayed = appReducer(running, { type: "RETURN_TO_READY" });
    expect(stayed.screen).toBe("typing");
    expect(stayed.currentTest?.startedAt).toBe(1000);
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
  });
});
