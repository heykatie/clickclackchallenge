import { useEffect, useRef, useState } from "react";
import { listAllScores } from "../db/persistence";
import { allTimeScores, type RankedScore } from "../features/leaderboard/ranking";
import type { HighScoreSummary } from "../state/appState";
import { Screensaver } from "./Screensaver";

const READY_IDLE_MS = 120_000;
const HOLD_SETUP_MS = 600;

type ReadyScreenProps = {
  highScore: HighScoreSummary | null;
  onStart: (key: string) => void;
  onSetup: () => void;
};

export function ReadyScreen({ highScore, onStart, onSetup }: ReadyScreenProps) {
  const screenRef = useRef<HTMLElement>(null);
  const holdTimer = useRef<number | null>(null);
  const escapeHold = useRef<number | null>(null);
  const asleepRef = useRef(false);
  const onStartRef = useRef(onStart);
  const onSetupRef = useRef(onSetup);
  const [asleep, setAsleep] = useState(false);
  const [activity, setActivity] = useState(0);
  const [allTime, setAllTime] = useState<RankedScore[]>([]);

  useEffect(() => {
    onStartRef.current = onStart;
    onSetupRef.current = onSetup;
  });

  useEffect(() => {
    let cancelled = false;
    listAllScores().then(
      (scores) => {
        if (!cancelled) {
          setAllTime(allTimeScores(scores));
        }
      },
      () => {
        if (!cancelled) {
          setAllTime([]);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (asleep || allTime.length === 0) {
      return;
    }
    const id = window.setTimeout(() => {
      asleepRef.current = true;
      setAsleep(true);
    }, READY_IDLE_MS);
    return () => window.clearTimeout(id);
  }, [asleep, activity, allTime.length]);

  function clearEscapeHold() {
    if (escapeHold.current !== null) {
      window.clearTimeout(escapeHold.current);
      escapeHold.current = null;
    }
  }

  useEffect(() => {
    screenRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      const onRoll = event.target instanceof Element && event.target.closest(".screensaver") !== null;
      if (asleepRef.current || onRoll) {
        clearEscapeHold();
        if (!event.repeat) {
          asleepRef.current = false;
          setAsleep(false);
        }
        return;
      }
      if (event.key === "Escape") {
        if (!event.repeat && escapeHold.current === null) {
          escapeHold.current = window.setTimeout(() => {
            escapeHold.current = null;
            onSetupRef.current();
          }, HOLD_SETUP_MS);
        }
        return;
      }
      if (event.repeat) {
        return;
      }
      onStartRef.current(event.key);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearEscapeHold();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      clearEscapeHold();
    };
  }, []);

  function noteActivity() {
    setActivity((current) => current + 1);
  }

  function beginHold() {
    noteActivity();
    holdTimer.current = window.setTimeout(onSetup, HOLD_SETUP_MS);
  }

  function endHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  if (asleep) {
    return (
      <Screensaver
        scores={allTime}
        onWake={() => {
          asleepRef.current = false;
          setAsleep(false);
        }}
      />
    );
  }

  return (
    <main className="screen ready-screen" ref={screenRef} tabIndex={-1} onPointerDown={noteActivity}>
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
              <p className={highScore.name ? "high-score-name has-name" : "high-score-name"}>
                {highScore.name ?? "—"}
              </p>
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
