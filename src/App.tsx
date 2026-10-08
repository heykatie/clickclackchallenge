import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { requestPersistentStorage } from "./db/persistentStorage";
import { clearCurrentEvent, hasClearedScores, restoreClearedScores, startFreshEvent, listScores, loadBooth, passageSetIdFor, saveScore, updateActiveEvent, updateScoreName, setSoundOn as saveSoundSetting, setMusicOn as saveMusicSetting, setPalette as savePalette, type Palette, type NewScore, type EventRecord, type ScoreRecord, type TestDuration, type TestMode, type BoardScope, listAllScores, listBoardScores, listEverything } from "./db/persistence";
import { downloadTextFile } from "./features/export/downloadTextFile";
import { scoresCsv, scoresFileName } from "./features/export/scoresCsv";
import { highScore } from "./features/leaderboard/ranking";
import { countPlinkoWins } from "./features/typing/scoring";
import { describeAttempt, resultCopy, type ResultStanding } from "./features/results/resultPlacement";
import { showsInPortrait, type BoothScreen } from "./pwa/boothViewport";
import { LandscapeGate, type LogoActions } from "./pwa/LandscapeGate";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { EventSetupScreen } from "./screens/EventSetupScreen";
import { ReadyScreen } from "./screens/ReadyScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { TypingScreen } from "./screens/TypingScreen";
import { appReducer, initialState, type AppState } from "./state/appState";
import { createEscapeHold, escapeHoldMs } from "./state/escapeHold";
import { boothMusic } from "./sound/music/musicPlayer";
import { HOP_THEME, themeForScreen } from "./sound/music/themes";
import { boothSound } from "./sound/boothSound";
import { keyCue, resultCue } from "./sound/soundCues";
import { createResultSaver } from "./state/resultSave";
import { createStartKeyGate } from "./state/startKey";

