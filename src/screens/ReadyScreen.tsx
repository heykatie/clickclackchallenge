import { useEffect, useRef, useState } from "react";
import { listAllScores, listScores, type ScoreRecord } from "../db/persistence";
import { allTimeBestLine, highScore as bestOf, rollingListScores, type RankedScore } from "../features/leaderboard/ranking";
import type { HighScoreSummary } from "../state/appState";
import { readyKeyDown, readyLogoTap, readyPointerUp } from "./readyKeys";
import { Screensaver } from "./Screensaver";
import { KeycapHop } from "./KeycapHop";
import { useLogoHold } from "./useLogoHold";
import { Crown } from "./ScoreRow";

const READY_IDLE_MS = 120_000;

type ReadyScreenProps = {
  /** The active event. The rolling list shows its board. */
  eventId: string | null;
  /** The event's board ranks every event's scores. */
  allTime: boolean;
  highScore: HighScoreSummary | null;
  onStart: (key: string) => void;
  onSetup: () => void;
  /** Told whenever the rolling high-score list opens or closes, so the music can follow it. */
  onRollingChange?: (rolling: boolean) => void;
  /** Told whenever Keycap Hop opens or closes, so it can play its own tune. */
  onHoppingChange?: (hopping: boolean) => void;
  claimShortEscape: (handler: (() => void) | null) => void;
};

export function ReadyScreen({
  eventId,
  allTime,
  highScore,
  onStart,
  onSetup,
  onRollingChange,
  onHoppingChange,
  claimShortEscape,
}: ReadyScreenProps) {
  const screenRef = useRef<HTMLElement>(null);
  const asleepRef = useRef(false);
  const onStartRef = useRef(onStart);
  const [asleep, setAsleep] = useState(false);
  const [activity, setActivity] = useState(0);

  useEffect(() => {
    onRollingChange?.(asleep);
  }, [asleep, onRollingChange]);
  const [rolling, setRolling] = useState<RankedScore[]>([]);
  const [allTimeBest, setAllTimeBest] = useState<ScoreRecord | null>(null);
  const bestLine = allTimeBestLine(allTimeBest, rolling[0]?.score ?? null);

  // With no score to roll, the logo (or a short Escape) opens Keycap Hop, the booth's secret runner, instead.
  const [hopping, setHopping] = useState(false);
  const hoppingRef = useRef(false);
  function setHop(open: boolean) {
    hoppingRef.current = open;
    setHopping(open);
  }
  useEffect(() => {
    onHoppingChange?.(hopping);
    return () => onHoppingChange?.(false);
  }, [hopping, onHoppingChange]);
  const logoHold = useLogoHold(onSetup, () => {
    if (readyLogoTap(rolling.length) === "roll") {
      asleepRef.current = true;
      setAsleep(true);
    } else {
      setHop(true);
    }
  });

  useEffect(() => {
    onStartRef.current = onStart;
  });

  useEffect(() => {
    let cancelled = false;
    // The rolling list follows the active event's board: its own scores, or every event's when all-time.
    (allTime ? listAllScores() : eventId === null ? Promise.resolve([]) : listScores(eventId)).then(
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
    listAllScores().then(
      (scores) => {
        if (!cancelled) {
          setAllTimeBest(bestOf(scores));
        }
      },
      () => {
        if (!cancelled) {
          setAllTimeBest(null);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [eventId, allTime]);

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

  // A short Escape does what a logo tap does: open the rolling list or Keycap Hop, or close whichever is up.
  useEffect(() => {
    claimShortEscape(() => {
      if (hoppingRef.current) {
        setHop(false);
        return;
      }
      if (asleepRef.current) {
        asleepRef.current = false;
        setAsleep(false);
        return;
      }
      if (readyLogoTap(rolling.length) === "roll") {
        asleepRef.current = true;
        setAsleep(true);
      } else {
        setHop(true);
      }
    });
    return () => claimShortEscape(null);
  }, [claimShortEscape, rolling.length]);

  useEffect(() => {
    screenRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      // Keycap Hop takes the keys while it is open, so a hop never starts a typing round.
      if (hoppingRef.current) {
        return;
      }
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

  if (hopping) {
    return <KeycapHop onClose={() => setHop(false)} onSetup={onSetup} />;
  }

  if (asleep) {
    return (
      <Screensaver
        title={allTime ? "ALL-TIME HIGH SCORES" : "HIGH SCORES"}
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
            <p className="stat-label">{allTime ? "ALL-TIME HIGH SCORE" : "CURRENT HIGH SCORE"}</p>
            {highScore ? (
              <>
                <p className="stat-value">{highScore.displayedWpm} WPM</p>
                <p className={highScore.name ? "high-score-name has-name" : "high-score-name"}>
                  <span className="high-score-crown" aria-hidden="true">
                    <Crown />
                  </span>
                  {highScore.name ?? "—"}
                </p>
              </>
            ) : (
              <p className="high-score-empty">Be the first high score today!</p>
            )}
            {bestLine ? <p className="all-time-best">{bestLine}</p> : null}
          </section>
          <p className="display ready-prompt">PRESS ANY KEY TO START</p>
          <p className="ready-helper">Your timer starts when you begin typing.</p>
        </div>
      </main>
  );
}
