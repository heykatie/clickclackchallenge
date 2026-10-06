import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isEnterKey, MAX_NAME_LENGTH, nameCharacterFromKey, nameProblem, nameToSaveOnEnter, normalizeName } from "../features/results/nameRules";
import {
  nameTimeoutMessage,
  nameTimerKey,
  nameTimerPhase,
  nameTimerSeconds,
} from "../features/results/nameTimeout";
import { isViewLeaderboardKey } from "../features/results/viewLeaderboardKey";
import { celebratesNewHighScore, resultCopy, type ResultStanding } from "../features/results/resultPlacement";
import { moveActionFocus } from "../state/actionFocus";
import { acceptsLeaveKey } from "../state/leaveKeyGrace";
import { Celebration } from "./Celebration";
import { useCountUp } from "./useCountUp";
import { useLogoHold } from "./useLogoHold";
import type { TestResult } from "../state/appState";

type ResultsScreenProps = {
  result: TestResult;
  standing: ResultStanding | null;
  saving: boolean;
  onSave: (name: string) => void;
  onViewLeaderboard: () => void;
  /** Saves like View Leaderboard, with the name when it is allowed, then opens Ready. */
  onSaveAndReady: (name: string | null) => void;
  onSetup: () => void;
  claimShortEscape: (handler: (() => void) | null) => void;
};

