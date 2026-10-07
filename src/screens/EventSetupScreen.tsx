import { useEffect, useId, useRef, useState } from "react";
import {
  cleanEventName,
  MAX_EVENT_NAME_LENGTH,
  type BoardScope,
  type Palette,
  type TestDuration,
  type TestMode,
} from "../db/persistence";
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
  /** The active event's optional name, for the scores download. Never shown to contestants. */
  storedEventName: string | null;
  storedBoardScope: BoardScope | null;
  saving: boolean;
  /** A new version is installed and waiting. */
  updateReady: boolean;
  /** Activates the waiting version and reloads the app. */
  onApplyUpdate: () => void;
  onStartFresh: (durationSeconds: TestDuration, testMode: TestMode, name: string | null) => void;
  onContinue: (durationSeconds: TestDuration, testMode: TestMode, boardScope: BoardScope, name: string | null) => void;
  /** Hides the current event's scores and starts an empty event with these choices. */
  onClearScores: (durationSeconds: TestDuration, testMode: TestMode, name: string | null) => void;
  /** An earlier clear can be undone. */
  canRestore: boolean;
  /** The current board has scores: CLEAR BOARD has something to clear, and Start fresh asks before setting them aside. */
  canClear: boolean;
  /** Shows the scores hidden by the most recent clear again. */
  onRestoreScores: () => void;
  /** Saves every score on the device as a CSV file, for a backup or to look up winners later. */
  onDownloadScores: () => void;
  /** Key clicks and result chimes, off by default for a noisy booth. */
  soundOn: boolean;
  onToggleSound: () => void;
  /** Background music, a device setting apart from sound. */
  musicOn: boolean;
  onToggleMusic: () => void;
  /** The booth's colors, a device setting: warm (the original) or cool (lavender). */
  palette: Palette;
  onTogglePalette: () => void;
  /** Told the highlighted game mode, so the music can preview that mode's world. */
  onTestModeChange?: (mode: TestMode) => void;
  /** Plinko drops won in the active event, for prize stock. Null until counted. */
  plinkoWins: number | null;
};

