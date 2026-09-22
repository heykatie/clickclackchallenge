import type { TestDuration } from "../db/persistence";

export type SetupMode = "fresh" | "continue";

export interface EventStart {
  mode: "fresh" | "continue";
  durationSeconds: TestDuration;
}

export function planEventStart(
  mode: SetupMode,
  hasActiveEvent: boolean,
  selectedDuration: TestDuration,
): EventStart {
  if (mode === "continue" && hasActiveEvent) {
    return { mode: "continue", durationSeconds: selectedDuration };
  }
  return { mode: "fresh", durationSeconds: selectedDuration };
}
