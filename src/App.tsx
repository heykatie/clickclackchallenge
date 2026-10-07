import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { requestPersistentStorage } from "./db/persistentStorage";
import { clearAllScores, hasClearedScores, restoreClearedScores, startFreshEvent, listScores, loadBooth, passageSetIdFor, saveScore, updateActiveEvent, updateScoreName, setSoundOn as saveSoundSetting, setMusicOn as saveMusicSetting, type NewScore, type EventRecord, type ScoreRecord, type TestDuration, type TestMode, type BoardScope, listAllScores, listBoardScores, listEverything } from "./db/persistence";
import { downloadTextFile } from "./features/export/downloadTextFile";
import { scoresCsv, scoresFileName } from "./features/export/scoresCsv";
import { highScore } from "./features/leaderboard/ranking";
import { countPlinkoWins } from "./features/typing/scoring";
import { describeAttempt, resultCopy, type ResultStanding } from "./features/results/resultPlacement";
import { showsInPortrait, type BoothScreen } from "./pwa/boothViewport";
import { LandscapeGate } from "./pwa/LandscapeGate";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { EventSetupScreen } from "./screens/EventSetupScreen";
import { ReadyScreen } from "./screens/ReadyScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { TypingScreen } from "./screens/TypingScreen";
import { appReducer, initialState, type AppState } from "./state/appState";
import { createEscapeHold, escapeHoldMs } from "./state/escapeHold";
import { boothMusic } from "./sound/music/musicPlayer";
import { themeForScreen } from "./sound/music/themes";
import { boothSound } from "./sound/boothSound";
import { keyCue, resultCue } from "./sound/soundCues";
import { createResultSaver } from "./state/resultSave";
import { createStartKeyGate } from "./state/startKey";

function landscapeOnly(screen: BoothScreen, screenNode: ReactNode): ReactNode {
  if (showsInPortrait(screen)) {
    return screenNode;
  }
  return <LandscapeGate>{screenNode}</LandscapeGate>;
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
  // The idle high-score list sits on top of Ready, so it is tracked apart from the screen for the music.
  const [rolling, setRolling] = useState(false);
  const [plinkoWins, setPlinkoWins] = useState<number | null>(null);
  const previousTest = useRef(state.currentTest);
  const [trackedScreen, setTrackedScreen] = useState(state.screen);
  const startKeyGate = useRef(createStartKeyGate(window));
  const resultSaver = useRef(createResultSaver(saveScore, updateScoreName));
  const shortEscapeRef = useRef<(() => void) | null>(null);
  const claimShortEscape = useCallback((handler: (() => void) | null) => {
    shortEscapeRef.current = handler;
  }, []);
  const screenRef = useRef(state.screen);
  const statusRef = useRef(status);
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
      dispatch({ type: "ENTER_SETUP" });
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
        }
      },
      // The count is a convenience: if it cannot be read, Event Setup simply leaves it out.
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [state.screen, activeEventId]);

  // A click for each right key and a blip for each wrong one, compared with the session before the key.
  useEffect(() => {
    const cue = keyCue(previousTest.current, state.currentTest);
    previousTest.current = state.currentTest;
    if (cue) {
      boothSound.play(cue);
    }
  }, [state.currentTest]);

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
      const event = await clearAllScores(durationSeconds, testMode, name);
      setCanRestore(true);
      await openReady(event);
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

  async function downloadScores() {
    try {
      const { scores, events } = await listEverything();
      downloadTextFile(scoresFileName(new Date()), scoresCsv(scores, events));
    } catch (error) {
      // A failed backup must not stop the event: the scores are still on the device.
      console.error("Could not download scores", error);
    }
  }

  async function restoreScores() {
    const event = state.activeEvent;
    setSaving(true);
    try {
      await restoreClearedScores();
      setCanRestore(await hasClearedScores());
      if (event) {
        await openReady(event);
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
    status !== "ready" ? null : themeForScreen(state.screen === "ready" && rolling ? "rolling" : state.screen);

  useEffect(() => {
    boothMusic.setEnabled(musicOn);
  }, [musicOn]);

  useEffect(() => {
    boothMusic.setTheme(musicTheme);
  }, [musicTheme]);

  useEffect(() => {
    // Browsers only start audio after a tap or key, so an app reopened with music on starts on the first one.
    const wake = () => boothMusic.wake();
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
            dispatch({ type: "TYPE_KEY", ...key });
          }}
          onExpire={() => dispatch({ type: "FINISH_TEST" })}
          onSetup={() => dispatch({ type: "ENTER_SETUP" })}
          onReturnToReady={() => dispatch({ type: "ENTER_READY" })}
          claimShortEscape={claimShortEscape}
        />,
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
          onSetup={() => dispatch({ type: "ENTER_SETUP" })}
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
