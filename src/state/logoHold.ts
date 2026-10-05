import { HOLD_SETUP_MS } from "./escapeHold";

/** Long-press on the logo badge. The owning screen calls end() on release and when it closes. */
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
    end,
  };
}
