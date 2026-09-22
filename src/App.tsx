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
        <EventSetupScreen onStart={() => dispatch({ type: "ENTER_READY" })} />
      );
    case "ready":
      return <ReadyScreen />;
    case "typing":
      return <TypingScreen />;
    case "results":
      return <ResultsScreen />;
    case "leaderboard":
      return <LeaderboardScreen />;
  }
}

export default App;
