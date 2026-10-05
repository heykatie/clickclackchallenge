import { useEffect, useRef, useState } from "react";
import type { ScoreRecord } from "../db/persistence";
import { isLeaderboardLeaveKey } from "../features/leaderboard/leaveKeys";
import { boardEntries, rankScores, topFiveSlots } from "../features/leaderboard/ranking";
import { moveActionFocus } from "../state/actionFocus";
import { acceptsLeaveKey } from "../state/leaveKeyGrace";
import { ScoreRow } from "./ScoreRow";
import { useLogoHold } from "./useLogoHold";

const RESET_SECONDS = 15;
const RESET_COUNTDOWN_AT = 5;

type LeaderboardScreenProps = {
  scores: readonly ScoreRecord[];
  currentScoreId: string | null;
  onNextPlayer: () => void;
  onSetup: () => void;
  claimShortEscape: (handler: (() => void) | null) => void;
};

export function LeaderboardScreen({
  scores,
  currentScoreId,
  onNextPlayer,
  onSetup,
  claimShortEscape,
}: LeaderboardScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESET_SECONDS);
  const [shownAt] = useState(() => performance.now());
  const screenRef = useRef<HTMLElement>(null);
  const left = useRef(false);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const onNextPlayerRef = useRef(onNextPlayer);
  const slots = topFiveSlots(boardEntries(rankScores(scores)));
  const logoHold = useLogoHold(() => {
    left.current = true;
    onSetup();
  }, leave);

  useEffect(() => {
    onNextPlayerRef.current = onNextPlayer;
  });

  useEffect(() => {
    claimShortEscape(() => {
      if (left.current || !acceptsLeaveKey(shownAt, performance.now())) {
        return;
      }
      left.current = true;
      onNextPlayerRef.current();
    });
    return () => claimShortEscape(null);
  }, [claimShortEscape, shownAt]);

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
      const nextButton = nextButtonRef.current;
      const current = document.activeElement === nextButton ? "next" : null;
      if (nextButton && moveActionFocus(["next"], current, event.key) !== null) {
        event.preventDefault();
        nextButton.focus();
        return;
      }
      if (event.repeat || !isLeaderboardLeaveKey(event)) {
        return;
      }
      event.preventDefault();
      if (!acceptsLeaveKey(shownAt, performance.now())) {
        return;
      }
      leave();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [shownAt]);

  return (
    <main className="screen leaderboard-screen edge-motifs" ref={screenRef} tabIndex={-1}>
      <button
        type="button"
        className="logo-badge"
        aria-label="Back to start"
        {...logoHold}
      />
      <p className="score-kicker">TOP 5</p>
      <h1>Leaderboard</h1>
      <ol className="score-card score-rows leaderboard-rows">
        {slots.map((slot) => (
          <ScoreRow
            key={slot.entry?.score.id ?? `empty-${slot.rank}`}
            rank={slot.rank}
            name={slot.entry?.score.name ?? null}
            displayedWpm={slot.entry?.score.displayedWpm ?? null}
            isCurrent={slot.entry !== null && slot.entry.score.id === currentScoreId}
          />
        ))}
      </ol>
      <button type="button" ref={nextButtonRef} className="next-player-button" onClick={leave}>
        NEXT PLAYER <span aria-hidden="true">→</span>
      </button>
      {secondsLeft <= RESET_COUNTDOWN_AT && secondsLeft > 0 ? (
        <p className="leaderboard-countdown">Returning to ready screen in {secondsLeft}s</p>
      ) : null}
    </main>
  );
}
