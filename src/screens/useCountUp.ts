import { useEffect, useState } from "react";
import { COUNT_UP_MS, countUpValue } from "../features/results/countUp";

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

/** Rolls a number up to `target` on animation frames. Reduced motion shows `target` at once. */
export function useCountUp(target: number, durationMs = COUNT_UP_MS): number {
  const [reduced] = useState(prefersReducedMotion);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reduced) {
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function tick() {
      const next = countUpValue(target, performance.now() - start, durationMs);
      setValue(next);
      if (next < target) {
        frame = requestAnimationFrame(tick);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduced]);

  return reduced ? target : value;
}
