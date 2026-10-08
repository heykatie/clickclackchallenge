import { useEffect, useState } from "react";
import { needsLandscapeGate } from "./boothViewport";

function readGate(): boolean {
  return needsLandscapeGate(window.innerWidth, window.innerHeight);
}

export function useNeedsLandscapeGate(): boolean {
  const [blocked, setBlocked] = useState(readGate);

  useEffect(() => {
    const update = () => setBlocked(readGate());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return blocked;
}
