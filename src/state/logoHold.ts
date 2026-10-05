import { HOLD_SETUP_MS } from "./escapeHold";

/**
 * Long-press on the logo badge opens Event Setup. A release before then is a tap.
 * The owning screen calls release() on pointerup, and end() when the pointer leaves or the screen closes.
 */
export function createLogoHold(onHold: () => void, holdMs = HOLD_SETUP_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function end() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return {
    begin() {
      end();
      timer = setTimeout(() => {
        timer = null;
        onHold();
      }, holdMs);
    },
    release(): "tap" | "none" {
      const tapped = timer !== null;
      end();
      return tapped ? "tap" : "none";
    },
    end,
  };
}
