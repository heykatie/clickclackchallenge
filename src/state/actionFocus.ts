const FORWARD = new Set(["ArrowDown", "ArrowRight"]);
const BACKWARD = new Set(["ArrowUp", "ArrowLeft"]);

/**
 * Arrow keys, Tab, and Shift+Tab move the chosen action on Results and the Leaderboard,
 * wrapping like Event Setup. Null for other keys.
 */
export function moveActionFocus<T extends string>(
  actions: readonly T[],
  current: T | null,
  key: string,
  options: { shiftKey?: boolean } = {},
): T | null {
  const tabStep = options.shiftKey ? -1 : 1;
  const step = key === "Tab" ? tabStep : FORWARD.has(key) ? 1 : BACKWARD.has(key) ? -1 : 0;
  if (step === 0 || actions.length === 0) {
    return null;
  }
  const index = current === null ? -1 : actions.indexOf(current);
  if (index === -1) {
    return actions[0] ?? null;
  }
  return actions[(index + step + actions.length) % actions.length] ?? null;
}
