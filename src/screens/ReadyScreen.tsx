import { useEffect, useRef, useState } from "react";
import { listAllScores } from "../db/persistence";
import { allTimeScores, type RankedScore } from "../features/leaderboard/ranking";
import type { HighScoreSummary } from "../state/appState";
import { HOLD_SETUP_MS } from "../state/escapeHold";
import { readyKeyDown } from "./readyKeys";
import { Screensaver } from "./Screensaver";

const READY_IDLE_MS = 120_000;

type ReadyScreenProps = {
  highScore: HighScoreSummary | null;
  onStart: (key: string) => void;
  onSetup: () => void;
  claimShortEscape: (handler: (() => void) | null) => void;
};

export function ReadyScreen({ highScore, onStart, onSetup, claimShortEscape }: ReadyScreenProps) {
  const screenRef = useRef<HTMLElement>(null);
  const holdTimer = useRef<number | null>(null);
  const heldSetup = useRef(false);
  const asleepRef = useRef(false);
  const onStartRef = useRef(onStart);
  const [asleep, setAsleep] = useState(false);
  const [activity, setActivity] = useState(0);
  const [allTime, setAllTime] = useState<RankedScore[]>([]);

  useEffect(() => {
    onStartRef.current = onStart;
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

  useEffect(() => {
    claimShortEscape(() => {
      if (!asleepRef.current) {
        return;
      }
      asleepRef.current = false;
      setAsleep(false);
    });
    return () => claimShortEscape(null);
  }, [claimShortEscape]);

  useEffect(() => {
    screenRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      const rolling =
        asleepRef.current ||
        (event.target instanceof Element && event.target.closest(".screensaver") !== null);
      const action = readyKeyDown(event.key, rolling);
      if (action === "wake") {
        if (event.key !== "Escape") {
          event.preventDefault();
        }
        if (!event.repeat) {
          asleepRef.current = false;
          setAsleep(false);
        }
        return;
      }
      if (action === "ignore" || event.repeat) {
        return;
      }
      event.preventDefault();
      onStartRef.current(event.key);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  function noteActivity() {
    setActivity((current) => current + 1);
  }

  function beginHold() {
    noteActivity();
    heldSetup.current = false;
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      heldSetup.current = true;
      onSetup();
    }, HOLD_SETUP_MS);
  }

  function startFromPointer(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }
    if (heldSetup.current) {
      heldSetup.current = false;
      return;
    }
    onStartRef.current("");
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
      <main
        className="screen ready-screen"
        ref={screenRef}
        tabIndex={-1}
        onPointerDown={noteActivity}
        onPointerUp={startFromPointer}
      >
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
