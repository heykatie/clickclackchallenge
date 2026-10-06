import { useEffect, useRef, useState } from "react";
import { listScores } from "../db/persistence";
import { rollingListScores, type RankedScore } from "../features/leaderboard/ranking";
import type { HighScoreSummary } from "../state/appState";
import { readyKeyDown, readyLogoTap, readyPointerUp } from "./readyKeys";
import { Screensaver } from "./Screensaver";
import { useLogoHold } from "./useLogoHold";

const READY_IDLE_MS = 120_000;

type ReadyScreenProps = {
  /** The active event. The rolling list shows its board. */
  eventId: string | null;
  highScore: HighScoreSummary | null;
  onStart: (key: string) => void;
  onSetup: () => void;
  claimShortEscape: (handler: (() => void) | null) => void;
};

export function ReadyScreen({ eventId, highScore, onStart, onSetup, claimShortEscape }: ReadyScreenProps) {
  const screenRef = useRef<HTMLElement>(null);
  const asleepRef = useRef(false);
  const onStartRef = useRef(onStart);
  const [asleep, setAsleep] = useState(false);
  const [activity, setActivity] = useState(0);
  const [rolling, setRolling] = useState<RankedScore[]>([]);

  const logoHold = useLogoHold(onSetup, () => {
    if (readyLogoTap(rolling.length) === "roll") {
      asleepRef.current = true;
      setAsleep(true);
    }
  });

  useEffect(() => {
    onStartRef.current = onStart;
  });

  useEffect(() => {
    let cancelled = false;
    // The rolling list follows the active event's board, whether it was started fresh or continued.
    (eventId === null ? Promise.resolve([]) : listScores(eventId)).then(
      (scores) => {
        if (!cancelled) {
          setRolling(rollingListScores(scores));
        }
      },
      () => {
        if (!cancelled) {
          setRolling([]);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    if (asleep || rolling.length === 0) {
      return;
    }
    const id = window.setTimeout(() => {
      asleepRef.current = true;
      setAsleep(true);
    }, READY_IDLE_MS);
    return () => window.clearTimeout(id);
  }, [asleep, activity, rolling.length]);

  // A short Escape does what a logo tap does: open the rolling list, or close it when it is up.
  useEffect(() => {
    claimShortEscape(() => {
      if (asleepRef.current) {
        asleepRef.current = false;
        setAsleep(false);
        return;
      }
      if (readyLogoTap(rolling.length) === "roll") {
        asleepRef.current = true;
        setAsleep(true);
      }
    });
    return () => claimShortEscape(null);
  }, [claimShortEscape, rolling.length]);

  useEffect(() => {
    screenRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      const rolling =
        asleepRef.current ||
        (event.target instanceof Element && event.target.closest(".screensaver") !== null);
      const action = readyKeyDown(event.key, rolling);
      if (action === "wake") {
        event.preventDefault();
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

  function startFromPointer(event: React.PointerEvent<HTMLElement>) {
    const onLogo = event.target instanceof Element && event.target.closest(".logo-badge") !== null;
    if (readyPointerUp({ button: event.button, onLogo }) === "start") {
      onStartRef.current("");
    }
  }

  if (asleep) {
    return (
      <Screensaver
        scores={rolling}
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
          aria-label="Show high scores"
          {...logoHold}
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
              <p className="high-score-empty">Be the first high score today!</p>
            )}
          </section>
          <p className="display ready-prompt">PRESS ANY KEY TO START</p>
          <p className="ready-helper">Your timer starts when you begin typing.</p>
        </div>
      </main>
  );
}
