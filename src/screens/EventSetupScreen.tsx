import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  cleanEventName,
  MAX_EVENT_NAME_LENGTH,
  type BoardScope,
  type Palette,
  type TestDuration,
  type TestMode,
} from "../db/persistence";
import { parseBackup, type Backup } from "../features/backup/backup";
import { useOnlineStatus } from "../pwa/useOnlineStatus";
import { formatHourWindow, formatPeakHours, type EventRecapStats } from "../features/recap/eventRecap";
import type { PersistResult } from "../db/persistentStorage";
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
  /** Saves every score on the device as a CSV file, a report to read in a spreadsheet or look up winners. */
  onDownloadScores: () => void;
  /** Saves a full backup file that RESTORE BACKUP can load again, here or on another device. */
  onSaveBackup: () => void;
  /** Merges a backup into this device; resolves with how many events and scores were added. */
  onRestoreBackup: (backup: Backup) => Promise<{ eventsAdded: number; scoresAdded: number }>;
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
  /** Locally computed, anonymous recap facts for the active event. */
  recapStats?: EventRecapStats | null;
  /** Locally computed aggregate for every visible event on this device. */
  allTimeRecapStats?: EventRecapStats | null;
  /** Whether the browser granted protection against automatic storage cleanup. */
  storageProtection?: PersistResult | "checking";
};