export function EventSetupScreen({
  storedDuration,
  storedTestMode,
  storedEventName,
  storedBoardScope,
  saving,
  updateReady,
  onApplyUpdate,
  onStartFresh,
  onContinue,
  onClearScores,
  canRestore,
  canClear,
  onRestoreScores,
  onDownloadScores,
  soundOn,
  onToggleSound,
  musicOn,
  onToggleMusic,
  onTestModeChange,
  palette,
  onTogglePalette,
  plinkoWins,
}: EventSetupScreenProps) {
  const [mode, setMode] = useState<SetupMode>(
    storedDuration === null ? "fresh" : storedBoardScope === "all-time" ? "all-time" : "continue",
  );
  const [selectedDuration, setSelectedDuration] = useState<TestDuration>(storedDuration ?? 30);
  const [selectedTestMode, setSelectedTestMode] = useState<TestMode>(storedTestMode ?? "famous-lines");
  const [cursor, setCursor] = useState<SetupChoice>("start");

  useEffect(() => {
    onTestModeChange?.(selectedTestMode);
  }, [selectedTestMode, onTestModeChange]);
  const [eventName, setEventName] = useState(storedEventName ?? "");
  const nameInputRef = useRef<HTMLInputElement>(null);
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
  const onDownloadRef = useRef(onDownloadScores);
  const onToggleSoundRef = useRef(onToggleSound);
  const onToggleMusicRef = useRef(onToggleMusic);
  const onTogglePaletteRef = useRef(onTogglePalette);
  /** Null while the setup choices show. Otherwise a confirmation is up, with this button chosen. */
  const [confirmCursor, setConfirmCursor] = useState<FreshConfirmChoice | null>(null);
  const confirmCursorRef = useRef(confirmCursor);
  /** Which confirmation is up: Start fresh, Clear board, or Restore cleared scores. */
  const [confirmKind, setConfirmKind] = useState<"fresh" | "clear" | "restore">("fresh");
  const canRestoreRef = useRef(canRestore);
  const canClearRef = useRef(canClear);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  function choiceClass(choice: SetupChoice, fixed = false) {
    const names = [fixed ? "is-fixed" : "", cursor === choice ? "is-cursor" : ""].filter(Boolean);
    return names.length > 0 ? names.join(" ") : undefined;
  }

  /**
   * A setting chip: tinted while an on/off setting is on, so staff see the booth's state at a glance.
   * PALETTE is a choice between two, not on or off, so it is never tinted.
   */
  function settingClass(choice: SetupChoice, on: boolean) {
    return ["setup-tool", "setup-chip", on ? "is-on" : "", cursor === choice ? "is-cursor" : ""].filter(Boolean).join(" ");
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
      onContinue(plan.durationSeconds, plan.testMode, plan.boardScope, cleanEventName(eventName));
      return;
    }
    if (!confirmed && needsFreshConfirm(plan, storedDuration !== null && canClear)) {
      setConfirmKind("fresh");
      setConfirmCursor("cancel");
      return;
    }
    onStartFresh(plan.durationSeconds, plan.testMode, cleanEventName(eventName));
  }

  function askToClear() {
    setConfirmKind("clear");
    setConfirmCursor("cancel");
  }

  function askToRestore() {
    setConfirmKind("restore");
    setConfirmCursor("cancel");
  }

  function confirm() {
    // Clearing and restoring keep staff on Event Setup, so the modal closes itself.
    if (confirmKind === "clear") {
      setConfirmCursor(null);
      onClearScores(visibleDuration, selectedTestMode, cleanEventName(eventName));
      return;
    }
    if (confirmKind === "restore") {
      setConfirmCursor(null);
      onRestoreScores();
      return;
    }
    startEvent(true);
  }

  const startRef = useRef(startEvent);
  const confirmRef = useRef(confirm);
  const askToClearRef = useRef(askToClear);
  const askToRestoreRef = useRef(askToRestore);
  const rememberRef = useRef(remember);

  useEffect(() => {
    startRef.current = startEvent;
    confirmRef.current = confirm;
    askToClearRef.current = askToClear;
    askToRestoreRef.current = askToRestore;
    canRestoreRef.current = canRestore;
    canClearRef.current = canClear;
    rememberRef.current = remember;
    savingRef.current = saving;
    updateReadyRef.current = updateReady;
    onApplyUpdateRef.current = onApplyUpdate;
    onDownloadRef.current = onDownloadScores;
    onToggleSoundRef.current = onToggleSound;
    onToggleMusicRef.current = onToggleMusic;
    onTogglePaletteRef.current = onTogglePalette;
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
      // While the event name field has focus, keys type into it. Enter or Escape leaves it; Up, Down,
      // and Tab leave it and move the cursor as usual.
      if (event.target === nameInputRef.current) {
        if (event.key === "Enter" || event.key === "NumpadEnter" || event.key === "Escape") {
          event.preventDefault();
          screenRef.current?.focus();
          return;
        }
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown" && event.key !== "Tab") {
          return;
        }
        screenRef.current?.focus();
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
          confirmRef.current();
        }
        return;
      }
      const result = applySetupKey(selectionRef.current, event.key, {
        shiftKey: event.shiftKey,
        canContinue: storedDuration !== null,
        updateReady: updateReadyRef.current,
        canRestore: canRestoreRef.current,
        canClear: canClearRef.current,
      });
      if (result === null) {
        return;
      }
      event.preventDefault();
      if (result === "update") {
        onApplyUpdateRef.current();
        return;
      }
      if (result === "download") {
        onDownloadRef.current();
        return;
      }
      if (result === "sound") {
        onToggleSoundRef.current();
        return;
      }
      if (result === "music") {
        onToggleMusicRef.current();
        return;
      }
      if (result === "palette") {
        onTogglePaletteRef.current();
        return;
      }
      if (result === "name") {
        nameInputRef.current?.focus();
        return;
      }
      if (result === "clear") {
        if (!savingRef.current) {
          askToClearRef.current();
        }
        return;
      }
      if (result === "restore") {
        if (!savingRef.current) {
          askToRestoreRef.current();
        }
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

  // While a confirmation is up, the page behind it cannot be pressed, tabbed to, or read out.
  const shutWhileAsking = confirmCursor !== null ? { inert: true, "aria-hidden": true } : {};

  return (
    <main className="screen setup-screen edge-motifs" ref={screenRef} tabIndex={-1}>
      <span className="logo-badge" aria-hidden="true" />
      <div className="setup-heading" {...shutWhileAsking}>
        <div className="setup-heading-text">
          <h1 className="setup-title">Set up today's typing test</h1>
        </div>
        {/* Device settings, top right, as chips that show their state. Last in the arrow-key order. */}
        <div className="setup-settings" role="group" aria-label="Settings">
          <button
            type="button"
            className={settingClass("sound", soundOn)}
            aria-pressed={soundOn}
            onClick={onToggleSound}
          >
            SOUND: <ChipValue value={soundOn ? "ON" : "OFF"} other={soundOn ? "OFF" : "ON"} />
          </button>
          <button
            type="button"
            className={settingClass("music", musicOn)}
            aria-pressed={musicOn}
            onClick={onToggleMusic}
          >
            MUSIC: <ChipValue value={musicOn ? "ON" : "OFF"} other={musicOn ? "OFF" : "ON"} />
          </button>
          <button type="button" className={settingClass("palette", false)} onClick={onTogglePalette}>
            <span className="palette-swatch" aria-hidden="true" />
            PALETTE: <ChipValue value={palette === "cool" ? "COOL" : "WARM"} other={palette === "cool" ? "WARM" : "COOL"} />
          </button>
        </div>
      </div>
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
        <div className="setup-groups" {...shutWhileAsking}>
          <fieldset className="setup-group setup-group-length">
            <legend>Test length</legend>
            <div className="setup-options setup-options-two">
              <SetupOption
                className={choiceClass("30", storySelected)}
                name="duration"
                value="30"
                checked={visibleDuration === 30}
                disabled={storySelected}
                onSelect={() => remember({ ...selectionRef.current, cursor: "30", duration: 30 })}
                title="30 seconds"
                bigTitle="30s"
                description="Faster flow"
              />
              <SetupOption
                // Story's locked length shows as the plain selected tile; only 30s greys out.
                className={choiceClass("60")}
                name="duration"
                value="60"
                checked={visibleDuration === 60}
                onSelect={() => remember({ ...selectionRef.current, cursor: "60", duration: 60 })}
                title="60 seconds"
                bigTitle="60s"
                description="Bigger challenge"
              />
            </div>
          </fieldset>
          <fieldset className="setup-group setup-group-mode">
            <legend>Game mode</legend>
            <div className="setup-options setup-options-three">
              <SetupOption
                className={choiceClass("words")}
                name="text"
                value="words"
                checked={selectedTestMode === "words"}
                onSelect={() => remember({ ...selectionRef.current, cursor: "words", testMode: "words" })}
                title="Standard"
                description="Random easy words"
              />
              <SetupOption
                className={choiceClass("famous-lines")}
                name="text"
                value="famous-lines"
                checked={selectedTestMode === "famous-lines"}
                onSelect={() =>
                  remember({ ...selectionRef.current, cursor: "famous-lines", testMode: "famous-lines" })
                }
                title="Famous Lines"
                description="Iconic fun quotes"
              />
              <SetupOption
                className={choiceClass("story")}
                name="text"
                value="story"
                checked={selectedTestMode === "story"}
                onSelect={() => remember({ ...selectionRef.current, cursor: "story", testMode: "story" })}
                title="Story"
                description="Race to the end"
              />
            </div>
          </fieldset>
          <fieldset className="setup-group setup-group-board">
            <legend>Leaderboard</legend>
            <div className="setup-options setup-options-three">
              <SetupOption
                className={choiceClass("fresh")}
                tone="lavender"
                name="event-mode"
                value="fresh"
                checked={mode === "fresh"}
                onSelect={() => remember({ ...selectionRef.current, cursor: "fresh", leaderboard: "fresh" })}
                title="Start fresh"
                description="New, empty board"
              />
              <SetupOption
                className={choiceClass("continue")}
                tone="lavender"
                name="event-mode"
                value="continue"
                checked={mode === "continue"}
                disabled={storedDuration === null}
                onSelect={() => remember({ ...selectionRef.current, cursor: "continue", leaderboard: "continue" })}
                title="Continue previous"
                description={storedEventName ? `From “${storedEventName}”` : "From last board"}
              />
              <SetupOption
                className={choiceClass("all-time")}
                tone="lavender"
                name="event-mode"
                value="all-time"
                checked={mode === "all-time"}
                disabled={storedDuration === null}
                onSelect={() => remember({ ...selectionRef.current, cursor: "all-time", leaderboard: "all-time" })}
                title="All-time leaderboard"
                description="Every score ever"
              />
            </div>
            {storedDuration !== null || canRestore ? (
              <div className="setup-score-actions">
                {storedDuration !== null ? (
                  <button
                    type="button"
                    className={cursor === "download" ? "setup-tool setup-chip is-cursor" : "setup-tool setup-chip"}
                    onClick={onDownloadScores}
                  >
                    DOWNLOAD SCORES
                  </button>
                ) : null}
                {storedDuration !== null ? (
                  <button
                    type="button"
                    className={cursor === "clear" ? "setup-tool is-danger is-cursor" : "setup-tool is-danger"}
                    onClick={askToClear}
                    disabled={saving || !canClear}
                    data-tooltip={canClear ? "Clear current event" : "No scores to clear yet"}
                  >
                    CLEAR BOARD
                  </button>
                ) : null}
                {canRestore ? (
                  <button
                    type="button"
                    className={cursor === "restore" ? "setup-tool is-cursor" : "setup-tool"}
                    onClick={askToRestore}
                    disabled={saving}
                  >
                    RESTORE CLEARED SCORES
                  </button>
                ) : null}
              </div>
            ) : null}
            {storedDuration === null ? <p className="setup-note">No previous event yet.</p> : null}
          </fieldset>
        </div>
        <footer className="setup-footer" {...shutWhileAsking}>
          <div className="setup-footer-side">
            {storedDuration !== null && plinkoWins !== null ? (
              <p className="setup-plinko-count">Plinko drops won this event: {plinkoWins}</p>
            ) : null}
            <label className={cursor === "name" ? "setup-name is-cursor" : "setup-name"}>
              <span>Event name (optional)</span>
              <input
                ref={nameInputRef}
                type="text"
                value={eventName}
                maxLength={MAX_EVENT_NAME_LENGTH}
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. Saturday market"
                onFocus={() => setCursor("name")}
                onChange={(event) => setEventName(event.target.value)}
              />
            </label>
          </div>
          <div className="setup-start-group">
            <button
              type="button"
              className={cursor === "start" ? "setup-start is-cursor" : "setup-start"}
              onClick={() => startEvent()}
              disabled={saving}
            >
              START EVENT <span aria-hidden="true">→</span>
            </button>
            <p className="setup-hint">Arrow keys move. Enter selects.</p>
          </div>
        </footer>
      {confirmCursor !== null ? (
        // A modal over the page: Event Setup stays where it was behind it, shut off until CANCEL or a choice.
        <div className="setup-modal-backdrop">
        <section className="setup-confirm" role="alertdialog" aria-modal="true" aria-labelledby="setup-confirm-title">
          {confirmKind === "restore" ? (
            <>
              <h2 id="setup-confirm-title">Restore cleared scores?</h2>
              <p>
                The scores hidden by the last clear show again on every board and list. The current event and its
                scores stay.
              </p>
            </>
          ) : confirmKind === "clear" ? (
            <>
              <h2 id="setup-confirm-title">Clear this board?</h2>
              <p>
                This event's scores are hidden from every leaderboard, the high-score list, and the all-time best,
                and an empty event starts. Earlier events stay. The scores stay saved on this device.
              </p>
            </>
          ) : (
            <>
              <h2 id="setup-confirm-title">Start a fresh leaderboard?</h2>
              <p>The recent scores stay saved, but they will not show on current leaderboard again.</p>
            </>
          )}
          <div className="setup-confirm-actions">
            <button
              type="button"
              ref={cancelButtonRef}
              className="setup-confirm-cancel"
              onClick={() => setConfirmCursor(null)}
            >
              CANCEL
            </button>
            <button type="button" ref={confirmButtonRef} onClick={confirm} disabled={saving}>
              {confirmKind === "restore" ? "RESTORE" : confirmKind === "clear" ? "CLEAR BOARD" : "START FRESH"}
            </button>
          </div>
        </section>
        </div>
      ) : null}
    </main>
  );
}

