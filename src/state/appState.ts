import { passages } from "../data/passages";
import {
  calculateAccuracy,
  calculateWpm,
  displayedAccuracy,
  displayedWpm,
} from "../features/typing/scoring";
import {
  applyTypingKey,
  createTestSession,
  type TestSession,
} from "../features/typing/typingEngine";

export type AppScreen =
  | "setup"
  | "ready"
  | "typing"
  | "results"
  | "leaderboard";

export interface TestResult {
  rawWpm: number;
  displayedWpm: number;
  accuracy: number | null;
  displayedAccuracy: number | null;
}

export interface AppState {
  screen: AppScreen;
  durationSeconds: 30 | 60;
  activeEvent: null;
  currentTest: TestSession | null;
  latestResult: TestResult | null;
}

export type AppAction =
  | { type: "SELECT_DURATION"; durationSeconds: 30 | 60 }
  | { type: "ENTER_READY" }
  | { type: "ENTER_TYPING" }
  | { type: "TYPE_KEY"; key: string; repeat: boolean; now: number }
  | { type: "FINISH_TEST" }
  | { type: "RETURN_TO_READY" };

export const initialState: AppState = {
  screen: "setup",
  durationSeconds: 30,
  activeEvent: null,
  currentTest: null,
  latestResult: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SELECT_DURATION":
      if (state.screen !== "setup") {
        return state;
      }
      return { ...state, durationSeconds: action.durationSeconds };
    case "ENTER_READY":
      return { ...state, screen: "ready", currentTest: null };
    case "ENTER_TYPING":
      return {
        ...state,
        screen: "typing",
        currentTest: createTestSession(passages, state.durationSeconds),
      };
    case "TYPE_KEY": {
      if (state.screen !== "typing" || state.currentTest === null) {
        return state;
      }
      const currentTest = applyTypingKey(
        state.currentTest,
        { key: action.key, repeat: action.repeat },
        action.now,
      );
      if (currentTest.isFinished) {
        return finishTest(state, currentTest);
      }
      return { ...state, currentTest };
    }
    case "FINISH_TEST":
      if (state.currentTest === null || state.currentTest.startedAt === null) {
        return state;
      }
      return finishTest(state, { ...state.currentTest, isFinished: true });
    case "RETURN_TO_READY":
      if (
        state.screen !== "typing" ||
        state.currentTest === null ||
        state.currentTest.startedAt !== null
      ) {
        return state;
      }
      return { ...state, screen: "ready", currentTest: null };
  }
}

function finishTest(state: AppState, currentTest: TestSession): AppState {
  const rawWpm = calculateWpm(
    currentTest.correctCharacters,
    currentTest.durationSeconds,
  );
  const accuracy = calculateAccuracy(
    currentTest.correctAttempts,
    currentTest.incorrectAttempts,
  );

  return {
    ...state,
    screen: "results",
    currentTest,
    latestResult: {
      rawWpm,
      displayedWpm: displayedWpm(rawWpm),
      accuracy,
      displayedAccuracy:
        accuracy === null ? null : displayedAccuracy(accuracy),
    },
  };
}
