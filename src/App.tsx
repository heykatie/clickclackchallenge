import { useEffect, useReducer, useState } from "react";
import { startFreshEvent, loadBooth, updateEventDuration, type TestDuration } from "./db/persistence";
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

  async function continueEvent(durationSeconds: TestDuration) {
    const event = state.activeEvent;
    if (!event) {
      return;
    }
    setSaving(true);
    try {
      const active =
        durationSeconds === event.durationSeconds
          ? event
          : await updateEventDuration(event.id, durationSeconds);
      dispatch({ type: "SET_ACTIVE_EVENT", event: active });
      dispatch({ type: "ENTER_READY" });
    } catch {
      setStatus("failed");
    } finally {
      setSaving(false);
    }
  }
  async function startFresh(durationSeconds: TestDuration) {
    setSaving(true);
    try {
      const event = await startFreshEvent(durationSeconds);
      dispatch({ type: "SET_ACTIVE_EVENT", event });
      dispatch({ type: "ENTER_READY" });
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
          saving={saving}
          onStartFresh={(durationSeconds) => {
            void startFresh(durationSeconds);
          }}
          onContinue={(durationSeconds) => {
            void continueEvent(durationSeconds);
          }}
        />
      );
    case "ready":
      return (
        <ReadyScreen onStart={() => dispatch({ type: "ENTER_TYPING" })} />
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
