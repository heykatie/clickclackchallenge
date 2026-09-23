type KeyUpTarget = {
  addEventListener(
    type: "keyup",
    listener: (event: { key: string }) => void,
    capture: true,
  ): void;
  removeEventListener(
    type: "keyup",
    listener: (event: { key: string }) => void,
    capture: true,
  ): void;
};

/** The key that leaves Ready stays blocked until that key is released. */
export function createStartKeyGate(target: KeyUpTarget) {
  let blocked: string | null = null;
  let listener: ((event: { key: string }) => void) | null = null;

  function clearListener() {
    if (listener === null) {
      return;
    }
    target.removeEventListener("keyup", listener, true);
    listener = null;
  }

  return {
    arm(key: string) {
      clearListener();
      blocked = key;
      const onKeyUp = (event: { key: string }) => {
        if (event.key !== key) {
          return;
        }
        if (blocked === key) {
          blocked = null;
        }
        clearListener();
      };
      listener = onKeyUp;
      target.addEventListener("keyup", onKeyUp, true);
    },
    isBlocked(key: string) {
      return blocked !== null && key === blocked;
    },
  };
}
