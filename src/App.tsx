import { useReducer } from "react";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { EventSetupScreen } from "./screens/EventSetupScreen";
import { ReadyScreen } from "./screens/ReadyScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { TypingScreen } from "./screens/TypingScreen";
import { appReducer, initialState } from "./state/appState";

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  switch (state.screen) {
    case "setup":
      return (
        <EventSetupScreen
          durationSeconds={state.durationSeconds}
          onDurationChange={(durationSeconds) =>
            dispatch({ type: "SELECT_DURATION", durationSeconds })
          }
          onStart={() => dispatch({ type: "ENTER_READY" })}
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
