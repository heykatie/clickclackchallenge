import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import { WORD_LIST_ID } from "../data/commonWords";
import { PASSAGE_SET_ID } from "../data/passages";
import {
  clearCurrentEvent,
  hasClearedScores,
  restoreClearedScores,
  closeDatabase,
  DB_NAME,
  LEGACY_DB_NAME,
  listAllScores,
  listEverything,
  listBoardScores,
  listScores,
  loadBooth,
  openDatabase,
  saveScore,
  setSoundOn,
  setMusicOn,
  setPalette,
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
    testMode: "famous-lines",
    passageSetId: PASSAGE_SET_ID,
  };
}

describe("persistence", () => {
  beforeEach(async () => {
    await closeDatabase();
    await deleteDB(DB_NAME);
    await deleteDB(LEGACY_DB_NAME);
  });

  it("creates a fresh event with the selected duration, passage set, and no scores", async () => {
    const event = await startFreshEvent(60);
    expect(event.durationSeconds).toBe(60);
    expect(event.testMode).toBe("famous-lines");
    expect(event.passageSetId).toBe(PASSAGE_SET_ID);
    expect(event.status).toBe("active");
    expect(event.name).toBeNull();
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
    expect(await listAllScores()).toEqual([score]);

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
    const updated = await updateActiveEvent(event.id, { durationSeconds: 30, testMode: "famous-lines" });

    expect(updated.id).toBe(event.id);
    expect(updated.status).toBe("active");
    expect(updated.durationSeconds).toBe(30);
    expect(updated.testMode).toBe("famous-lines");
    const database = await openDatabase();
    expect(await database.count("events")).toBe(1);

    const scores = await listScores(event.id);
    expect(scores).toEqual([earned]);
    expect(scores[0]?.durationSeconds).toBe(60);
    expect(scores[0]?.displayedWpm).toBe(46);
    expect(scores[0]?.testMode).toBe("famous-lines");
    expect(rankScores(scores).map((entry) => entry.score.displayedWpm)).toEqual([46]);
  });

  it("refreshes a stale Famous Lines passage set without rewriting an earlier score", async () => {
    const event = await startFreshEvent(30, "famous-lines");
    const database = await openDatabase();
    await database.put("events", { ...event, passageSetId: "common-sentences-v1" });
    const earned = await saveScore({
      ...scoreInput(event.id, 40),
      passageSetId: "common-sentences-v1",
    });
    const updated = await updateActiveEvent(event.id, { durationSeconds: 30, testMode: "famous-lines" });
    expect(updated.id).toBe(event.id);
    expect(updated.passageSetId).toBe(PASSAGE_SET_ID);
    expect((await listScores(event.id))[0]).toEqual(earned);
  });

  it("changes the next contestant's text without rewriting an earlier score", async () => {
    const event = await startFreshEvent(30, "famous-lines");
    const earned = await saveScore({
      ...scoreInput(event.id, 54),
      testMode: "famous-lines",
      passageSetId: PASSAGE_SET_ID,
    });
    const updated = await updateActiveEvent(event.id, { durationSeconds: 30, testMode: "words" });

    expect(updated.id).toBe(event.id);
    expect(updated.testMode).toBe("words");
    expect(updated.passageSetId).toBe(WORD_LIST_ID);
    const scores = await listScores(event.id);
    expect(scores).toEqual([earned]);
    expect(scores[0]?.displayedWpm).toBe(54);
    expect(scores[0]?.testMode).toBe("famous-lines");
    expect(scores[0]?.passageSetId).toBe(PASSAGE_SET_ID);
    expect(rankScores(scores).map((entry) => entry.score.id)).toEqual([earned.id]);
  });

  it("starts a fresh event with a board of its own scores", async () => {
    const event = await startFreshEvent(30);
    expect(event.boardScope).toBe("event");
  });

  it("switches the active event to an all-time board and back without touching scores", async () => {
    const event = await startFreshEvent(30);
    const earned = await saveScore(scoreInput(event.id, 40));

    const allTime = await updateActiveEvent(event.id, {
      durationSeconds: 30,
      testMode: "famous-lines",
      boardScope: "all-time",
    });
    expect(allTime.id).toBe(event.id);
    expect(allTime.boardScope).toBe("all-time");
    expect((await loadBooth()).activeEvent?.boardScope).toBe("all-time");

    const changedMode = await updateActiveEvent(event.id, { durationSeconds: 60, testMode: "words" });
    expect(changedMode.boardScope).toBe("all-time");

    const back = await updateActiveEvent(event.id, { durationSeconds: 60, testMode: "words", boardScope: "event" });
    expect(back.boardScope).toBe("event");
    expect(await listScores(event.id)).toEqual([earned]);
  });

  it("loads the board's scores: the event's own, or every event's when all-time", async () => {
    const old = await startFreshEvent(30);
    const oldScore = await saveScore(scoreInput(old.id, 70));
    const current = await startFreshEvent(30);
    const currentScore = await saveScore(scoreInput(current.id, 40));

    expect(await listBoardScores(current)).toEqual([currentScore]);
    const allTime = await updateActiveEvent(current.id, {
      durationSeconds: 30,
      testMode: "famous-lines",
      boardScope: "all-time",
    });
    const board = await listBoardScores(allTime);
    expect(board.map((score) => score.id).sort()).toEqual([oldScore.id, currentScore.id].sort());
  });

  it("reads an event saved before board choices as a board of its own scores", async () => {
    await openVersionOneBooth();
    const booth = await loadBooth();
    expect(booth.activeEvent?.boardScope).toBe("event");
  });

  it("clears only the current event's scores and starts an empty event, keeping earlier events and deleting nothing", async () => {
    const first = await startFreshEvent(30);
    const earlier = await saveScore(scoreInput(first.id, 70));
    const second = await startFreshEvent(30);
    await saveScore(scoreInput(second.id, 90));

    const cleared = await clearCurrentEvent(60, "words");
    expect(cleared.id).not.toBe(second.id);
    expect(cleared).toMatchObject({ durationSeconds: 60, testMode: "words", status: "active", boardScope: "event" });
    expect((await loadBooth()).activeEvent?.id).toBe(cleared.id);

    expect(await listAllScores()).toEqual([earlier]);
    expect(await listScores(first.id)).toEqual([earlier]);
    expect(await listScores(second.id)).toEqual([]);
    expect(await listScores(cleared.id)).toEqual([]);
    const database = await openDatabase();
    expect(await database.count("scores")).toBe(2);
    expect(await database.count("events")).toBe(3);
  });

  it("stores an optional event name, trimmed and capped, with a blank name stored as none", async () => {
    const named = await startFreshEvent(30, "words", { name: "  Saturday   market  " });
    expect(named.name).toBe("Saturday market");
    expect((await loadBooth()).activeEvent?.name).toBe("Saturday market");
    expect((await startFreshEvent(30, "words", { name: "   " })).name).toBeNull();
    expect((await startFreshEvent(30, "words", { name: "x".repeat(60) })).name).toHaveLength(40);
  });

  it("renames the active event when it is continued, even with the same length and mode", async () => {
    const event = await startFreshEvent(30, "words", { name: "Pop-up" });
    const renamed = await updateActiveEvent(event.id, { durationSeconds: 30, testMode: "words", name: "Fall pop-up" });
    expect(renamed.name).toBe("Fall pop-up");
    expect((await loadBooth()).activeEvent?.name).toBe("Fall pop-up");
    const kept = await updateActiveEvent(event.id, { durationSeconds: 30, testMode: "words" });
    expect(kept.name).toBe("Fall pop-up");
  });

  it("names the empty event that Clear board starts", async () => {
    await startFreshEvent(30, "words", { name: "Test day" });
    expect((await clearCurrentEvent(30, "words", "Real day")).name).toBe("Real day");
  });

  it("reads an event saved before names existed as unnamed", async () => {
    const event = await startFreshEvent(30, "words");
    const database = await openDatabase();
    const { name: _unused, ...legacy } = event;
    await database.put("events", legacy as typeof event);
    expect((await loadBooth()).activeEvent?.name).toBeNull();
  });

  it("keeps sound off until the operator turns it on, and remembers it after the app reopens", async () => {
    expect((await loadBooth()).settings.soundOn).toBe(false);
    await setSoundOn(true);
    await closeDatabase();
    expect((await loadBooth()).settings.soundOn).toBe(true);
  });

  it("keeps the sound setting through Start fresh and Clear board", async () => {
    await setSoundOn(true);
    await startFreshEvent(30);
    expect((await loadBooth()).settings.soundOn).toBe(true);
    await clearCurrentEvent(30, "words");
    expect((await loadBooth()).settings.soundOn).toBe(true);
  });

  it("keeps music off until the operator turns it on, apart from sound, and remembers it after the app reopens", async () => {
    expect((await loadBooth()).settings.musicOn).toBe(false);
    await setMusicOn(true);
    await closeDatabase();
    const { settings } = await loadBooth();
    expect(settings.musicOn).toBe(true);
    expect(settings.soundOn).toBe(false);
    await setSoundOn(true);
    expect((await loadBooth()).settings.musicOn).toBe(true);
    await startFreshEvent(30);
    expect((await loadBooth()).settings.musicOn).toBe(true);
  });

  it("keeps the warm palette until the operator picks cool, and remembers it after the app reopens", async () => {
    expect((await loadBooth()).settings.palette).toBe("warm");
    await setPalette("cool");
    await closeDatabase();
    expect((await loadBooth()).settings.palette).toBe("cool");
    await startFreshEvent(30);
    expect((await loadBooth()).settings.palette).toBe("cool");
  });

  it("lists every score and event for a backup, cleared ones included", async () => {
    const first = await startFreshEvent(30);
    await saveScore(scoreInput(first.id, 70));
    await clearCurrentEvent(30, "famous-lines");
    const after = (await loadBooth()).activeEvent!;
    await saveScore(scoreInput(after.id, 80));

    const everything = await listEverything();
    expect(everything.scores.map((score) => score.displayedWpm).sort()).toEqual([70, 80]);
    expect(everything.events.find((event) => event.id === first.id)?.hiddenAt).not.toBeNull();
    expect(everything.events.find((event) => event.id === after.id)?.hiddenAt).toBeNull();
  });

  it("shows scores saved after the clear", async () => {
    const old = await startFreshEvent(30);
    await saveScore(scoreInput(old.id, 70));
    const cleared = await clearCurrentEvent(30, "famous-lines");
    const fresh = await saveScore(scoreInput(cleared.id, 40));

    expect(await listAllScores()).toEqual([fresh]);
    expect(await listScores(cleared.id)).toEqual([fresh]);
  });

  it("keeps cleared scores hidden after a later Start fresh or board change", async () => {
    const old = await startFreshEvent(30);
    await saveScore(scoreInput(old.id, 70));
    const cleared = await clearCurrentEvent(30, "famous-lines");
    await updateActiveEvent(cleared.id, { durationSeconds: 60, testMode: "words", boardScope: "all-time" });
    await startFreshEvent(30);

    expect(await listAllScores()).toEqual([]);
  });

  it("brings cleared scores back when their event is unhidden", async () => {
    const old = await startFreshEvent(30);
    const earned = await saveScore(scoreInput(old.id, 70));
    await clearCurrentEvent(30, "famous-lines");

    const database = await openDatabase();
    const hidden = await database.get("events", old.id);
    expect(hidden?.hiddenAt).toEqual(expect.any(String));
    await database.put("events", { ...hidden!, hiddenAt: null });
    expect(await listAllScores()).toEqual([earned]);
  });

  it("knows when there are cleared scores to restore", async () => {
    const event = await startFreshEvent(30);
    await saveScore(scoreInput(event.id, 70));
    expect(await hasClearedScores()).toBe(false);
    expect((await loadBooth()).hasClearedScores).toBe(false);
    await clearCurrentEvent(30, "famous-lines");
    expect(await hasClearedScores()).toBe(true);
    expect((await loadBooth()).hasClearedScores).toBe(true);
  });

  it("offers no restore after clearing a board nobody played, and restores past it to the last clear that hid scores", async () => {
    const played = await startFreshEvent(30);
    const earned = await saveScore(scoreInput(played.id, 70));
    await clearCurrentEvent(30, "famous-lines");
    await new Promise((resolve) => setTimeout(resolve, 5));
    // Clearing the empty board that clear started hides nothing new.
    await clearCurrentEvent(30, "famous-lines");
    expect(await hasClearedScores()).toBe(true);
    expect(await restoreClearedScores()).toBe(true);
    expect(await listAllScores()).toEqual([earned]);
    expect(await hasClearedScores()).toBe(false);

    await clearCurrentEvent(30, "words");
    expect(await hasClearedScores()).toBe(false);
    expect((await loadBooth()).hasClearedScores).toBe(false);
  });

  it("restores the scores hidden by the last clear and keeps the current event", async () => {
    const old = await startFreshEvent(30);
    const oldScore = await saveScore(scoreInput(old.id, 70));
    const cleared = await clearCurrentEvent(30, "famous-lines");
    const newScore = await saveScore(scoreInput(cleared.id, 40));

    expect(await restoreClearedScores()).toBe(true);
    expect((await listAllScores()).map((score) => score.id).sort()).toEqual([oldScore.id, newScore.id].sort());
    expect((await loadBooth()).activeEvent?.id).toBe(cleared.id);
    expect(await listScores(cleared.id)).toEqual([newScore]);
    expect(await hasClearedScores()).toBe(false);
  });

  it("restores one clear at a time, the most recent first", async () => {
    const first = await startFreshEvent(30);
    const firstScore = await saveScore(scoreInput(first.id, 70));
    const second = await clearCurrentEvent(30, "famous-lines");
    // Each clear is stamped with its own time.
    await new Promise((resolve) => setTimeout(resolve, 5));
    const secondScore = await saveScore(scoreInput(second.id, 60));
    await clearCurrentEvent(30, "famous-lines");

    await restoreClearedScores();
    expect(await listAllScores()).toEqual([secondScore]);
    await restoreClearedScores();
    expect((await listAllScores()).map((score) => score.id).sort()).toEqual([firstScore.id, secondScore.id].sort());
    expect(await restoreClearedScores()).toBe(false);
  });

  it("reads an event saved before text modes as Famous Lines and keeps its WPM", async () => {
    await openVersionOneBooth();
    const booth = await loadBooth();
    expect(booth.activeEvent).toMatchObject({
      id: "event-v1",
      testMode: "famous-lines",
      passageSetId: PASSAGE_SET_ID,
      durationSeconds: 60,
    });
    const scores = await listScores("event-v1");
    expect(scores[0]).toMatchObject({
      displayedWpm: 92,
      testMode: "famous-lines",
      passageSetId: PASSAGE_SET_ID,
      durationSeconds: 60,
    });
  });

  it("reads a stored race mode as Famous Lines and keeps its WPM", async () => {
    await openVersionTwoBooth();
    const booth = await loadBooth();
    expect(booth.activeEvent).toMatchObject({
      id: "event-v2",
      testMode: "famous-lines",
      durationSeconds: 30,
    });
    const scores = await listScores("event-v2");
    expect(scores[0]).toMatchObject({
      displayedWpm: 100,
      testMode: "famous-lines",
      durationSeconds: 30,
    });
    const database = await openDatabase();
    expect((await database.get("events", "event-v2"))?.testMode).toBe("famous-lines");
  });
});

function openVersionTwoBooth(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
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
        id: "event-v2",
        durationSeconds: 30,
        testMode: "race",
        passageSetId: "common-sentences-v1",
        status: "active",
        createdAt: "2026-09-22T00:00:00.000Z",
        updatedAt: "2026-09-22T00:00:00.000Z",
      });
      transaction.objectStore("scores").put({
        id: "score-v2",
        eventId: "event-v2",
        name: "kt",
        rawWpm: 100,
        displayedWpm: 100,
        accuracy: 98,
        correctCharacters: 250,
        correctAttempts: 250,
        incorrectAttempts: 5,
        durationSeconds: 30,
        testMode: "race",
        passageSetId: "common-sentences-v1",
        createdAt: "2026-09-22T00:01:00.000Z",
      });
      transaction.objectStore("settings").put(
        { activeEventId: "event-v2", lastSelectedDuration: 30, schemaVersion: 2 },
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
