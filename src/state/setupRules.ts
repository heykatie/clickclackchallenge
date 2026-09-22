import type { TestDuration } from "../db/persistence";

export type SetupMode = "fresh" | "continue";

export function durationChoice(
  mode: SetupMode,
  storedDuration: TestDuration | null,
  freshDuration: TestDuration,
): TestDuration {
  if (mode === "continue" && storedDuration !== null) {
    return storedDuration;
  }
  return freshDuration;
}
