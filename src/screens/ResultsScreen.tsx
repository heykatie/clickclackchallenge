import { useState } from "react";
import { MAX_NAME_LENGTH, normalizeName } from "../features/results/nameRules";
import { resultCopy, type ResultStanding } from "../features/results/resultPlacement";
import type { TestResult } from "../state/appState";

type ResultsScreenProps = {
  result: TestResult;
  standing: ResultStanding | null;
  saving: boolean;
  onSave: (name: string) => void;
  onViewLeaderboard: () => void;
};

export function ResultsScreen({
  result,
  standing,
  saving,
  onSave,
  onViewLeaderboard,
}: ResultsScreenProps) {
  const [name, setName] = useState("");
  const savedName = normalizeName(name);
  const copy = standing ? resultCopy(standing, result.displayedWpm) : null;

  function saveScore() {
    if (savedName === null) {
      return;
    }
    onSave(savedName);
  }

  return (
    <main className="screen results-screen">
      {copy ? <h1>{copy.headline}</h1> : null}
      <p className="stat-value">{result.displayedWpm} WPM</p>
      <p>
        {result.displayedAccuracy === null ? "—%" : `${result.displayedAccuracy}%`} ACCURACY
      </p>
      {copy?.plinkoLine ? <p>{copy.plinkoLine}</p> : null}
      {copy?.placedLine ? <p>{copy.placedLine}</p> : null}
      {standing?.showNameEntry ? (
        <label className="name-field">
          Name
          <input
            value={name}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveScore();
              }
            }}
          />
        </label>
      ) : null}
      {standing ? (
        <div className="results-actions">
          {standing.showNameEntry ? (
            <button type="button" onClick={saveScore} disabled={saving || savedName === null}>
              SAVE SCORE
            </button>
          ) : null}
          <button type="button" onClick={onViewLeaderboard} disabled={saving}>
            VIEW LEADERBOARD
          </button>
        </div>
      ) : null}
    </main>
  );
}
