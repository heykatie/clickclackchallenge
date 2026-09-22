import { useEffect, useReducer, useRef, useState } from "react";
import { startFreshEvent, listScores, loadBooth, passageSetIdFor, saveScore, updateActiveEvent, type EventRecord, type ScoreRecord, type TestDuration, type TestMode } from "./db/persistence";
import { highScore } from "./features/leaderboard/ranking";
import { describeAttempt, type ResultStanding } from "./features/results/resultPlacement";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { EventSetupScreen } from "./screens/EventSetupScreen";
import { ReadyScreen } from "./screens/ReadyScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { TypingScreen } from "./screens/TypingScreen";
import { appReducer, initialState } from "./state/appState";

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [saving, setSaving] = useState(false);
  const [standing, setStanding] = useState<ResultStanding | null>(null);
  const [leaderboardScores, setLeaderboardScores] = useState<ScoreRecord[]>([]);
  const [trackedScreen, setTrackedScreen] = useState(state.screen);
  const saveRequest = useRef<Promise<ScoreRecord> | null>(null);
  const savedResult = useRef<typeof state.latestResult>(null);
  if (trackedScreen !== state.screen) {
    setTrackedScreen(state.screen);
    if (state.screen !== "results") {
      setStanding(null);
    }
  }

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
    listScores(event.id).then(
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
    const top = highScore(await listScores(event.id));
    dispatch({ type: "SET_ACTIVE_EVENT", event });
    dispatch({
      type: "ENTER_READY",
      highScore: top ? { displayedWpm: top.displayedWpm, name: top.name } : null,
    });
  }

  async function continueEvent(durationSeconds: TestDuration, testMode: TestMode) {
    const event = state.activeEvent;
    if (!event) {
      return;
    }
    setSaving(true);
    try {
      const active =
        durationSeconds === event.durationSeconds && testMode === event.testMode
          ? event
          : await updateActiveEvent(event.id, { durationSeconds, testMode });
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
      setLeaderboardScores(await listScores(score.eventId));
      dispatch({ type: "SHOW_LEADERBOARD", currentScoreId: score.id });
    } catch {
      setStatus("failed");
    } finally {
      setSaving(false);
    }
  }

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
      return (
        <EventSetupScreen
          storedDuration={state.activeEvent?.durationSeconds ?? null}
          storedTestMode={state.activeEvent?.testMode ?? null}
          saving={saving}
          onStartFresh={(durationSeconds, testMode) => {
            void startFresh(durationSeconds, testMode);
          }}
          onContinue={(durationSeconds, testMode) => {
            void continueEvent(durationSeconds, testMode);
          }}
        />
      );
    case "ready":
      return (
        <ReadyScreen
          highScore={state.highScore}
          onStart={() => dispatch({ type: "ENTER_TYPING" })}
          onSetup={() => dispatch({ type: "ENTER_SETUP" })}
        />
      );
    case "typing":
      if (state.currentTest === null) {
        return null;
      }
      return (
        <TypingScreen
          session={state.currentTest}
          onType={(key) => dispatch({ type: "TYPE_KEY", ...key })}
          onExpire={() => dispatch({ type: "FINISH_TEST" })}
          onAbort={() => dispatch({ type: "RETURN_TO_READY" })}
        />
      );
    case "results":
      if (state.latestResult === null) {
        return null;
      }
      return (
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
        />
      );
    case "leaderboard":
      return (
        <LeaderboardScreen
          scores={leaderboardScores}
          currentScoreId={state.currentScoreId}
          onNextPlayer={() => {
            const event = state.activeEvent;
            if (event) {
              void openReady(event);
            }
          }}
          onSetup={() => dispatch({ type: "ENTER_SETUP" })}
        />
      );
  }
}

export default App;
