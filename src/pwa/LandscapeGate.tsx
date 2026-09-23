import { useEffect, useState, type ReactNode } from "react";
import { needsLandscapeGate } from "./boothViewport";

type LandscapeGateProps = {
  children: ReactNode;
};

function readGate(): boolean {
  return needsLandscapeGate(window.innerWidth, window.innerHeight, window.screen.availWidth);
}

export function LandscapeGate({ children }: LandscapeGateProps) {
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

  if (blocked) {
    return (
      <main className="screen landscape-gate">
        <div className="ready-copy">
          <h1>GIANT keyboard typing contest!</h1>
          <p className="ready-plinko">Type above 50 WPM for a Plinko drop.</p>
          <p className="display ready-prompt landscape-gate-prompt">Turn sideways and use the full screen.</p>
        </div>
      </main>
    );
  }

  return children;
}
