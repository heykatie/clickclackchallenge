import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { isEnterKey, MAX_NAME_LENGTH, nameCharacterFromKey, nameProblem, nameToSaveOnEnter, normalizeName } from "../features/results/nameRules";
import {
  nameTimeoutMessage,
  nameTimerKey,
  nameTimerPhase,
  nameTimerSeconds,
} from "../features/results/nameTimeout";
import { isViewLeaderboardKey } from "../features/results/viewLeaderboardKey";
import { celebratesNewHighScore, resultCopy, type ResultKind, type ResultStanding } from "../features/results/resultPlacement";
import { moveActionFocus } from "../state/actionFocus";
import { acceptsLeaveKey } from "../state/leaveKeyGrace";
import { Celebration } from "./Celebration";
import { ButtonCountdown } from "./ButtonCountdown";
import { useCountUp } from "./useCountUp";
import { COUNT_UP_DELAY_MS, countUpMs } from "../features/results/countUp";
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
  // True once the contestant types a name on this screen. Then Enter means "save", even in the first second;
  // letters left over from the round do not count, so a stray Enter still cannot skip the screen.
  const typedName = useRef(false);
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
        if (!typedName.current && !acceptsLeaveKey(shownAt, performance.now())) {
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
      typedName.current = true;
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
    <main
      className="screen results-screen"
      ref={screenRef}
      tabIndex={-1}
      // The pills pop in once this score's count-up settles.
      style={{ "--count-up-end": `${COUNT_UP_DELAY_MS + countUpMs(result.displayedWpm)}ms` } as CSSProperties}
    >
      <button
        type="button"
        className="logo-badge"
        aria-label="Back to start"
        {...logoHold}
      />
      {standing && celebratesNewHighScore(standing, result.displayedWpm) ? <Celebration /> : null}
      {copy ? (
        <h1
          className={
            standing && celebratesNewHighScore(standing, result.displayedWpm) ? "is-new-high-score" : undefined
          }
        >
          <LetterHeadline text={copy.headline} letterClass={HEADLINE_LETTER_CLASS[copy.kind]} />
        </h1>
      ) : null}
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
              typedName.current = true;
              nameStateRef.current = event.target.value;
              setName(event.target.value);
            }}
            aria-invalid={problem === "blocked"}
          />
          {/* The hint's line is always there, empty until needed, so the buttons below never move. */}
          <p className="name-hint" aria-live="polite">
            {problem === "blocked" ? "Pick a different name." : ""}
          </p>
        </label>
      ) : null}
      {standing ? (
        <div className="results-actions">
          {standing.showNameEntry ? (
            <button type="button" ref={saveButtonRef} onClick={saveScore} disabled={saving || savedName === null}>
              SAVE SCORE
              {phase === "started" ? <ButtonCountdown key={timerKey} seconds={nameTimerSeconds(phase)} /> : null}
            </button>
          ) : null}
          <button type="button" ref={viewButtonRef} onClick={onViewLeaderboard} disabled={saving}>
            VIEW LEADERBOARD
            {phase === "blank" ? <ButtonCountdown key={timerKey} seconds={nameTimerSeconds(phase)} /> : null}
          </button>
        </div>
      ) : null}
      {/* Kept while Results has a timer, empty until the last seconds, so the screen never moves when it appears. */}
      {phase !== "off" ? <p className="result-name-countdown">{timeoutMessage ?? ""}</p> : null}
    </main>
  );
}

/** How each kind of result moves its headline letters: typed in, waving hello, floating like a ghost, or stamped in. */
const HEADLINE_LETTER_CLASS: Record<ResultKind, string> = {
  nice: "typed-letter",
  thanks: "wave-letter",
  casper: "ghost-letter",
  "new-high-score": "stamp-letter",
};

/** How often the headline replays its letter animation while Results stays up. */
const HEADLINE_REPLAY_MS = 8_000;

/**
 * Splits the headline into letters the CSS animates in turn: typed in, or waving hello. Every 8 seconds the
 * letters are redrawn, which replays their animation from the start.
 */
function LetterHeadline({ text, letterClass }: { text: string; letterClass: string }) {
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setReplay((count) => count + 1), HEADLINE_REPLAY_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span key={replay} aria-hidden="true">
        {headlineWords(text).map(({ word, start }) => {
          const letters = [...word].map((letter, offset) => (
            <span
              key={start + offset}
              className={letterClass}
              style={{ "--letter-index": start + offset } as CSSProperties}
            >
              {letter}
            </span>
          ));
          // Each letter is its own box, so a word is held together or the line could break inside it.
          return word === " " ? letters : (
            <span key={`word-${start}`} className="headline-word">
              {letters}
            </span>
          );
        })}
      </span>
    </>
  );
}

/** Splits a headline into words and the single spaces between them, keeping each piece's letter position. */
function headlineWords(text: string): { word: string; start: number }[] {
  const pieces: { word: string; start: number }[] = [];
  let start = 0;
  for (const word of text.split(/( )/)) {
    if (word) {
      pieces.push({ word, start });
    }
    start += [...word].length;
  }
  return pieces;
}
