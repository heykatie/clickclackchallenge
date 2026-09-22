import { useEffect, useRef } from "react";
import type { HighScoreSummary } from "../state/appState";

type ReadyScreenProps = {
  highScore: HighScoreSummary | null;
  onStart: () => void;
  onSetup: () => void;
};

export function ReadyScreen({ highScore, onStart, onSetup }: ReadyScreenProps) {
  const screenRef = useRef<HTMLElement>(null);
  const holdTimer = useRef<number | null>(null);

  useEffect(() => {
    screenRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      onStart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onStart]);

  function beginHold() {
    holdTimer.current = window.setTimeout(onSetup, 600);
  }

  function endHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  return (
    <main className="screen ready-screen" ref={screenRef} tabIndex={-1}>
      <button
        type="button"
        className="logo-badge"
        aria-label="Logo"
        onPointerDown={beginHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
      />
      <div className="ready-copy">
        <h1>GIANT keyboard typing contest!</h1>
        <p className="ready-plinko">Type above 50 WPM for a Plinko drop.</p>
        <section className="high-score-card" aria-label="Current high score">
          <p className="stat-label">CURRENT HIGH SCORE</p>
          {highScore ? (
            <>
              <p className="stat-value">{highScore.displayedWpm} WPM</p>
              <p className="high-score-name">{highScore.name ?? "—"}</p>
            </>
          ) : (
            <p className="high-score-empty">Be the first high score!</p>
          )}
        </section>
        <p className="display ready-prompt">PRESS ANY KEY TO START</p>
        <p className="ready-helper">Your timer starts when you begin typing.</p>
      </div>
    </main>
  );
}
