import { useEffect, useRef, useState } from "react";
import type { ScoreRecord } from "../db/persistence";
import { isLeaderboardLeaveKey } from "../features/leaderboard/leaveKeys";
import { rankScores } from "../features/leaderboard/ranking";

const RESET_SECONDS = 15;
const RESET_COUNTDOWN_AT = 5;

type LeaderboardScreenProps = {
  scores: readonly ScoreRecord[];
  currentScoreId: string | null;
  onNextPlayer: () => void;
  onSetup: () => void;
};

export function LeaderboardScreen({
  scores,
  currentScoreId,
  onNextPlayer,
  onSetup,
}: LeaderboardScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESET_SECONDS);
  const screenRef = useRef<HTMLElement>(null);
  const holdTimer = useRef<number | null>(null);
  const left = useRef(false);
  const onNextPlayerRef = useRef(onNextPlayer);
  const rows = rankScores(scores).filter((entry) => entry.isTop5);

  useEffect(() => {
    onNextPlayerRef.current = onNextPlayer;
  });

  function leave() {
    if (left.current) {
      return;
    }
    left.current = true;
    onNextPlayerRef.current();
  }

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) {
      leave();
    }
  }, [secondsLeft]);

  useEffect(() => {
    screenRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !isLeaderboardLeaveKey(event)) {
        return;
      }
      event.preventDefault();
      leave();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function beginHold() {
    holdTimer.current = window.setTimeout(() => {
      left.current = true;
      onSetup();
    }, 600);
  }

  function endHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  return (
    <main className="screen leaderboard-screen" ref={screenRef} tabIndex={-1}>
      <button
        type="button"
        className="logo-badge"
        aria-label="Logo"
        onPointerDown={beginHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
      />
      <p className="leaderboard-kicker">TOP 5</p>
      <h1>Leaderboard</h1>
      {rows.length === 0 ? <p>No scores yet</p> : null}
      <ol className="leaderboard-rows">
        {rows.map((entry) => {
          const isCurrent = entry.score.id === currentScoreId;
          return (
            <li
              key={entry.score.id}
              className={[
                "leaderboard-row",
                entry.rank === 1 ? "is-first" : "",
                isCurrent ? "is-current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="leaderboard-rank">{entry.rank}</span>
              <span className="leaderboard-name">{entry.score.name ?? "—"}</span>
              {isCurrent ? <span className="you-pill">YOU</span> : null}
              <span className="leaderboard-wpm">{entry.score.displayedWpm} WPM</span>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={leave}>
        NEXT PLAYER
      </button>
      {secondsLeft <= RESET_COUNTDOWN_AT && secondsLeft > 0 ? (
        <p className="leaderboard-countdown">Returning to ready screen in {secondsLeft}s</p>
      ) : null}
    </main>
  );
}
