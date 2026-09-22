import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import { PASSAGE_SET_ID } from "../data/passages";
import {
  closeDatabase,
  DB_NAME,
  listScores,
  loadBooth,
  openDatabase,
  saveScore,
  SETTINGS_KEY,
  startFreshEvent,
  updateEventDuration,
  updateScoreName,
  type NewScore,
} from "./persistence";
import { rankScores } from "../features/leaderboard/ranking";

function scoreInput(eventId: string, displayedWpm: number): NewScore {
  return {
    eventId,
    name: null,
    rawWpm: displayedWpm,
    displayedWpm,
    accuracy: 96.4,
    correctCharacters: 10,
    correctAttempts: 10,
    incorrectAttempts: 0,
    durationSeconds: 30,
  };
}

describe("persistence", () => {
  beforeEach(async () => {
    await closeDatabase();
    await deleteDB(DB_NAME);
  });

  it("creates a fresh event with the selected duration, passage set, and no scores", async () => {
    const event = await startFreshEvent(60);
    expect(event.durationSeconds).toBe(60);
    expect(event.passageSetId).toBe(PASSAGE_SET_ID);
    expect(event.status).toBe("active");
    expect(event).not.toHaveProperty("name");
    expect(await listScores(event.id)).toEqual([]);

    const booth = await loadBooth();
    expect(booth.activeEvent?.id).toBe(event.id);
    expect(booth.settings.activeEventId).toBe(event.id);
    expect(booth.settings.lastSelectedDuration).toBe(60);
  });

  it("archives the previous event and keeps its scores", async () => {
    const first = await startFreshEvent(30);
    const score = await saveScore(scoreInput(first.id, 40));
    const second = await startFreshEvent(60);

    const database = await openDatabase();
    const storedFirst = await database.get("events", first.id);
    expect(storedFirst?.status).toBe("archived");
    expect(storedFirst?.durationSeconds).toBe(30);
    expect(storedFirst?.passageSetId).toBe(PASSAGE_SET_ID);
    expect(await listScores(first.id)).toEqual([score]);
    expect(await listScores(second.id)).toEqual([]);

    const booth = await loadBooth();
    expect(booth.activeEvent?.id).toBe(second.id);
    expect(booth.settings.activeEventId).toBe(second.id);
  });

  it("continues the active event without creating another one", async () => {
    const event = await startFreshEvent(30);
    await saveScore(scoreInput(event.id, 44));
    await closeDatabase();

    const restored = await loadBooth();
    const database = await openDatabase();
    expect(await database.count("events")).toBe(1);
    expect(restored.activeEvent).toMatchObject({
      id: event.id,
      durationSeconds: 30,
      passageSetId: PASSAGE_SET_ID,
      status: "active",
    });
    expect(await listScores(event.id)).toHaveLength(1);
  });

  it("leaves Continue unavailable when the active event id is missing", async () => {
    await startFreshEvent(30);
    const database = await openDatabase();
    await database.put(
      "settings",
      { activeEventId: "missing-event", lastSelectedDuration: 60, schemaVersion: 1 },
      SETTINGS_KEY,
    );
    await closeDatabase();

    const booth = await loadBooth();
    expect(booth.activeEvent).toBeNull();
    expect(booth.settings.activeEventId).toBeNull();
  });

  it("writes scores for one event and keeps a name update", async () => {
    const event = await startFreshEvent(30);
    const first = await saveScore(scoreInput(event.id, 40));
    const second = await saveScore({ ...scoreInput(event.id, 55), name: "Alex" });
    expect(first).not.toHaveProperty("meetsAccuracyThreshold");
    expect(first).not.toHaveProperty("displayedAccuracy");

    const renamed = await updateScoreName(first.id, "Sam");
    const scores = await listScores(event.id);
    expect(scores).toHaveLength(2);
    expect(scores.map((score) => score.displayedWpm).sort()).toEqual([40, 55]);
    expect(scores.find((score) => score.id === renamed.id)?.name).toBe("Sam");
    expect(scores.find((score) => score.id === second.id)?.name).toBe("Alex");
    expect(scores.every((score) => score.accuracy === 96.4)).toBe(true);
  });

  it("reads the same event after the database connection closes", async () => {
    const event = await startFreshEvent(60);
    await saveScore(scoreInput(event.id, 51));
    await closeDatabase();

    const booth = await loadBooth();
    expect(booth.activeEvent?.id).toBe(event.id);
    expect(booth.activeEvent?.durationSeconds).toBe(60);
    expect(await listScores(event.id)).toHaveLength(1);
  });

  it("changes the next contestant's duration without dropping the event's scores", async () => {
    const event = await startFreshEvent(60);
    const earned = await saveScore({
      ...scoreInput(event.id, 46),
      durationSeconds: 60,
      rawWpm: 45.8,
      displayedWpm: 46,
    });
    const updated = await updateEventDuration(event.id, 30);

    expect(updated.id).toBe(event.id);
    expect(updated.status).toBe("active");
    expect(updated.durationSeconds).toBe(30);
    const database = await openDatabase();
    expect(await database.count("events")).toBe(1);

    const scores = await listScores(event.id);
    expect(scores).toEqual([earned]);
    expect(scores[0]?.durationSeconds).toBe(60);
    expect(scores[0]?.displayedWpm).toBe(46);
    expect(rankScores(scores).map((entry) => entry.score.displayedWpm)).toEqual([46]);
  });
});
