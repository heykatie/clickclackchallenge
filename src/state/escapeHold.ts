/** How long Escape must be held before Event Setup opens. Matches the logo long-press. */
export const HOLD_SETUP_MS = 600;

type KeyEvent = { key: string; repeat?: boolean };

/**
 * The first Escape keydown arms a timer. Releasing it early is a short press.
 * If the timer fires, the later keyup is the hold and must not also run the short action.
 */
export function createEscapeHold(onHold: () => void, holdMs = HOLD_SETUP_MS) {
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
        }, holdMs);
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
