import { isBlockedName } from "./blockedNames";

export const MAX_NAME_LENGTH = 20;

export function nameProblem(input: string): "empty" | "blocked" | null {
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
    return "empty";
  }
  if (isBlockedName(trimmed)) {
    return "blocked";
  }
  return null;
}

export function normalizeName(input: string): string | null {
  if (nameProblem(input) !== null) {
    return null;
  }
  return input.trim();
}

export function isEnterKey(key: { key: string; code?: string }): boolean {
  return key.key === "Enter" || key.key === "NumpadEnter" || key.code === "Enter" || key.code === "NumpadEnter";
}

/** A letter to put in the name when the field is not focused yet. Null lets the browser handle the key. */
export function nameCharacterFromKey(
  key: { key: string; repeat: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean },
  target: { fieldFocused: boolean; buttonFocused: boolean },
): string | null {
  if (key.repeat || key.metaKey || key.ctrlKey || key.altKey || key.key.length !== 1) {
    return null;
  }
  if (target.fieldFocused) {
    return null;
  }
  if (target.buttonFocused && key.key === " ") {
    return null;
  }
  return key.key;
}
