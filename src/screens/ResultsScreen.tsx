import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MAX_NAME_LENGTH, nameCharacterFromKey, nameProblem, normalizeName } from "../features/results/nameRules";
import { resultCopy, type ResultStanding } from "../features/results/resultPlacement";
import type { TestResult } from "../state/appState";

const NAME_IDLE_SECONDS = 15;
const NAME_COUNTDOWN_AT = 5;

type ResultsScreenProps = {
  result: TestResult;
  standing: ResultStanding | null;
  saving: boolean;
  onSave: (name: string) => void;
  onViewLeaderboard: () => void;
  onSetup: () => void;
};

export function ResultsScreen({
  result,
  standing,
  saving,
  onSave,
  onViewLeaderboard,
  onSetup,
}: ResultsScreenProps) {
  const [name, setName] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(NAME_IDLE_SECONDS);
  const holdTimer = useRef<number | null>(null);
  const left = useRef(false);
  const onViewRef = useRef(onViewLeaderboard);
  const nameRef = useRef<HTMLInputElement>(null);
  const pendingName = useRef("");
  const problem = nameProblem(name);
  const savedName = normalizeName(name);
  const copy = standing ? resultCopy(standing, result.displayedWpm) : null;
  const waitingForName = Boolean(standing?.showNameEntry) && savedName === null && !saving;
  const [idlePhase, setIdlePhase] = useState(waitingForName);

  if (idlePhase !== waitingForName) {
    setIdlePhase(waitingForName);
    setSecondsLeft(NAME_IDLE_SECONDS);
  }

  useEffect(() => {
    onViewRef.current = onViewLeaderboard;
  });

  useLayoutEffect(() => {
    if (!standing?.showNameEntry) {
      if (standing) {
        pendingName.current = "";
      }
      return;
    }
    if (pendingName.current) {
      const extra = pendingName.current;
      pendingName.current = "";
      setName((current) => (current + extra).slice(0, MAX_NAME_LENGTH));
    }
    nameRef.current?.focus();
  }, [standing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const field = nameRef.current;
      const character = nameCharacterFromKey(event, {
        fieldFocused: field !== null && document.activeElement === field,
        buttonFocused: event.target instanceof HTMLButtonElement,
      });
      if (character === null || (standing !== null && !standing.showNameEntry)) {
        return;
      }
      event.preventDefault();
      if (!standing?.showNameEntry || field === null) {
        pendingName.current = (pendingName.current + character).slice(0, MAX_NAME_LENGTH);
        return;
      }
      setName((current) => (current + character).slice(0, MAX_NAME_LENGTH));
      field.focus();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [standing]);

  useEffect(() => {
    if (!waitingForName) {
      return;
    }
    left.current = false;
    const id = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [waitingForName]);

  useEffect(() => {
    if (!waitingForName || secondsLeft !== 0 || left.current) {
      return;
    }
    left.current = true;
    onViewRef.current();
  }, [waitingForName, secondsLeft]);

  function saveScore() {
    if (savedName === null) {
      return;
    }
    onSave(savedName);
  }

  function beginHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
    }
    holdTimer.current = window.setTimeout(onSetup, 600);
  }

  function endHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  return (
    <main className="screen results-screen">
      <button
        type="button"
        className="logo-badge"
        aria-label="Logo"
        onPointerDown={beginHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
      />
      {copy ? <h1>{copy.headline}</h1> : null}
      <p className="stat-value">{result.displayedWpm} WPM</p>
      <p>
        {result.displayedAccuracy === null ? "—%" : `${result.displayedAccuracy}%`} ACCURACY
      </p>
      {copy?.plinkoLine ? <p className="result-pill result-plinko">{copy.plinkoLine}</p> : null}
      {copy?.placedLine ? <p className="result-pill result-place">{copy.placedLine}</p> : null}
      {standing?.showNameEntry ? (
        <label className="name-field">
          Name
          <input
            ref={nameRef}
            value={name}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
            aria-invalid={problem === "blocked"}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveScore();
              }
            }}
          />
          {problem === "blocked" ? <p className="name-hint">Pick a different name.</p> : null}
        </label>
      ) : null}
      {standing ? (
        <div className="results-actions">
          {standing.showNameEntry ? (
            <button type="button" onClick={saveScore} disabled={saving || savedName === null}>
              SAVE SCORE
            </button>
          ) : null}
          <button type="button" onClick={onViewLeaderboard} disabled={saving}>
            VIEW LEADERBOARD
          </button>
        </div>
      ) : null}
      {waitingForName && secondsLeft <= NAME_COUNTDOWN_AT && secondsLeft > 0 ? (
        <p className="result-name-countdown">Opening the leaderboard in {secondsLeft}s</p>
      ) : null}
    </main>
  );
}
