/** How long the logo badge must be pressed before Event Setup opens. */
export const HOLD_SETUP_MS = 600;

/** Holding Escape on Ready, including the rolling list, opens Event Setup after this long. */
export const ESCAPE_HOLD_READY_MS = 1_500;
/** Elsewhere a contestant is mid-turn on the giant keyboard, so an accidental hold must be much longer. */
export const ESCAPE_HOLD_MS = 3_000;

export function escapeHoldMs(screen: "ready" | "typing" | "results" | "leaderboard"): number {
  return screen === "ready" ? ESCAPE_HOLD_READY_MS : ESCAPE_HOLD_MS;
}

type KeyEvent = { key: string; repeat?: boolean };

/**
 * The first Escape keydown arms a timer. Releasing it early is a short press.
 * If the timer fires, the later keyup is the hold and must not also run the short action.
 */
/** `holdMs` may be a function, read when Escape goes down, so the length follows the current screen. */
export function createEscapeHold(onHold: () => void, holdMs: number | (() => number) = HOLD_SETUP_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let opened = false;

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return {
    keyDown(event: KeyEvent): boolean {
      if (event.key !== "Escape") {
        return false;
      }
      if (!event.repeat && timer === null && !opened) {
        timer = setTimeout(() => {
          timer = null;
          opened = true;
          onHold();
        }, typeof holdMs === "function" ? holdMs() : holdMs);
      }
      return true;
    },
    keyUp(event: KeyEvent): "short" | "held" | "ignore" {
      if (event.key !== "Escape") {
        return "ignore";
      }
      if (timer !== null) {
        clearTimer();
        return "short";
      }
      if (opened) {
        opened = false;
        return "held";
      }
      return "ignore";
    },
    cancel() {
      clearTimer();
      opened = false;
    },
  };
}