function landscapeOnly(screen: BoothScreen, screenNode: ReactNode, logo?: LogoActions): ReactNode {
  if (showsInPortrait(screen)) {
    return screenNode;
  }
  return <LandscapeGate logo={logo}>{screenNode}</LandscapeGate>;
}

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  // A new version waits until the operator installs it from Event Setup or the app is closed.
  const {
    needRefresh: [updateReady],
    updateServiceWorker,
  } = useRegisterSW();
  const [saving, setSaving] = useState(false);
  const [standing, setStanding] = useState<ResultStanding | null>(null);
  const [leaderboardScores, setLeaderboardScores] = useState<ScoreRecord[]>([]);
  const [allTimeBest, setAllTimeBest] = useState<ScoreRecord | null>(null);
  const [canRestore, setCanRestore] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [palette, setPalette] = useState<Palette>("warm");
  // The idle high-score list sits on top of Ready, so it is tracked apart from the screen for the music.
  const [rolling, setRolling] = useState(false);
  // Keycap Hop has its own tune; Ready reports when it is open.
  const [hopping, setHopping] = useState(false);
  // Event Setup previews the highlighted mode's music before the event starts.
  const [setupMode, setSetupMode] = useState<TestMode>("famous-lines");
  const [plinkoWins, setPlinkoWins] = useState<number | null>(null);
  // How many scores the active event's board holds, so CLEAR BOARD is greyed out when there is nothing to clear.
  const [boardScoreCount, setBoardScoreCount] = useState(0);
  // The latest state, for working out a key's sound the moment the key goes down.
  const stateRef = useRef(state);
  const [trackedScreen, setTrackedScreen] = useState(state.screen);
  const startKeyGate = useRef(createStartKeyGate(window));
  const resultSaver = useRef(createResultSaver(saveScore, updateScoreName));
  const shortEscapeRef = useRef<(() => void) | null>(null);
  const claimShortEscape = useCallback((handler: (() => void) | null) => {
    shortEscapeRef.current = handler;
  }, []);
  const screenRef = useRef(state.screen);
  const statusRef = useRef(status);
  // Set each render after enterSetup below, so the Escape hold always opens Setup with the latest state.
  const enterSetupRef = useRef<() => Promise<void>>(async () => {});
  useLayoutEffect(() => {
    stateRef.current = state;
  });
  useEffect(() => {
    screenRef.current = state.screen;
    statusRef.current = status;
  });
  if (trackedScreen !== state.screen) {
    setTrackedScreen(state.screen);
    if (state.screen !== "results") {
      setStanding(null);
    }
  }

  useEffect(() => {
    const hold = createEscapeHold(() => {
      if (screenRef.current === "setup" || statusRef.current !== "ready") {
        return;
      }
      void enterSetupRef.current();
    }, () => (screenRef.current === "setup" ? escapeHoldMs("ready") : escapeHoldMs(screenRef.current)));
    const onKeyDown = (event: KeyboardEvent) => {
      if (screenRef.current === "setup" || statusRef.current !== "ready") {
        return;
      }
      if (!hold.keyDown(event)) {
        return;
      }
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (screenRef.current === "setup" || statusRef.current !== "ready") {
        hold.cancel();
        return;
      }
      const result = hold.keyUp(event);
      if (result === "ignore") {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (result === "short") {
        if (shortEscapeRef.current) {
          shortEscapeRef.current();
        } else if (screenRef.current === "typing") {
          dispatch({ type: "ENTER_READY" });
        }
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      hold.cancel();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadBooth().then(
      (booth) => {
        if (cancelled) {
          return;
        }
        if (booth.activeEvent) {
          dispatch({ type: "SET_ACTIVE_EVENT", event: booth.activeEvent });
        }
        setCanRestore(booth.hasClearedScores);
        setSoundOn(booth.settings.soundOn ?? false);
        boothSound.setEnabled(booth.settings.soundOn ?? false);
        setMusicOn(booth.settings.musicOn ?? false);
        setPalette(booth.settings.palette ?? "warm");
        setStatus("ready");
        // Storage works without this; it only asks the browser not to evict the scores.
        void requestPersistentStorage();
      },
      () => {
        if (!cancelled) {
          setStatus("failed");
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Event Setup shows how many Plinko drops the active event has given out, counted fresh each visit.
  const activeEventId = state.activeEvent?.id ?? null;
  useEffect(() => {
    if (state.screen !== "setup" || activeEventId === null) {
      return;
    }
    let cancelled = false;
    listScores(activeEventId).then(
      (scores) => {
        if (!cancelled) {
          setPlinkoWins(countPlinkoWins(scores));
          setBoardScoreCount(scores.length);
        }
      },
      // The count is a convenience: if it cannot be read, Event Setup simply leaves it out.
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [state.screen, activeEventId]);


  // One chime or ding when Results knows where the attempt stands.
  useEffect(() => {
    if (standing && state.latestResult) {
      const cue = resultCue(resultCopy(standing, state.latestResult.displayedWpm, state.latestResult.accuracy));
      if (cue) {
        boothSound.play(cue);
      }
    }
  }, [standing, state.latestResult]);

  useEffect(() => {
    if (state.screen !== "results" || state.latestResult === null || state.currentTest === null || state.activeEvent === null) {
      return;
    }
    const event = state.activeEvent;
    const test = state.currentTest;
    const result = state.latestResult;
    let cancelled = false;
    listBoardScores(event).then(
      (scores) => {
        if (cancelled) {
          return;
        }
        // The standing is worked out before the early save, so the attempt is not ranked against itself.
        setStanding(describeAttempt(scores, { ...attemptRow(event, test, result), accuracy: result.accuracy }));
        if (result.accuracy !== null) {
          resultSaver.current.saveEarly(result, attemptRow(event, test, result)).catch((error: unknown) => {
            // Leaving Results tries the save again, so a failed early save does not stop the event.
            console.error("Could not save the score early", error);
          });
        }
      },
      () => {
        if (!cancelled) {
          setStatus("failed");
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [state.screen, state.latestResult, state.currentTest, state.activeEvent]);

  async function openReady(event: EventRecord) {
    const top = highScore(await listBoardScores(event));
    dispatch({ type: "SET_ACTIVE_EVENT", event });
    dispatch({
      type: "ENTER_READY",
      highScore: top ? { displayedWpm: top.displayedWpm, name: top.name } : null,
    });
  }

  async function continueEvent(
    durationSeconds: TestDuration,
    testMode: TestMode,
    boardScope: BoardScope,
    name: string | null,
  ) {
    const event = state.activeEvent;
    if (!event) {
      return;
    }
    setSaving(true);
    try {
      const active =
        durationSeconds === event.durationSeconds &&
        testMode === event.testMode &&
        boardScope === event.boardScope &&
        name === event.name
          ? event
          : await updateActiveEvent(event.id, { durationSeconds, testMode, boardScope, name });
      await openReady(active);
    } catch {
      setStatus("failed");
    } finally {
      setSaving(false);
    }
  }

  async function clearScores(durationSeconds: TestDuration, testMode: TestMode, name: string | null) {
    setSaving(true);
    try {
      const event = await clearCurrentEvent(durationSeconds, testMode, name);
      // Clearing is staff tidying up, not starting play: stay on Event Setup with the new empty board.
      dispatch({ type: "SET_ACTIVE_EVENT", event });
      setCanRestore(await hasClearedScores());
    } catch {
      setStatus("failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    boothSound.setEnabled(next);
    // A sample, so the operator hears that sound works and how loud it is.
    boothSound.play("ding");
    try {
      await saveSoundSetting(next);
    } catch (error) {
      console.error("Could not save the sound setting", error);
    }
  }

  async function toggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    try {
      await saveMusicSetting(next);
    } catch (error) {
      console.error("Could not save the music setting", error);
    }
  }

  async function togglePalette() {
    const next = palette === "cool" ? "warm" : "cool";
    setPalette(next);
    try {
      await savePalette(next);
    } catch (error) {
      console.error("Could not save the palette", error);
    }
  }

  async function downloadScores() {
    try {
      const { scores, events } = await listEverything();
      downloadTextFile(scoresFileName(new Date()), scoresCsv(scores, events));
    } catch (error) {
      // A failed backup must not stop the event: the scores are still on the device.
      console.error("Could not download scores", error);
    }
  }

  /** Stays on Event Setup, like Clear board. */
  async function restoreScores() {
    setSaving(true);
    try {
      await restoreClearedScores();
      setCanRestore(await hasClearedScores());
      // Restoring onto an empty board puts the cleared board back as the current event.
      const { activeEvent } = await loadBooth();
      if (activeEvent && activeEvent.id !== state.activeEvent?.id) {
        dispatch({ type: "SET_ACTIVE_EVENT", event: activeEvent });
      }
    } catch {
      setStatus("failed");
    } finally {
      setSaving(false);
    }
  }

  async function startFresh(durationSeconds: TestDuration, testMode: TestMode, name: string | null) {
    setSaving(true);
    try {
      const event = await startFreshEvent(durationSeconds, testMode, { name });
      await openReady(event);
    } catch {
      setStatus("failed");
    } finally {
      setSaving(false);
    }
  }

  async function recordScore(name: string | null): Promise<ScoreRecord> {
    const event = state.activeEvent;
    const test = state.currentTest;
    const result = state.latestResult;
    if (!event || !test || !result || result.accuracy === null) {
      throw new Error("Result is not ready to save");
    }
    return resultSaver.current.finish(result, attemptRow(event, test, result), name);
  }

  async function leaveResults(name: string | null) {
    setSaving(true);
    try {
      const score = await recordScore(name);
      const event = state.activeEvent;
      setLeaderboardScores(event ? await listBoardScores(event) : await listScores(score.eventId));
      setAllTimeBest(highScore(await listAllScores()));
      dispatch({ type: "SHOW_LEADERBOARD", currentScoreId: score.id });
    } catch {
      setStatus("failed");
    } finally {
      setSaving(false);
    }
  }

  /**
   * Opens Event Setup. From Results the attempt is saved first, with no name, so a staff hold in the instant
   * before Results' early save cannot lose it. A failed save is logged, and Setup still opens.
   */
  async function enterSetup() {
    if (state.screen === "results" && state.latestResult?.accuracy != null) {
      try {
        await recordScore(null);
      } catch (error) {
        console.error("Could not save the score before Event Setup", error);
      }
    }
    dispatch({ type: "ENTER_SETUP" });
  }
  useEffect(() => {
    enterSetupRef.current = enterSetup;
  });

  async function leaveResultsForReady(name: string | null) {
    const event = state.activeEvent;
    if (!event) {
      return;
    }
    setSaving(true);
    try {
      await recordScore(name);
      await openReady(event);
    } catch {
      setStatus("failed");
    } finally {
      setSaving(false);
    }
  }

  const musicTheme =
    status !== "ready"
      ? null
      : hopping
        ? HOP_THEME
        : themeForScreen(
            state.screen === "ready" && rolling ? "rolling" : state.screen,
            state.screen === "setup" ? setupMode : (state.activeEvent?.testMode ?? "famous-lines"),
          );

  useEffect(() => {
    boothMusic.setEnabled(musicOn);
  }, [musicOn]);

  // The cool palette's colors live in styles/palette-cool.css, keyed off this attribute.
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);

  useEffect(() => {
    boothMusic.setTheme(musicTheme);
  }, [musicTheme]);

  useEffect(() => {
    // Browsers only start audio after a tap or key, so an app reopened with music on starts on the first one.
    const wake = () => {
      boothMusic.wake();
      boothSound.wake();
    };
    const onVisibility = () => boothMusic.setHidden(document.hidden);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return boothScreen();

  function boothScreen(): ReactNode {
    if (status === "loading") {
      return <main className="screen" aria-busy="true" />;
    }

    if (status === "failed") {
      return (
        <main className="screen">
          <h1>Scores can't be saved</h1>
          <p>This iPad can't store the event. Don't start a competition until storage is working.</p>
        </main>
      );
    }

    switch (state.screen) {
    case "setup":
      return landscapeOnly(
        "setup",
        <EventSetupScreen
          // A different current event (after Clear board or Restore) reloads Setup's choices from that event.
          key={state.activeEvent?.id ?? "no-event"}
          storedDuration={state.activeEvent?.durationSeconds ?? null}
          storedTestMode={state.activeEvent?.testMode ?? null}
          storedEventName={state.activeEvent?.name ?? null}
          storedBoardScope={state.activeEvent?.boardScope ?? null}
          saving={saving}
          updateReady={updateReady}
          onApplyUpdate={() => {
            void updateServiceWorker(true);
          }}
          onStartFresh={(durationSeconds, testMode, name) => {
            void startFresh(durationSeconds, testMode, name);
          }}
          onContinue={(durationSeconds, testMode, boardScope, name) => {
            void continueEvent(durationSeconds, testMode, boardScope, name);
          }}
          onClearScores={(durationSeconds, testMode, name) => {
            void clearScores(durationSeconds, testMode, name);
          }}
          canRestore={canRestore}
          canClear={boardScoreCount > 0}
          onRestoreScores={() => {
            void restoreScores();
          }}
          onDownloadScores={() => {
            void downloadScores();
          }}
          soundOn={soundOn}
          plinkoWins={plinkoWins}
          onToggleSound={() => {
            void toggleSound();
          }}
          musicOn={musicOn}
          onTestModeChange={setSetupMode}
          palette={palette}
          onTogglePalette={() => {
            void togglePalette();
          }}
          onToggleMusic={() => {
            void toggleMusic();
          }}
        />,
      );
    case "ready":
      return (
        <ReadyScreen
          eventId={state.activeEvent?.id ?? null}
          allTime={state.activeEvent?.boardScope === "all-time"}
          highScore={state.highScore}
          onStart={(key) => {
            if (key !== "") {
              startKeyGate.current.arm(key);
            }
            dispatch({ type: "ENTER_TYPING" });
          }}
          onSetup={() => dispatch({ type: "ENTER_SETUP" })}
          onRollingChange={setRolling}
          onHoppingChange={setHopping}
          claimShortEscape={claimShortEscape}
        />
      );
    case "typing":
      if (state.currentTest === null) {
        return null;
      }
      return landscapeOnly(
        "typing",
        <TypingScreen
          session={state.currentTest}
          ignoreHeldKey={(key) => startKeyGate.current.isBlocked(key)}
          onType={(key) => {
            const action = { type: "TYPE_KEY", ...key } as const;
            // A click for a right key and a blip for a wrong one, played now rather than after the screen
            // redraws, so the sound lands with the key. The reducer is pure, so working out the next state
            // here gives the same answer the dispatch will.
            const before = stateRef.current;
            const cue = keyCue(before.currentTest, appReducer(before, action).currentTest);
            if (cue) {
              boothSound.play(cue);
            }
            dispatch(action);
          }}
          onExpire={() => dispatch({ type: "FINISH_TEST" })}
          onSetup={() => dispatch({ type: "ENTER_SETUP" })}
          onReturnToReady={() => dispatch({ type: "ENTER_READY" })}
          claimShortEscape={claimShortEscape}
        />,
        // The gate covers Typing's logo badge, so it keeps one that does the same: tap for Ready, hold for Setup.
        { onTap: () => dispatch({ type: "ENTER_READY" }), onHold: () => dispatch({ type: "ENTER_SETUP" }) },
      );
    case "results":
      if (state.latestResult === null) {
        return null;
      }
      return landscapeOnly(
        "results",
        <ResultsScreen
          result={state.latestResult}
          standing={standing}
          saving={saving}
          onSave={(name) => {
            void leaveResults(name);
          }}
          onViewLeaderboard={() => {
            void leaveResults(null);
          }}
          onSaveAndReady={(name) => {
            void leaveResultsForReady(name);
          }}
          onSetup={() => {
            void enterSetup();
          }}
          claimShortEscape={claimShortEscape}
        />,
      );
    case "leaderboard":
      return landscapeOnly(
        "leaderboard",
        <LeaderboardScreen
          scores={leaderboardScores}
          allTimeBest={allTimeBest}
          allTime={state.activeEvent?.boardScope === "all-time"}
          currentScoreId={state.currentScoreId}
          onNextPlayer={() => {
            const event = state.activeEvent;
            if (event) {
              openReady(event).catch(() => setStatus("failed"));
            }
          }}
          onSetup={() => dispatch({ type: "ENTER_SETUP" })}
          claimShortEscape={claimShortEscape}
        />
      );
    }
  }
}

export default App;

/** The score row for a finished test, before it has a name. */
function attemptRow(
  event: EventRecord,
  test: NonNullable<AppState["currentTest"]>,
  result: NonNullable<AppState["latestResult"]>,
): NewScore & { accuracy: number } {
  return {
    eventId: event.id,
    name: null,
    eventName: event.name,
    rawWpm: result.rawWpm,
    displayedWpm: result.displayedWpm,
    accuracy: result.accuracy ?? 0,
    correctCharacters: test.correctCharacters,
    correctAttempts: test.correctAttempts,
    incorrectAttempts: test.incorrectAttempts,
    durationSeconds: test.durationSeconds,
    testMode: test.testMode,
    passageSetId: passageSetIdFor(test.testMode),
  };
}