export function ResultsScreen({
  result,
  standing,
  saving,
  onSave,
  onViewLeaderboard,
  onSaveAndReady,
  onSetup,
  claimShortEscape,
}: ResultsScreenProps) {
  const [name, setName] = useState("");
  const shownWpm = useCountUp(result.displayedWpm);
  const [shownAt] = useState(() => performance.now());
  const screenRef = useRef<HTMLElement>(null);
  const [logoTaps, setLogoTaps] = useState(0);
  const logoHold = useLogoHold(onSetup, () => setLogoTaps((count) => count + 1));
  const left = useRef(false);
  const standingRef = useRef(standing);
  const onViewRef = useRef(onViewLeaderboard);
  const onSaveRef = useRef(onSave);
  const onSaveAndReadyRef = useRef(onSaveAndReady);
  const savingRef = useRef(saving);
  const nameRef = useRef<HTMLInputElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const viewButtonRef = useRef<HTMLButtonElement>(null);
  const nameStateRef = useRef("");
  const pendingName = useRef("");
  const problem = nameProblem(name);
  const savedName = normalizeName(name);
  const copy = standing ? resultCopy(standing, result.displayedWpm, result.accuracy) : null;
  const phase = nameTimerPhase(Boolean(standing?.showNameEntry), name, saving);
  const timerKey = nameTimerKey(phase, name);
  const [activeTimer, setActiveTimer] = useState(timerKey);
  const [secondsLeft, setSecondsLeft] = useState(() => nameTimerSeconds(phase));

  if (activeTimer !== timerKey) {
    setActiveTimer(timerKey);
    setSecondsLeft(nameTimerSeconds(phase));
  }

  const timeoutMessage = nameTimeoutMessage(phase, secondsLeft);

  // A short Escape does what a logo tap does: save, with the name when it is allowed, and open Ready.
  useEffect(() => {
    claimShortEscape(() => {
      if (savingRef.current || left.current || !acceptsLeaveKey(shownAt, performance.now())) {
        return;
      }
      left.current = true;
      onSaveAndReadyRef.current(normalizeName(nameStateRef.current));
    });
    return () => claimShortEscape(null);
  }, [claimShortEscape, shownAt]);

  useEffect(() => {
    onViewRef.current = onViewLeaderboard;
    onSaveRef.current = onSave;
    onSaveAndReadyRef.current = onSaveAndReady;
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
      const nameField = nameRef.current;
      const saveButton = saveButtonRef.current;
      const viewButton = viewButtonRef.current;
      const active = document.activeElement;

      // Arrow keys and Tab choose between the name field and the buttons. Inside the field, Left and Right move the text cursor.
      if (event.key.startsWith("Arrow") || event.key === "Tab") {
        if (active === nameField && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          return;
        }
        const targets = { name: nameField, save: saveButton && !saveButton.disabled ? saveButton : null, view: viewButton };
        const actions = (["name", "save", "view"] as const).filter((action) => targets[action] !== null);
        const current = actions.find((action) => targets[action] === active) ?? null;
        const next = moveActionFocus(actions, current, event.key, { shiftKey: event.shiftKey });
        if (next !== null) {
          event.preventDefault();
          targets[next]?.focus();
        }
        return;
      }

      // Enter or Space on a chosen button does what that button does.
      const chosen = active === viewButton ? "view" : active === saveButton ? "save" : null;
      if (chosen !== null && (isEnterKey(event) || event.key === " ")) {
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat || savingRef.current || left.current || !acceptsLeaveKey(shownAt, performance.now())) {
          return;
        }
        if (chosen === "view") {
          left.current = true;
          onViewRef.current();
          return;
        }
        const nameToSave = nameToSaveOnEnter(nameField?.value ?? "", nameStateRef.current, pendingName.current);
        if (nameToSave !== null) {
          left.current = true;
          onSaveRef.current(nameToSave);
        }
        return;
      }

      if (nameField && isEnterKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat || savingRef.current || left.current) {
          return;
        }
        if (!acceptsLeaveKey(shownAt, performance.now())) {
          return;
        }
        const nameToSave = nameToSaveOnEnter(nameField.value, nameStateRef.current, pendingName.current);
        if (nameToSave !== null) {
          left.current = true;
          onSaveRef.current(nameToSave);
        }
        return;
      }
      if (event.repeat || savingRef.current || left.current) {
        return;
      }
      const current = standingRef.current;
      if (!current || current.showNameEntry || !isViewLeaderboardKey(event)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (!acceptsLeaveKey(shownAt, performance.now())) {
        return;
      }
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
        buttonFocused: document.activeElement instanceof HTMLButtonElement,
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
    if (phase === "off") {
      return;
    }
    left.current = false;
    const id = window.setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "off" || secondsLeft !== 0 || left.current) {
      return;
    }
    left.current = true;
    if (phase === "started") {
      const nameToSave = normalizeName(nameStateRef.current);
      if (nameToSave !== null) {
        onSaveRef.current(nameToSave);
        return;
      }
    }
    onViewRef.current();
  }, [phase, secondsLeft]);

  // A logo tap saves the result, with the name when it is allowed, and opens Ready.
  useEffect(() => {
    if (logoTaps === 0 || savingRef.current || left.current) {
      return;
    }
    left.current = true;
    onSaveAndReadyRef.current(normalizeName(nameStateRef.current));
  }, [logoTaps]);

  function saveScore() {
    if (savedName === null) {
      return;
    }
    onSave(savedName);
  }

  return (
    <main className="screen results-screen" ref={screenRef} tabIndex={-1}>
      <button
        type="button"
        className="logo-badge"
        aria-label="Back to start"
        {...logoHold}
      />
      {standing && celebratesNewHighScore(standing, result.displayedWpm) ? <Celebration /> : null}
      {copy ? <h1>{copy.headline}</h1> : null}
      <p className="stat-value">
        <span className="visually-hidden">{result.displayedWpm} WPM</span>
        {/* The rolling number is decoration; screen readers get the final score above. */}
        <span aria-hidden="true">
          <span className="result-wpm-count">{shownWpm}</span> WPM
        </span>
      </p>
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
          />
          {problem === "blocked" ? <p className="name-hint">Pick a different name.</p> : null}
        </label>
      ) : null}
      {standing ? (
        <div className="results-actions">
          {standing.showNameEntry ? (
            <button type="button" ref={saveButtonRef} onClick={saveScore} disabled={saving || savedName === null}>
              SAVE SCORE
            </button>
          ) : null}
          <button type="button" ref={viewButtonRef} onClick={onViewLeaderboard} disabled={saving}>
            VIEW LEADERBOARD
          </button>
        </div>
      ) : null}
      {timeoutMessage ? <p className="result-name-countdown">{timeoutMessage}</p> : null}
    </main>
  );
}