type SetupOptionProps = {
  /** Cursor and fixed-state classes from the keyboard handling. */
  className: string | undefined;
  tone?: "mint" | "lavender";
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  /** The option's accessible name. */
  title: string;
  /** A short visual stand-in for the title, such as "30s". */
  bigTitle?: string;
  /** A short line under the title. Left out where the title says enough. */
  description?: string;
};

/**
 * A setting chip's value, with its other value laid invisibly in the same spot,
 * so the chip is always as wide as its widest value and switching it never shifts the chips beside it.
 */
function ChipValue({ value, other }: { value: string; other: string }) {
  return (
    <span className="setup-chip-value">
      <span>{value}</span>
      <span aria-hidden="true">{other}</span>
    </span>
  );
}

/** One choice as a tile. It stays a real radio button named by its title; the tint and ring show the selection. */
function SetupOption({
  className,
  tone = "mint",
  name,
  value,
  checked,
  disabled = false,
  onSelect,
  title,
  bigTitle,
  description,
}: SetupOptionProps) {
  const id = useId();
  const classes = [
    "setup-option",
    `setup-option-${tone}`,
    bigTitle ? "setup-option-big" : "",
    checked ? "is-selected" : "",
    disabled ? "is-disabled" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <label className={classes}>
      <input
        type="radio"
        className="setup-option-input"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
      />
      <span id={`${id}-title`} className="setup-option-title">
        {bigTitle ? (
          <>
            <span aria-hidden="true">{bigTitle}</span>
            <span className="visually-hidden">{title}</span>
          </>
        ) : (
          title
        )}
      </span>
      {description ? (
        <span id={`${id}-description`} className="setup-option-description">
          {description}
        </span>
      ) : null}
    </label>
  );
}
