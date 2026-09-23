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
