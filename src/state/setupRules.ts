import type { BoardScope, TestDuration, TestMode } from "../db/persistence";

/** The Leaderboard choice on Event Setup. All-time keeps the event and ranks every event's scores. */
export type SetupMode = "fresh" | "continue" | "all-time";

export interface EventStart {
  mode: "fresh" | "continue";
  durationSeconds: TestDuration;
  testMode: TestMode;
  boardScope: BoardScope;
}

export function planEventStart(
  mode: SetupMode,
  hasActiveEvent: boolean,
  selectedDuration: TestDuration,
  selectedTestMode: TestMode,
): EventStart {
  const durationSeconds = selectedTestMode === "story" ? 60 : selectedDuration;
  if ((mode === "continue" || mode === "all-time") && hasActiveEvent) {
    return {
      mode: "continue",
      durationSeconds,
      testMode: selectedTestMode,
      boardScope: mode === "all-time" ? "all-time" : "event",
    };
  }
  return { mode: "fresh", durationSeconds, testMode: selectedTestMode, boardScope: "event" };
}

/** Start fresh archives the current leaderboard and there is no screen to bring it back, so it asks first. */
export function needsFreshConfirm(plan: EventStart, hasActiveEvent: boolean): boolean {
  return plan.mode === "fresh" && hasActiveEvent;
}

export type FreshConfirmChoice = "cancel" | "confirm";

/** Keys on the Start fresh confirmation. The cursor starts on CANCEL. */
export function applyFreshConfirmKey(
  cursor: FreshConfirmChoice,
  key: string,
): FreshConfirmChoice | { choose: FreshConfirmChoice } | null {
  if (key === "Escape") {
    return { choose: "cancel" };
  }
  if (key === "Enter" || key === "NumpadEnter" || key === " ") {
    return { choose: cursor };
  }
  // Two buttons, so every arrow, Tab, and Shift+Tab lands on the other one.
  if (key === "Tab" || key.startsWith("Arrow")) {
    return cursor === "cancel" ? "confirm" : "cancel";
  }
  return null;
}
