type EventSetupScreenProps = {
  onStart: () => void;
};

export function EventSetupScreen({ onStart }: EventSetupScreenProps) {
  return (
    <main className="screen">
      <h1>Event setup</h1>
      <fieldset>
        <legend>Test length</legend>
        <label>
          <input type="radio" name="duration" value="30" defaultChecked />
          30 seconds
        </label>
        <label>
          <input type="radio" name="duration" value="60" />
          60 seconds
        </label>
      </fieldset>
      <fieldset>
        <legend>Leaderboard</legend>
        <label>
          <input type="radio" name="event-mode" value="fresh" defaultChecked />
          Start fresh
        </label>
        <label>
          <input type="radio" name="event-mode" value="continue" disabled />
          Continue previous event
        </label>
        <p>No previous event yet.</p>
      </fieldset>
      <button type="button" onClick={onStart}>
        START EVENT
      </button>
    </main>
  );
}
