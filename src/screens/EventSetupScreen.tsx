import { useState } from "react";
import type { TestDuration } from "../db/persistence";
import { durationChoice, type SetupMode } from "../state/setupRules";

type EventSetupScreenProps = {
  storedDuration: TestDuration | null;
  saving: boolean;
  onStartFresh: (durationSeconds: TestDuration) => void;
  onContinue: () => void;
};

export function EventSetupScreen({
  storedDuration,
  saving,
  onStartFresh,
  onContinue,
}: EventSetupScreenProps) {
  const [mode, setMode] = useState<SetupMode>(storedDuration === null ? "fresh" : "continue");
  const [freshDuration, setFreshDuration] = useState<TestDuration>(storedDuration ?? 30);
  const shownDuration = durationChoice(mode, storedDuration, freshDuration);
  const durationLocked = mode === "continue" && storedDuration !== null;

  function startEvent() {
    if (mode === "continue" && storedDuration !== null) {
      onContinue();
      return;
    }
    onStartFresh(freshDuration);
  }

  return (
    <main className="screen">
      <h1>Event setup</h1>
      <fieldset>
        <legend>Test length</legend>
        <label>
          <input
            type="radio"
            name="duration"
            value="30"
            checked={shownDuration === 30}
            disabled={durationLocked}
            onChange={() => setFreshDuration(30)}
          />
          30 seconds
        </label>
        <label>
          <input
            type="radio"
            name="duration"
            value="60"
            checked={shownDuration === 60}
            disabled={durationLocked}
            onChange={() => setFreshDuration(60)}
          />
          60 seconds
        </label>
      </fieldset>
      <fieldset>
        <legend>Leaderboard</legend>
        <label>
          <input
            type="radio"
            name="event-mode"
            value="fresh"
            checked={mode === "fresh"}
            onChange={() => setMode("fresh")}
          />
          Start fresh
        </label>
        <label>
          <input
            type="radio"
            name="event-mode"
            value="continue"
            checked={mode === "continue"}
            disabled={storedDuration === null}
            onChange={() => setMode("continue")}
          />
          Continue previous event
        </label>
        {storedDuration === null ? <p>No previous event yet.</p> : null}
      </fieldset>
      <button type="button" onClick={startEvent} disabled={saving}>
        START EVENT
      </button>
    </main>
  );
}
