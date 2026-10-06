import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { requestPersistentStorage } from "./db/persistentStorage";
import { startFreshEvent, listScores, loadBooth, passageSetIdFor, saveScore, updateActiveEvent, type EventRecord, type ScoreRecord, type TestDuration, type TestMode, type BoardScope, listAllScores, listBoardScores } from "./db/persistence";
import { highScore } from "./features/leaderboard/ranking";
import { describeAttempt, type ResultStanding } from "./features/results/resultPlacement";
import { showsInPortrait, type BoothScreen } from "./pwa/boothViewport";
import { LandscapeGate } from "./pwa/LandscapeGate";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { EventSetupScreen } from "./screens/EventSetupScreen";
import { ReadyScreen } from "./screens/ReadyScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { TypingScreen } from "./screens/TypingScreen";
import { appReducer, initialState } from "./state/appState";
import { createEscapeHold, escapeHoldMs } from "./state/escapeHold";
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
  const [trackedScreen, setTrackedScreen] = useState(state.screen);
  const startKeyGate = useRef(createStartKeyGate(window));
  const saveRequest = useRef<Promise<ScoreRecord> | null>(null);
  const savedResult = useRef<typeof state.latestResult>(null);
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
        if (!cancelled) {
          setStanding(
            describeAttempt(scores, {
              eventId: event.id,
              rawWpm: result.rawWpm,
              displayedWpm: result.displayedWpm,
              accuracy: result.accuracy,
              correctCharacters: test.correctCharacters,
              correctAttempts: test.correctAttempts,
              incorrectAttempts: test.incorrectAttempts,
              durationSeconds: test.durationSeconds,
              testMode: test.testMode,
              passageSetId: passageSetIdFor(test.testMode),
            }),
          );
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

  async function continueEvent(durationSeconds: TestDuration, testMode: TestMode, boardScope: BoardScope) {
    const event = state.activeEvent;
    if (!event) {
      return;
    }
    setSaving(true);
    try {
      const active =
        durationSeconds === event.durationSeconds && testMode === event.testMode && boardScope === event.boardScope
          ? event
          : await updateActiveEvent(event.id, { durationSeconds, testMode, boardScope });
      await openReady(active);
    } catch {
      setStatus("failed");
    } finally {
      setSaving(false);
    }
  }

  async function startFresh(durationSeconds: TestDuration, testMode: TestMode) {
    setSaving(true);
    try {
      const event = await startFreshEvent(durationSeconds, testMode);
      await openReady(event);
    } catch {
      setStatus("failed");
    } finally {
      setSaving(false);
    }
  }

  async function recordScore(name: string | null): Promise<ScoreRecord> {
    if (saveRequest.current && savedResult.current === state.latestResult) {
      return saveRequest.current;
    }
    const event = state.activeEvent;
    const test = state.currentTest;
    const result = state.latestResult;
    if (!event || !test || !result || result.accuracy === null) {
      throw new Error("Result is not ready to save");
    }
    savedResult.current = result;
    const request = saveScore({
      eventId: event.id,
      name,
      rawWpm: result.rawWpm,
      displayedWpm: result.displayedWpm,
      accuracy: result.accuracy,
      correctCharacters: test.correctCharacters,
      correctAttempts: test.correctAttempts,
      incorrectAttempts: test.incorrectAttempts,
      durationSeconds: test.durationSeconds,
      testMode: test.testMode,
      passageSetId: passageSetIdFor(test.testMode),
    });
    saveRequest.current = request;
    try {
      return await request;
    } catch (error) {
      saveRequest.current = null;
      throw error;
    }
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
          storedBoardScope={state.activeEvent?.boardScope ?? null}
          saving={saving}
          updateReady={updateReady}
          onApplyUpdate={() => {
            void updateServiceWorker(true);
          }}
          onStartFresh={(durationSeconds, testMode) => {
            void startFresh(durationSeconds, testMode);
          }}
          onContinue={(durationSeconds, testMode, boardScope) => {
            void continueEvent(durationSeconds, testMode, boardScope);
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
