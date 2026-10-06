import type { TestDuration, TestMode } from "../db/persistence";
import type { SetupMode } from "./setupRules";

export type SetupChoice =
  | "update"
  | "30"
  | "60"
  | "words"
  | "famous-lines"
  | "story"
  | "fresh"
  | "continue"
  | "all-time"
  | "start"
  | "clear";

export interface SetupSelection {
  cursor: SetupChoice;
  duration: TestDuration;
  testMode: TestMode;
  leaderboard: SetupMode;
}

export function setupChoices(testMode: TestMode, canContinue: boolean, updateReady = false): SetupChoice[] {
  const choices: SetupChoice[] = updateReady ? ["update"] : [];
  if (testMode !== "story") {
    choices.push("30", "60");
  }
  choices.push("words", "famous-lines", "story", "fresh");
  if (canContinue) {
    choices.push("continue", "all-time");
  }
  choices.push("start");
  if (canContinue) {
    choices.push("clear");
  }
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
  if (choice === "fresh" || choice === "continue" || choice === "all-time") {
    return { ...selection, cursor: choice, leaderboard: choice };
  }
  return { ...selection, cursor: "start" };
}

/**
 * Arrow keys move the cursor. Enter selects it. Enter on START EVENT returns "start", on UPDATE NOW
 * "update", and on CLEAR ALL SCORES "clear".
 */
export function applySetupKey(
  selection: SetupSelection,
  key: string,
  options: { shiftKey: boolean; canContinue: boolean; updateReady?: boolean },
): SetupSelection | "start" | "update" | "clear" | null {
  const choices = setupChoices(selection.testMode, options.canContinue, options.updateReady);
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
    if (current.cursor === "update") {
      return "update";
    }
    if (current.cursor === "clear") {
      return "clear";
    }
    return selectChoice(current, current.cursor);
  }
  return null;
}
