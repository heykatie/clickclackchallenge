import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isEnterKey, MAX_NAME_LENGTH, nameCharacterFromKey, nameProblem, nameToSaveOnEnter, normalizeName } from "../features/results/nameRules";
import { isViewLeaderboardKey } from "../features/results/viewLeaderboardKey";
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
  const screenRef = useRef<HTMLElement>(null);
  const holdTimer = useRef<number | null>(null);
  const left = useRef(false);
  const standingRef = useRef(standing);
  const onViewRef = useRef(onViewLeaderboard);
  const onSaveRef = useRef(onSave);
  const savingRef = useRef(saving);
  const nameRef = useRef<HTMLInputElement>(null);
  const nameStateRef = useRef("");
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
    onSaveRef.current = onSave;
    savingRef.current = saving;
    standingRef.current = standing;
    nameStateRef.current = name;
    const field = nameRef.current;
    if (field && document.activeElement !== field && !(document.activeElement instanceof HTMLButtonElement)) {
      field.focus();
    } else if (standing && !standing.showNameEntry) {
      screenRef.current?.focus();
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || savingRef.current || left.current) {
        return;
      }
      const nameField = nameRef.current;
      if (nameField && isEnterKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        const nameToSave = nameToSaveOnEnter(nameField.value, nameStateRef.current, pendingName.current);
        if (nameToSave !== null) {
          left.current = true;
          onSaveRef.current(nameToSave);
        }
        return;
      }
      const current = standingRef.current;
      if (!current || current.showNameEntry || !isViewLeaderboardKey(event)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      left.current = true;
      onViewRef.current();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
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
      if (isEnterKey(event)) {
        return;
      }
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
      setName((current) => {
        const next = (current + character).slice(0, MAX_NAME_LENGTH);
        nameStateRef.current = next;
        return next;
      });
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
    <main className="screen results-screen" ref={screenRef} tabIndex={-1}>
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
            onChange={(event) => {
              nameStateRef.current = event.target.value;
              setName(event.target.value);
            }}
            aria-invalid={problem === "blocked"}
            onKeyDown={(event) => {
              if (!isEnterKey(event)) {
                return;
              }
              event.preventDefault();
              const nameToSave = nameToSaveOnEnter(event.currentTarget.value, name, pendingName.current);
              if (nameToSave !== null) {
                onSave(nameToSave);
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
