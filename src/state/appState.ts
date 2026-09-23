import { passages } from "../data/passages";
import { createWordLines } from "../data/wordLines";
import type { EventRecord } from "../db/persistence";
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

export interface HighScoreSummary {
  displayedWpm: number;
  name: string | null;
}

export interface AppState {
  screen: AppScreen;
  durationSeconds: 30 | 60;
  activeEvent: EventRecord | null;
  currentTest: TestSession | null;
  latestResult: TestResult | null;
  highScore: HighScoreSummary | null;
  currentScoreId: string | null;
}

export type AppAction =
  | { type: "SELECT_DURATION"; durationSeconds: 30 | 60 }
  | { type: "SET_ACTIVE_EVENT"; event: EventRecord }
  | { type: "ENTER_READY"; highScore?: HighScoreSummary | null }
  | { type: "ENTER_SETUP" }
  | { type: "ENTER_TYPING" }
  | { type: "TYPE_KEY"; key: string; repeat: boolean; now: number }
  | { type: "FINISH_TEST" }
  | { type: "SHOW_LEADERBOARD"; currentScoreId: string };

export const initialState: AppState = {
  screen: "setup",
  durationSeconds: 30,
  activeEvent: null,
  currentTest: null,
  latestResult: null,
  highScore: null,
  currentScoreId: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SELECT_DURATION":
      if (state.screen !== "setup") {
        return state;
      }
      return { ...state, durationSeconds: action.durationSeconds };
    case "SET_ACTIVE_EVENT":
      return {
        ...state,
        activeEvent: action.event,
        durationSeconds: action.event.durationSeconds,
      };
    case "ENTER_READY":
      return {
        ...state,
        screen: "ready",
        currentTest: null,
        latestResult: null,
        currentScoreId: null,
        highScore: action.highScore === undefined ? state.highScore : action.highScore,
      };
    case "ENTER_SETUP":
      if (state.screen === "setup") {
        return state;
      }
      return {
        ...state,
        screen: "setup",
        currentTest: null,
        latestResult: null,
        currentScoreId: null,
      };
    case "ENTER_TYPING": {
      const testMode = state.activeEvent?.testMode ?? "famous-lines";
      return {
        ...state,
        screen: "typing",
        latestResult: null,
        currentScoreId: null,
        currentTest: createTestSession(
          testMode === "words" ? createWordLines() : passages,
          state.activeEvent?.durationSeconds ?? state.durationSeconds,
          testMode,
        ),
      };
    }
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
    case "SHOW_LEADERBOARD":
      if (state.screen !== "results") {
        return state;
      }
      return {
        ...state,
        screen: "leaderboard",
        currentTest: null,
        currentScoreId: action.currentScoreId,
      };
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
