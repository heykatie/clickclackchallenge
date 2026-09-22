import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import { WORD_LIST_ID } from "../data/commonWords";
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
  updateActiveEvent,
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
    testMode: "race",
    passageSetId: PASSAGE_SET_ID,
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
    expect(event.testMode).toBe("race");
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
    const updated = await updateActiveEvent(event.id, { durationSeconds: 30, testMode: "race" });

    expect(updated.id).toBe(event.id);
    expect(updated.status).toBe("active");
    expect(updated.durationSeconds).toBe(30);
    expect(updated.testMode).toBe("race");
    const database = await openDatabase();
    expect(await database.count("events")).toBe(1);

    const scores = await listScores(event.id);
    expect(scores).toEqual([earned]);
    expect(scores[0]?.durationSeconds).toBe(60);
    expect(scores[0]?.displayedWpm).toBe(46);
    expect(scores[0]?.testMode).toBe("race");
    expect(rankScores(scores).map((entry) => entry.score.displayedWpm)).toEqual([46]);
  });

  it("changes the next contestant's text without rewriting an earlier score", async () => {
    const event = await startFreshEvent(30, "race");
    const earned = await saveScore({
      ...scoreInput(event.id, 54),
      testMode: "race",
      passageSetId: PASSAGE_SET_ID,
    });
    const updated = await updateActiveEvent(event.id, { durationSeconds: 30, testMode: "words" });

    expect(updated.id).toBe(event.id);
    expect(updated.testMode).toBe("words");
    expect(updated.passageSetId).toBe(WORD_LIST_ID);
    const scores = await listScores(event.id);
    expect(scores).toEqual([earned]);
    expect(scores[0]?.displayedWpm).toBe(54);
    expect(scores[0]?.testMode).toBe("race");
    expect(scores[0]?.passageSetId).toBe(PASSAGE_SET_ID);
    expect(rankScores(scores).map((entry) => entry.score.id)).toEqual([earned.id]);
  });

  it("reads an event saved before text modes as Race and keeps its WPM", async () => {
    await openVersionOneBooth();
    const booth = await loadBooth();
    expect(booth.activeEvent).toMatchObject({
      id: "event-v1",
      testMode: "race",
      passageSetId: PASSAGE_SET_ID,
      durationSeconds: 60,
    });
    const scores = await listScores("event-v1");
    expect(scores[0]).toMatchObject({
      displayedWpm: 92,
      testMode: "race",
      passageSetId: PASSAGE_SET_ID,
      durationSeconds: 60,
    });
  });
});

function openVersionOneBooth(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      const events = database.createObjectStore("events", { keyPath: "id" });
      events.createIndex("createdAt", "createdAt");
      events.createIndex("status", "status");
      const scores = database.createObjectStore("scores", { keyPath: "id" });
      scores.createIndex("eventId", "eventId");
      scores.createIndex("createdAt", "createdAt");
      database.createObjectStore("settings");
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(["events", "scores", "settings"], "readwrite");
      transaction.objectStore("events").put({
        id: "event-v1",
        durationSeconds: 60,
        passageSetId: PASSAGE_SET_ID,
        status: "active",
        createdAt: "2026-09-22T00:00:00.000Z",
        updatedAt: "2026-09-22T00:00:00.000Z",
      });
      transaction.objectStore("scores").put({
        id: "score-v1",
        eventId: "event-v1",
        name: null,
        rawWpm: 91.6,
        displayedWpm: 92,
        accuracy: 96.4,
        correctCharacters: 229,
        correctAttempts: 241,
        incorrectAttempts: 9,
        durationSeconds: 60,
        createdAt: "2026-09-22T00:01:00.000Z",
      });
      transaction.objectStore("settings").put(
        { activeEventId: "event-v1", lastSelectedDuration: 60, schemaVersion: 1 },
        SETTINGS_KEY,
      );
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}
