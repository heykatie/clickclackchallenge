import type { ReactNode } from "react";
import { useNeedsLandscapeGate } from "./useLandscapeGate";

type LandscapeGateProps = {
  children: ReactNode;
};

/** The local dev server skips the gate so Typing can be built and tested in any window. Every build keeps it. */
const GATE_ENABLED = !import.meta.env.DEV;

export function LandscapeGate({ children }: LandscapeGateProps) {
  const blocked = useNeedsLandscapeGate() && GATE_ENABLED;

  if (blocked) {
    return (
      <main className="screen landscape-gate">
        <div className="ready-copy">
          <h1>GIANT keyboard typing contest!</h1>
          <p className="display ready-prompt landscape-gate-prompt">Turn sideways and use the full screen.</p>
        </div>
      </main>
    );
  }

  return children;
}
