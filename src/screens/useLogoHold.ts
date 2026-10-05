import { useEffect, useRef } from "react";
import { createLogoHold } from "../state/logoHold";

/**
 * Pointer handlers for the logo badge: a long-press runs onHold, a tap runs onTap when given.
 * The pending hold is cancelled when the screen closes.
 */
export function useLogoHold(onHold: () => void, onTap?: () => void) {
  const onHoldRef = useRef(onHold);
  const onTapRef = useRef(onTap);
  const holdRef = useRef<ReturnType<typeof createLogoHold> | null>(null);

  useEffect(() => {
    onHoldRef.current = onHold;
    onTapRef.current = onTap;
  });

  useEffect(() => {
    const hold = createLogoHold(() => onHoldRef.current());
    holdRef.current = hold;
    return () => {
      hold.end();
      holdRef.current = null;
    };
  }, []);

  const end = () => holdRef.current?.end();
  return {
    onPointerDown: () => holdRef.current?.begin(),
    onPointerUp: () => {
      if (holdRef.current?.release() === "tap") {
        onTapRef.current?.();
      }
    },
    onPointerLeave: end,
    onPointerCancel: end,
  };
}
