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
  const durationSeconds = selectedTestMode === "story" ? 60 : selectedDuration;
  if (mode === "continue" && hasActiveEvent) {
    return { mode: "continue", durationSeconds, testMode: selectedTestMode };
  }
  return { mode: "fresh", durationSeconds, testMode: selectedTestMode };
}
