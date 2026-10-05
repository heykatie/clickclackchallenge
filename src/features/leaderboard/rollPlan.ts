/** Slow enough to read a name from a few steps away. */
export const ROLL_PX_PER_SECOND = 36;
export const MIN_ROLL_SECONDS = 12;

export interface RollPlan {
  rolls: boolean;
  /** Time for one full copy of the list to pass. */
  seconds: number;
}

/** Each score shows once. The list only rolls when it is taller than its window. */
export function rollPlan(listHeight: number, windowHeight: number): RollPlan {
  if (listHeight <= windowHeight) {
    return { rolls: false, seconds: 0 };
  }
  return { rolls: true, seconds: Math.max(MIN_ROLL_SECONDS, listHeight / ROLL_PX_PER_SECOND) };
}
