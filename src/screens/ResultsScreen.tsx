import { useRef, useState } from "react";
import { MAX_NAME_LENGTH, normalizeName } from "../features/results/nameRules";
import { resultCopy, type ResultStanding } from "../features/results/resultPlacement";
import type { TestResult } from "../state/appState";

type ResultsScreenProps = {
  result: TestResult;
  standing: ResultStanding | null;
  saving: boolean;
  onSave: (name: string) => void;
  onViewLeaderboard: () => void;
  onSetup: () => void;
};

export function ResultsScreen({
  result,
  standing,
  saving,
  onSave,
  onViewLeaderboard,
  onSetup,
}: ResultsScreenProps) {
  const [name, setName] = useState("");
  const holdTimer = useRef<number | null>(null);
  const savedName = normalizeName(name);
  const copy = standing ? resultCopy(standing, result.displayedWpm) : null;

  function saveScore() {
    if (savedName === null) {
      return;
    }
    onSave(savedName);
  }

  function beginHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
    }
    holdTimer.current = window.setTimeout(onSetup, 600);
  }

  function endHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  return (
    <main className="screen results-screen">
      <button
        type="button"
        className="logo-badge"
        aria-label="Logo"
        onPointerDown={beginHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
      />
      {copy ? <h1>{copy.headline}</h1> : null}
      <p className="stat-value">{result.displayedWpm} WPM</p>
      <p>
        {result.displayedAccuracy === null ? "—%" : `${result.displayedAccuracy}%`} ACCURACY
      </p>
      {copy?.plinkoLine ? <p className="result-pill result-plinko">{copy.plinkoLine}</p> : null}
      {copy?.placedLine ? <p className="result-pill result-place">{copy.placedLine}</p> : null}
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
