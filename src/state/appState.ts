export type AppScreen =
  | "setup"
  | "ready"
  | "typing"
  | "results"
  | "leaderboard";

export interface AppState {
  screen: AppScreen;
  activeEvent: null;
  currentTest: null;
  latestResult: null;
}

export type AppAction = { type: "ENTER_READY" };

export const initialState: AppState = {
  screen: "setup",
  activeEvent: null,
  currentTest: null,
  latestResult: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "ENTER_READY":
      return { ...state, screen: "ready" };
  }
}
