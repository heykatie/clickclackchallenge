import { useEffect, useRef } from "react";
import { createLogoHold } from "../state/logoHold";

/** Pointer handlers for the logo badge. The pending hold is cancelled when the screen closes. */
export function useLogoHold(onHold: () => void) {
  const onHoldRef = useRef(onHold);
  const holdRef = useRef<ReturnType<typeof createLogoHold> | null>(null);

  useEffect(() => {
    onHoldRef.current = onHold;
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
    onPointerUp: end,
    onPointerLeave: end,
    onPointerCancel: end,
  };
}