/** How long a tapped, greyed-out button keeps its tooltip showing. */
const TOOLTIP_TAP_MS = 2500;

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
  onSaveBackup,
  onRestoreBackup,
  soundOn,
  onToggleSound,
  musicOn,
  onToggleMusic,
  onTestModeChange,
  palette,
  onTogglePalette,
  recapStats = null,
  allTimeRecapStats = null,
  storageProtection = "checking",
}: EventSetupScreenProps) {
  const recapAvailabilityId = useId();
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
  const onSaveBackupRef = useRef(onSaveBackup);
  const backupInputRef = useRef<HTMLInputElement>(null);
  // A backup file waiting for its confirmation, and the last restore's outcome to show under the score actions.
  const [pendingBackup, setPendingBackup] = useState<Backup | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const onToggleSoundRef = useRef(onToggleSound);
  const onToggleMusicRef = useRef(onToggleMusic);
  const onTogglePaletteRef = useRef(onTogglePalette);
  /** Null while the setup choices show. Otherwise a confirmation is up, with this button chosen. */
  const [confirmCursor, setConfirmCursor] = useState<FreshConfirmChoice | null>(null);
  const confirmCursorRef = useRef(confirmCursor);
  /** Which confirmation is up: Start fresh, Clear board, or Restore cleared scores. */
  const [confirmKind, setConfirmKind] = useState<"fresh" | "clear" | "restore" | "import">("fresh");
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapPeriod, setRecapPeriod] = useState<"event" | "all-time">("event");
  const recapCloseRef = useRef<HTMLButtonElement>(null);
  const recapOpenRef = useRef(false);
  const canRestoreRef = useRef(canRestore);
  const canClearRef = useRef(canClear);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const displayedRecapStats = recapPeriod === "all-time" ? allTimeRecapStats : recapStats;
  // Several hours can tie for busiest, so the label follows how many there are.
  const peakLabel = (displayedRecapStats?.peakHours.length ?? 0) > 1 ? "Peak hours" : "Peak hour";
  const busiestChartHour = Math.max(0, ...(displayedRecapStats?.roundsByHour.map(({ rounds }) => rounds) ?? []));

  // A greyed-out button still takes a tap, to show why it is unavailable: a touch screen has no hover.
  const [openTooltip, setOpenTooltip] = useState<"clear" | "recap" | null>(null);
  useEffect(() => {
    if (openTooltip === null) {
      return;
    }
    const id = window.setTimeout(() => setOpenTooltip(null), TOOLTIP_TAP_MS);
    return () => window.clearTimeout(id);
  }, [openTooltip]);
  const online = useOnlineStatus();
  const recapUnavailable = !recapStats || recapStats.completedRounds === 0;
  const clearUnavailable = saving || !canClear;

  const openRecap = useCallback(() => {
    if (!recapStats || recapStats.completedRounds === 0) {
      return;
    }
    setRecapOpen(true);
    setRecapPeriod("event");
    recapOpenRef.current = true;
  }, [recapStats]);

  function closeRecap() {
    recapOpenRef.current = false;
    setRecapOpen(false);
    screenRef.current?.focus();
  }

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

  async function chooseBackupFile(file: File | undefined) {
    if (!file) {
      return;
    }
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setBackupMessage(parsed.reason);
      return;
    }
    setBackupMessage(null);
    setPendingBackup(parsed.backup);
    setConfirmKind("import");
    setConfirmCursor("cancel");
  }

  async function restorePendingBackup() {
    const backup = pendingBackup;
    setConfirmCursor(null);
    setPendingBackup(null);
    if (!backup) {
      return;
    }
    try {
      const { eventsAdded, scoresAdded } = await onRestoreBackup(backup);
      setBackupMessage(
        scoresAdded === 0 && eventsAdded === 0
          ? "Everything in that backup is already here."
          : `Restored ${scoresAdded} ${scoresAdded === 1 ? "score" : "scores"} from ${eventsAdded} ${eventsAdded === 1 ? "event" : "events"}.`,
      );
    } catch {
      setBackupMessage("That backup couldn’t be restored. Nothing was changed.");
    }
  }

  function confirm() {
    if (confirmKind === "import") {
      void restorePendingBackup();
      return;
    }
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
    onSaveBackupRef.current = onSaveBackup;
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
      if (recapOpenRef.current) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeRecap();
        } else if (event.key !== "Tab" && event.target !== recapCloseRef.current) {
          event.preventDefault();
        }
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
      if (result === "backup") {
        onSaveBackupRef.current();
        return;
      }
      if (result === "import") {
        backupInputRef.current?.click();
        return;
      }
      if (result === "recap") {
        openRecap();
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
  }, [storedDuration, recapStats, openRecap]);

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

  useEffect(() => {
    if (recapOpen) {
      recapCloseRef.current?.focus();
    }
  }, [recapOpen]);

  // While a confirmation is up, the page behind it cannot be pressed, tabbed to, or read out.
  const shutWhileAsking = confirmCursor !== null || recapOpen ? { inert: true, "aria-hidden": true } : {};

  return (
    <main className="screen setup-screen" ref={screenRef} tabIndex={-1}>
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
        {/* The event name, with its recap beside it, opens the page above Test length. */}
        <div className="setup-event-line setup-name-row" {...shutWhileAsking}>
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
          {storedDuration !== null ? (
            <span className={openTooltip === "recap" ? "setup-recap-action is-tooltip-open" : "setup-recap-action"}>
              <button
                type="button"
                className={cursor === "recap" ? "setup-tool setup-chip is-cursor" : "setup-tool setup-chip"}
                onClick={() => (recapUnavailable ? setOpenTooltip("recap") : openRecap())}
                aria-disabled={recapUnavailable}
                aria-describedby={recapUnavailable ? recapAvailabilityId : undefined}
              >
                EVENT RECAP
              </button>
              {!recapStats || recapStats.completedRounds === 0 ? (
                <span className="setup-recap-availability" id={recapAvailabilityId} role="tooltip">
                  {recapStats === null ? "Loading event stats…" : "Complete a round to enable recap"}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
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
                    className={["setup-tool is-danger", cursor === "clear" ? "is-cursor" : "", openTooltip === "clear" ? "is-tooltip-open" : ""].filter(Boolean).join(" ")}
                    onClick={() => (clearUnavailable ? setOpenTooltip("clear") : askToClear())}
                    aria-disabled={clearUnavailable}
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
            {storedDuration === null ? <p className="setup-note">No previous event.</p> : null}
          </fieldset>
        </div>
        <footer className="setup-footer" {...shutWhileAsking}>
          <div className="setup-footer-side">
            {/* A backup of every score, and restoring one, beside START EVENT; the storage line sits under them. */}
            <div className="setup-footer-tools">
              {storedDuration !== null ? (
                <button
                  type="button"
                  className={cursor === "backup" ? "setup-tool setup-chip is-cursor" : "setup-tool setup-chip"}
                  onClick={onSaveBackup}
                >
                  SAVE BACKUP
                </button>
              ) : null}
              <button
                type="button"
                className={cursor === "import" ? "setup-tool is-cursor" : "setup-tool"}
                onClick={() => backupInputRef.current?.click()}
                disabled={saving}
              >
                RESTORE BACKUP
              </button>
              <input
                ref={backupInputRef}
                className="visually-hidden"
                type="file"
                accept="application/json,.json"
                aria-label="Backup file"
                tabIndex={-1}
                onChange={(event) => {
                  void chooseBackupFile(event.target.files?.[0]);
                  // Clearing the value lets the same file be chosen again.
                  event.target.value = "";
                }}
              />
            </div>
            {/* The device's status in one line: online or not, then whether its stored scores are protected. */}
            <p className="setup-storage-status setup-device-status" role="status" aria-live="polite">
              <span
                className={online ? "setup-online-dot is-online" : "setup-online-dot"}
                role="img"
                aria-label={online ? "Online" : "Offline: scores still save on this iPad"}
                title={online ? "Online" : "Offline: scores still save on this iPad"}
              />
              <span className="setup-online-label">{online ? "Online" : "Offline"} · </span>
              {storageProtection === "checking"
                ? "Checking storage…"
                : storageProtection === "persisted" || storageProtection === "granted"
                  ? "Score storage is protected."
                  : storageProtection === "denied"
                    ? "Storage isn’t protected. Save a backup."
                    : "Storage status is unavailable. Save a backup."}
            </p>
            {backupMessage ? (
              <p className="setup-storage-status" role="status">
                {backupMessage}
              </p>
            ) : null}
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
        // Keep the fixed overlay outside the setup screen's flex layout so it cannot shift the page behind it.
        createPortal(
          <div className="setup-modal-backdrop">
            <section
              className="setup-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="setup-confirm-title"
            >
              {confirmKind === "import" ? (
                <>
                  <h2 id="setup-confirm-title">Restore from backup?</h2>
                  <p>
                    Adds the events and scores in this file that aren’t on this iPad yet
                    {pendingBackup ? ` (${pendingBackup.scores.length} ${pendingBackup.scores.length === 1 ? "score" : "scores"} in the file)` : ""}.
                    Scores already on this iPad stay.
                  </p>
                </>
              ) : confirmKind === "restore" ? (
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
                  {confirmKind === "import" ? "RESTORE BACKUP" : confirmKind === "restore" ? "RESTORE" : confirmKind === "clear" ? "CLEAR BOARD" : "START FRESH"}
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )
      ) : null}
      {recapOpen && recapStats ? createPortal(
        <div className="setup-modal-backdrop">
          <section className="setup-confirm setup-event-recap" role="dialog" aria-modal="true" aria-labelledby="event-recap-title">
            <button ref={recapCloseRef} type="button" className="setup-recap-close" onClick={closeRecap} aria-label="Close event recap">×</button>
            <header className="setup-recap-header">
              <p className="setup-recap-eyebrow">EVENT RECAP</p>
              <h2 id="event-recap-title">{cleanEventName(eventName) ?? "Event recap"}</h2>
            </header>
            <div className="setup-recap-period" role="group" aria-label="Recap period">
              <button type="button" aria-pressed={recapPeriod === "event"} onClick={() => setRecapPeriod("event")}>This event</button>
              <button type="button" aria-pressed={recapPeriod === "all-time"} disabled={!allTimeRecapStats} onClick={() => setRecapPeriod("all-time")}>All time</button>
            </div>
            {displayedRecapStats ? <>
            <section className="setup-recap-section setup-recap-highlights" aria-label="Highlights">
              <dl className="setup-recap-stats">
                <div className="setup-recap-kpi"><dt>Rounds</dt><dd>{displayedRecapStats.completedRounds}</dd></div>
                <div className="setup-recap-kpi"><dt>Median WPM</dt><dd>{displayedRecapStats.medianWpm === null ? "—" : displayedRecapStats.medianWpm.toLocaleString(undefined, { maximumFractionDigits: 1 })}</dd></div>
                <div className="setup-recap-kpi"><dt>Fastest WPM</dt><dd>{displayedRecapStats.fastestWpm === null ? "—" : displayedRecapStats.fastestWpm.toLocaleString(undefined, { maximumFractionDigits: 1 })}</dd></div>
                <div className="setup-recap-kpi"><dt>Avg. accuracy <RecapHelp label="Avg. accuracy help" text="Average of rounds with saved accuracy." /></dt><dd>{displayedRecapStats.averageAccuracy === null ? "—" : `${displayedRecapStats.averageAccuracy.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`}</dd></div>
              </dl>
            </section>
            {/*
              The breakdowns flow through two balanced columns in this order, so neither side is left with a gap
              however many modes, lengths, or busy hours an event has.
            */}
            <section className="setup-recap-flow" aria-label="Breakdown">
              <dl className="setup-recap-block" data-block="modes">
                <dt className="visually-hidden">Modes</dt>
                <dd><ul className="setup-recap-mix" aria-label="Mode breakdown">
                  {displayedRecapStats.modeUsage.map(({ mode, rounds, percentage }) => (
                    <li key={mode}>
                      <span>{mode === "famous-lines" ? "Famous Lines" : mode === "words" ? "Words" : "Story"}</span>
                      <span>{percentage}% · {rounds} {rounds === 1 ? "round" : "rounds"}</span>
                    </li>
                  ))}
                </ul></dd>
              </dl>
              <dl className="setup-recap-block" data-block="lengths">
                <dt className="visually-hidden">Round lengths</dt>
                <dd><ul className="setup-recap-mix" aria-label="Round length breakdown">
                  {displayedRecapStats.durationUsage.map(({ durationSeconds, rounds, percentage }) => (
                    <li key={durationSeconds}>
                      <span>{durationSeconds}s</span>
                      <span>{percentage}% · {rounds} {rounds === 1 ? "round" : "rounds"}</span>
                    </li>
                  ))}
                </ul></dd>
              </dl>
              <dl className="setup-recap-block" data-block="peak">
                <dt>{peakLabel} <RecapHelp label={`${peakLabel} help`} text="Based on saved round times in your local time, not foot traffic." /></dt>
                <dd>
                  {displayedRecapStats.peakHours.length === 0
                    ? formatPeakHours(displayedRecapStats.peakHours, displayedRecapStats.completedRounds)
                    : <ul className="setup-recap-mix" aria-label="Peak hours">
                        {displayedRecapStats.peakHours.map((hour) => (
                          <li key={hour}>
                            <span>{formatHourWindow(hour)}</span>
                            <span>{displayedRecapStats.peakHourRounds} {displayedRecapStats.peakHourRounds === 1 ? "round" : "rounds"}</span>
                          </li>
                        ))}
                      </ul>}
                </dd>
              </dl>
              <dl className="setup-recap-block" data-block="hourly">
                <dt className="visually-hidden">Hourly activity</dt>
                <dd>
                  {displayedRecapStats.roundsByHour.length === 0
                    ? "Time unavailable"
                    : <ul className="setup-recap-chart" aria-label="Hourly activity">
                        {displayedRecapStats.roundsByHour.map(({ hour, rounds }) => (
                          <li className="setup-recap-chart-row" key={hour}>
                            <span>{formatHourWindow(hour)}</span>
                            <span>{rounds} {rounds === 1 ? "round" : "rounds"}</span>
                            <span className="setup-recap-chart-track" aria-hidden="true">
                              <span className="setup-recap-chart-bar" style={{ width: `${(rounds / busiestChartHour) * 100}%` }} />
                            </span>
                          </li>
                        ))}
                      </ul>}
                </dd>
              </dl>
              <dl className="setup-recap-block setup-recap-stats setup-recap-prizes" data-block="plinko">
                <div className="setup-recap-kpi setup-recap-kpi-secondary"><dt>Plinko wins</dt><dd>{displayedRecapStats.plinkoDropsWon}</dd></div>
                <div className="setup-recap-kpi setup-recap-kpi-secondary"><dt>Plinko win rate</dt><dd>{displayedRecapStats.plinkoWinnerPercentage.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</dd></div>
              </dl>
            </section>
            </> : null}
          </section>
        </div>,
        document.body,
      ) : null}
    </main>
  );
}

function RecapHelp({ label, text }: { label: string; text: string }) {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <button
      type="button"
      className="setup-recap-help"
      aria-label={label}
      aria-describedby={tooltipId}
      aria-expanded={isOpen}
      aria-controls={tooltipId}
      onClick={() => setIsOpen((open) => !open)}
      data-open={isOpen || undefined}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false">
        <circle cx="10" cy="10" r="8.25" />
        <path d="M8.1 7.4a1.95 1.95 0 1 1 3.48 1.2c-.54.68-1.58 1.13-1.58 2.18M10 13.7h.01" />
      </svg>
      <span className="setup-recap-help-text" id={tooltipId} role="tooltip">{text}</span>
    </button>
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
