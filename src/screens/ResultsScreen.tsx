import type { TestResult } from "../state/appState";

type ResultsScreenProps = {
  result: TestResult;
};

export function ResultsScreen({ result }: ResultsScreenProps) {
  return (
    <main className="screen">
      <h1>Nice typing!</h1>
      <p className="stat-value">{result.displayedWpm} WPM</p>
      <p>
        {result.displayedAccuracy === null
          ? "—%"
          : `${result.displayedAccuracy}%`}{" "}
        ACCURACY
      </p>
      {result.displayedWpm > 50 ? <p>You earned a Plinko drop!</p> : null}
    </main>
  );
}
