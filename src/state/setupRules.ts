import type { TestDuration, TestMode } from "../db/persistence";

export type SetupMode = "fresh" | "continue";

export interface EventStart {
  mode: "fresh" | "continue";
  durationSeconds: TestDuration;
  testMode: TestMode;
}

export function planEventStart(
  mode: SetupMode,
  hasActiveEvent: boolean,
  selectedDuration: TestDuration,
  selectedTestMode: TestMode,
): EventStart {
  if (mode === "continue" && hasActiveEvent) {
    return { mode: "continue", durationSeconds: selectedDuration, testMode: selectedTestMode };
  }
  return { mode: "fresh", durationSeconds: selectedDuration, testMode: selectedTestMode };
}
