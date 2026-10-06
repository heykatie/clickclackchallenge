import { useEffect, useRef, useState } from "react";
import type { BoardScope, TestDuration, TestMode } from "../db/persistence";
import { applySetupKey, type SetupChoice, type SetupSelection } from "../state/setupKeyboard";
import {
  applyFreshConfirmKey,
  needsFreshConfirm,
  planEventStart,
  type FreshConfirmChoice,
  type SetupMode,
} from "../state/setupRules";

type EventSetupScreenProps = {
  storedDuration: TestDuration | null;
  storedTestMode: TestMode | null;
  storedBoardScope: BoardScope | null;
  saving: boolean;
  /** A new version is installed and waiting. */
  updateReady: boolean;
  /** Activates the waiting version and reloads the app. */
  onApplyUpdate: () => void;
  onStartFresh: (durationSeconds: TestDuration, testMode: TestMode) => void;
  onContinue: (durationSeconds: TestDuration, testMode: TestMode, boardScope: BoardScope) => void;
};

export function EventSetupScreen({
  storedDuration,
  storedTestMode,
  storedBoardScope,
  saving,
  updateReady,
  onApplyUpdate,
  onStartFresh,
  onContinue,
}: EventSetupScreenProps) {
  const [mode, setMode] = useState<SetupMode>(
    storedDuration === null ? "fresh" : storedBoardScope === "all-time" ? "all-time" : "continue",
  );
  const [selectedDuration, setSelectedDuration] = useState<TestDuration>(storedDuration ?? 30);
  const [selectedTestMode, setSelectedTestMode] = useState<TestMode>(storedTestMode ?? "famous-lines");
  const [cursor, setCursor] = useState<SetupChoice>("start");
  const storySelected = selectedTestMode === "story";
  const visibleDuration: TestDuration = storySelected ? 60 : selectedDuration;
  const screenRef = useRef<HTMLElement>(null);
  const selectionRef = useRef<SetupSelection>({
    cursor: "start",
    duration: selectedDuration,
    testMode: selectedTestMode,
    leaderboard: mode,
  });
  const savingRef = useRef(saving);
  const updateReadyRef = useRef(updateReady);
  const onApplyUpdateRef = useRef(onApplyUpdate);
  /** Null while the setup choices show. Otherwise the Start fresh confirmation is up, with this button chosen. */
  const [confirmCursor, setConfirmCursor] = useState<FreshConfirmChoice | null>(null);
  const confirmCursorRef = useRef(confirmCursor);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  function choiceClass(choice: SetupChoice, fixed = false) {
    const names = [fixed ? "is-fixed" : "", cursor === choice ? "is-cursor" : ""].filter(Boolean);
    return names.length > 0 ? names.join(" ") : undefined;
  }

  function remember(next: SetupSelection) {
    selectionRef.current = next;
    setCursor(next.cursor);
    setSelectedDuration(next.duration);
    setSelectedTestMode(next.testMode);
    setMode(next.leaderboard);
  }

  function startEvent(confirmed = false) {
    const plan = planEventStart(
      mode,
      storedDuration !== null,
      visibleDuration,
      selectedTestMode,
    );
    if (plan.mode === "continue") {
      onContinue(plan.durationSeconds, plan.testMode, plan.boardScope);
      return;
    }
    if (!confirmed && needsFreshConfirm(plan, storedDuration !== null)) {
      setConfirmCursor("cancel");
      return;
    }
    onStartFresh(plan.durationSeconds, plan.testMode);
  }

  const startRef = useRef(startEvent);
  const rememberRef = useRef(remember);

  useEffect(() => {
    startRef.current = startEvent;
    rememberRef.current = remember;
    savingRef.current = saving;
    updateReadyRef.current = updateReady;
    onApplyUpdateRef.current = onApplyUpdate;
    confirmCursorRef.current = confirmCursor;
    selectionRef.current = {
      cursor,
      duration: selectedDuration,
      testMode: selectedTestMode,
      leaderboard: mode,
    };
  });

  useEffect(() => {
    screenRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const confirming = confirmCursorRef.current;
      if (confirming !== null) {
        const answer = applyFreshConfirmKey(confirming, event.key);
        if (answer === null) {
          return;
        }
        event.preventDefault();
        if (typeof answer === "string") {
          confirmCursorRef.current = answer;
          setConfirmCursor(answer);
        } else if (answer.choose === "cancel") {
          confirmCursorRef.current = null;
          setConfirmCursor(null);
        } else if (!savingRef.current) {
          startRef.current(true);
        }
        return;
      }
      const result = applySetupKey(selectionRef.current, event.key, {
        shiftKey: event.shiftKey,
        canContinue: storedDuration !== null,
        updateReady: updateReadyRef.current,
      });
      if (result === null) {
        return;
      }
      event.preventDefault();
      if (result === "update") {
        onApplyUpdateRef.current();
        return;
      }
      if (result === "start") {
        if (!savingRef.current) {
          startRef.current();
        }
        return;
      }
      rememberRef.current(result);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [storedDuration]);

  // Keep keyboard focus on the chosen confirmation button, and back on the screen after cancelling.
  useEffect(() => {
    if (confirmCursor === "cancel") {
      cancelButtonRef.current?.focus();
    } else if (confirmCursor === "confirm") {
      confirmButtonRef.current?.focus();
    } else {
      screenRef.current?.focus();
    }
  }, [confirmCursor]);

  return (
    <main className="screen" ref={screenRef} tabIndex={-1}>
      <span className="logo-badge" aria-hidden="true" />
      <h1>Event setup</h1>
      <p className="setup-hint">Arrow keys move. Enter selects.</p>
      {updateReady && confirmCursor === null ? (
        <section className="setup-update" aria-labelledby="setup-update-title">
          <p id="setup-update-title">
            <strong>An update is ready.</strong> The app restarts on Event Setup. Scores are kept.
          </p>
          <button type="button" className={cursor === "update" ? "is-cursor" : undefined} onClick={onApplyUpdate}>
            UPDATE NOW
          </button>
        </section>
      ) : null}
      {confirmCursor !== null ? (
        <section className="setup-confirm" role="alertdialog" aria-labelledby="setup-confirm-title">
          <h2 id="setup-confirm-title">Start a fresh leaderboard?</h2>
          <p>The current scores stay saved, but they will not show on the leaderboard again.</p>
          <div className="setup-confirm-actions">
            <button
              type="button"
              ref={cancelButtonRef}
              className="setup-confirm-cancel"
              onClick={() => setConfirmCursor(null)}
            >
              CANCEL
            </button>
            <button type="button" ref={confirmButtonRef} onClick={() => startEvent(true)} disabled={saving}>
              START FRESH
            </button>
          </div>
        </section>
      ) : (
        <>
        <fieldset>
          <legend>Test length</legend>
          <label className={choiceClass("30", storySelected)}>
            <input
              type="radio"
              name="duration"
              value="30"
              checked={visibleDuration === 30}
              disabled={storySelected}
              onChange={() => remember({ ...selectionRef.current, cursor: "30", duration: 30 })}
            />
            30 seconds
          </label>
          <label className={choiceClass("60", storySelected)}>
            <input
              type="radio"
              name="duration"
              value="60"
              checked={visibleDuration === 60}
              disabled={storySelected}
              onChange={() => remember({ ...selectionRef.current, cursor: "60", duration: 60 })}
            />
            60 seconds
          </label>
        </fieldset>
        <fieldset>
          <legend>Game mode</legend>
          <label className={choiceClass("words")}>
            <input
              type="radio"
              name="text"
              value="words"
              checked={selectedTestMode === "words"}
              onChange={() => remember({ ...selectionRef.current, cursor: "words", testMode: "words" })}
            />
            Standard
          </label>
          <label className={choiceClass("famous-lines")}>
            <input
              type="radio"
              name="text"
              value="famous-lines"
              checked={selectedTestMode === "famous-lines"}
              onChange={() =>
                remember({ ...selectionRef.current, cursor: "famous-lines", testMode: "famous-lines" })
              }
            />
            Famous Lines
          </label>
          <label className={choiceClass("story")}>
            <input
              type="radio"
              name="text"
              value="story"
              checked={selectedTestMode === "story"}
              onChange={() => remember({ ...selectionRef.current, cursor: "story", testMode: "story" })}
            />
            Story
          </label>
        </fieldset>
        <fieldset>
          <legend>Leaderboard</legend>
          <label className={choiceClass("fresh")}>
            <input
              type="radio"
              name="event-mode"
              value="fresh"
              checked={mode === "fresh"}
              onChange={() => remember({ ...selectionRef.current, cursor: "fresh", leaderboard: "fresh" })}
            />
            Start fresh
          </label>
          <label className={choiceClass("continue")}>
            <input
              type="radio"
              name="event-mode"
              value="continue"
              checked={mode === "continue"}
              disabled={storedDuration === null}
              onChange={() => remember({ ...selectionRef.current, cursor: "continue", leaderboard: "continue" })}
            />
            Continue previous
          </label>
          <label className={choiceClass("all-time")}>
            <input
              type="radio"
              name="event-mode"
              value="all-time"
              checked={mode === "all-time"}
              disabled={storedDuration === null}
              onChange={() => remember({ ...selectionRef.current, cursor: "all-time", leaderboard: "all-time" })}
            />
            All-time leaderboard
          </label>
          {storedDuration === null ? <p>No previous event yet.</p> : null}
        </fieldset>
        <button type="button" className={cursor === "start" ? "is-cursor" : undefined} onClick={() => startEvent()} disabled={saving}>
          START EVENT
        </button>
        </>
      )}
    </main>
  );
}
