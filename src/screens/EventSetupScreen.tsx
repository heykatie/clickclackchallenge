import { useEffect, useRef, useState } from "react";
import type { TestDuration, TestMode } from "../db/persistence";
import { applySetupKey, type SetupChoice, type SetupSelection } from "../state/setupKeyboard";
import { planEventStart, type SetupMode } from "../state/setupRules";

type EventSetupScreenProps = {
  storedDuration: TestDuration | null;
  storedTestMode: TestMode | null;
  saving: boolean;
  onStartFresh: (durationSeconds: TestDuration, testMode: TestMode) => void;
  onContinue: (durationSeconds: TestDuration, testMode: TestMode) => void;
};

export function EventSetupScreen({
  storedDuration,
  storedTestMode,
  saving,
  onStartFresh,
  onContinue,
}: EventSetupScreenProps) {
  const [mode, setMode] = useState<SetupMode>(storedDuration === null ? "fresh" : "continue");
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

  function startEvent() {
    const plan = planEventStart(
      mode,
      storedDuration !== null,
      visibleDuration,
      selectedTestMode,
    );
    if (plan.mode === "continue") {
      onContinue(plan.durationSeconds, plan.testMode);
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
      const result = applySetupKey(selectionRef.current, event.key, {
        shiftKey: event.shiftKey,
        canContinue: storedDuration !== null,
      });
      if (result === null) {
        return;
      }
      event.preventDefault();
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

  return (
    <main className="screen" ref={screenRef} tabIndex={-1}>
      <span className="logo-badge" aria-hidden="true" />
      <h1>Event setup</h1>
      <p className="setup-hint">Arrow keys move. Enter selects.</p>
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
          Continue previous event
        </label>
        {storedDuration === null ? <p>No previous event yet.</p> : null}
      </fieldset>
      <button type="button" className={cursor === "start" ? "is-cursor" : undefined} onClick={startEvent} disabled={saving}>
        START EVENT
      </button>
    </main>
  );
}
