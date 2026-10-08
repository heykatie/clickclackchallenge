import type { ReactNode } from "react";
import { useLogoHold } from "../screens/useLogoHold";
import { useNeedsLandscapeGate } from "./useLandscapeGate";

type LandscapeGateProps = {
  children: ReactNode;
  /** The covered screen's logo badge, kept on the gate so staff can still leave: a tap runs onTap, a long-press onHold. */
  logo?: LogoActions;
  enabled?: boolean;
};

export type LogoActions = { onTap: () => void; onHold: () => void };

const noop = () => {};

/** The local dev server skips the gate so Typing can be built and tested in any window. Every build keeps it. */
const GATE_ENABLED = !import.meta.env.DEV;

export function LandscapeGate({ children, logo, enabled = GATE_ENABLED }: LandscapeGateProps) {
  const blocked = useNeedsLandscapeGate() && enabled;
  const logoHold = useLogoHold(logo?.onHold ?? noop, logo?.onTap);

  if (blocked) {
    return (
      <main className="screen landscape-gate">
        {logo ? <button type="button" className="logo-badge" aria-label="Back to start" {...logoHold} /> : null}
        <div className="ready-copy">
          <h1>GIANT keyboard typing contest!</h1>
          <p className="display ready-prompt landscape-gate-prompt">Turn sideways to continue.</p>
        </div>
      </main>
    );
  }

  return children;
}
