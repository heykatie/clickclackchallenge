const FORWARD = new Set(["ArrowDown", "ArrowRight"]);
const BACKWARD = new Set(["ArrowUp", "ArrowLeft"]);

/** Arrow keys move the chosen action on Results and the Leaderboard, wrapping like Event Setup. Null for other keys. */
export function moveActionFocus<T extends string>(
  actions: readonly T[],
  current: T | null,
  key: string,
): T | null {
  const step = FORWARD.has(key) ? 1 : BACKWARD.has(key) ? -1 : 0;
  if (step === 0 || actions.length === 0) {
    return null;
  }
  const index = current === null ? -1 : actions.indexOf(current);
  if (index === -1) {
    return actions[0] ?? null;
  }
  return actions[(index + step + actions.length) % actions.length] ?? null;
}
