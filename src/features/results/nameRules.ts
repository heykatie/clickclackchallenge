export const MAX_NAME_LENGTH = 20;

export function normalizeName(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
    return null;
  }
  return trimmed;
}
