import type { TestDuration, TestMode } from "../db/persistence";
import type { SetupMode } from "./setupRules";

export type SetupChoice =
  | "30"
  | "60"
  | "words"
  | "famous-lines"
  | "story"
  | "fresh"
  | "continue"
  | "start";

export interface SetupSelection {
  cursor: SetupChoice;
  duration: TestDuration;
  testMode: TestMode;
  leaderboard: SetupMode;
}

export function setupChoices(testMode: TestMode, canContinue: boolean): SetupChoice[] {
  const choices: SetupChoice[] = [];
  if (testMode !== "story") {
    choices.push("30", "60");
  }
  choices.push("words", "famous-lines", "story", "fresh");
  if (canContinue) {
    choices.push("continue");
  }
  choices.push("start");
  return choices;
}

function clampCursor(cursor: SetupChoice, choices: readonly SetupChoice[]): SetupChoice {
  return choices.includes(cursor) ? cursor : "start";
}

function step(choices: readonly SetupChoice[], cursor: SetupChoice, delta: number): SetupChoice {
  const index = choices.indexOf(clampCursor(cursor, choices));
  return choices[(index + delta + choices.length) % choices.length] ?? "start";
}

function selectChoice(selection: SetupSelection, choice: SetupChoice): SetupSelection {
  if (choice === "30" || choice === "60") {
    return { ...selection, cursor: choice, duration: choice === "30" ? 30 : 60 };
  }
  if (choice === "words" || choice === "famous-lines" || choice === "story") {
    return { ...selection, cursor: choice, testMode: choice };
  }
  if (choice === "fresh" || choice === "continue") {
    return { ...selection, cursor: choice, leaderboard: choice };
  }
  return { ...selection, cursor: "start" };
}

/** Arrow keys move the cursor. Enter selects it. Enter on START EVENT returns "start". */
export function applySetupKey(
  selection: SetupSelection,
  key: string,
  options: { shiftKey: boolean; canContinue: boolean },
): SetupSelection | "start" | null {
  const choices = setupChoices(selection.testMode, options.canContinue);
  const current = { ...selection, cursor: clampCursor(selection.cursor, choices) };

  if (key === "ArrowDown" || key === "ArrowRight" || (key === "Tab" && !options.shiftKey)) {
    return { ...current, cursor: step(choices, current.cursor, 1) };
  }
  if (key === "ArrowUp" || key === "ArrowLeft" || (key === "Tab" && options.shiftKey)) {
    return { ...current, cursor: step(choices, current.cursor, -1) };
  }
  if (key === "Enter" || key === "NumpadEnter" || key === " ") {
    if (current.cursor === "start") {
      return "start";
    }
    return selectChoice(current, current.cursor);
  }
  return null;
}
