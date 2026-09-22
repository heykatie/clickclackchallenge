import { useEffect, useReducer, useState } from "react";
import { startFreshEvent, listScores, loadBooth, updateActiveEvent, type EventRecord, type TestDuration, type TestMode } from "./db/persistence";
import { highScore } from "./features/leaderboard/ranking";
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
      return <ResultsScreen result={state.latestResult} />;
    case "leaderboard":
      return <LeaderboardScreen />;
  }
}

export default App;
