import "fake-indexeddb/auto";
import { deleteDB, openDB } from "idb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeDatabase,
  DB_NAME,
  LEGACY_DB_NAME,
  listAllScores,
  loadBooth,
  openDatabase,
} from "./persistence";

const event = {
  id: "preserved-event",
  durationSeconds: 60 as const,
  testMode: "race",
  passageSetId: "existing-set",
  status: "active" as const,
  createdAt: "2026-09-20",
  updatedAt: "2026-09-20",
};
const score = {
  id: "preserved-score",
  eventId: event.id,
  name: "Player",
  rawWpm: 52,
  displayedWpm: 52,
  accuracy: 98,
  correctCharacters: 100,
  correctAttempts: 100,
  incorrectAttempts: 2,
  durationSeconds: 60 as const,
  testMode: "race",
  passageSetId: "existing-set",
  createdAt: "2026-09-20",
};
const settings = {
  activeEventId: event.id,
  lastSelectedDuration: 60 as const,
  schemaVersion: 2,
};

async function seed(name: string, version = 2) {
  const database = await openDB(name, version, {
    upgrade(db) {
      const events = db.createObjectStore("events", { keyPath: "id" });
      events.createIndex("createdAt", "createdAt");
      events.createIndex("status", "status");
      const scores = db.createObjectStore("scores", { keyPath: "id" });
      scores.createIndex("eventId", "eventId");
      scores.createIndex("createdAt", "createdAt");
      db.createObjectStore("settings");
    },
  });
  await database.put("events", event);
  await database.put("scores", score);
  await database.put("settings", settings, "app");
  database.close();
}

describe("legacy typing-test-db migration", () => {
  beforeEach(async () => {
    await closeDatabase();
    await deleteDB(LEGACY_DB_NAME);
    await deleteDB(DB_NAME);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it("uses clickclackchallenge-db and does not create the legacy database on a fresh install", async () => {
    expect(DB_NAME).toBe("clickclackchallenge-db");
    expect(LEGACY_DB_NAME).toBe("typing-test-db");
    await openDatabase();
    const names = (await indexedDB.databases()).map((database) => database.name);
    expect(names).toContain(DB_NAME);
    expect(names).not.toContain(LEGACY_DB_NAME);
  });

  it("copies existing events, scores, and settings and keeps the legacy database unchanged", async () => {
    await seed(LEGACY_DB_NAME);
    const booth = await loadBooth();
    expect(booth.activeEvent).toMatchObject({
      id: event.id,
      testMode: "famous-lines",
      durationSeconds: 60,
    });
    expect(booth.settings.activeEventId).toBe(event.id);
    expect(await listAllScores()).toEqual([{ ...score, testMode: "famous-lines" }]);

    const legacy = await openDB(LEGACY_DB_NAME);
    expect(legacy.version).toBe(2);
    expect(await legacy.get("events", event.id)).toEqual(event);
    expect(await legacy.get("scores", score.id)).toEqual(score);
    expect(await legacy.get("settings", "app")).toEqual(settings);
    legacy.close();

    const destination = await openDatabase();
    expect(await destination.get("settings", "imported-legacy-booth")).toBeTruthy();
  });

  it("keeps newer destination records when ids collide", async () => {
    await seed(LEGACY_DB_NAME);
    await seed(DB_NAME, 3);
    const database = await openDB(DB_NAME);
    await database.put("events", {
      ...event,
      testMode: "words",
      durationSeconds: 30,
      updatedAt: "2026-10-01",
    });
    await database.put("scores", { ...score, name: "Updated", displayedWpm: 77, testMode: "words" });
    await database.put("settings", { ...settings, activeEventId: null, lastSelectedDuration: 30 }, "app");
    database.close();

    const booth = await loadBooth();
    expect(booth.activeEvent).toBeNull();
    expect(booth.settings.lastSelectedDuration).toBe(30);
    expect((await listAllScores())[0]).toMatchObject({ name: "Updated", displayedWpm: 77 });
    const destination = await openDatabase();
    expect(await destination.get("events", event.id)).toMatchObject({
      durationSeconds: 30,
      updatedAt: "2026-10-01",
    });
  });

  it("imports only once, so a later destination edit survives reopening", async () => {
    await seed(LEGACY_DB_NAME);
    const database = await openDatabase();
    await database.delete("scores", score.id);
    await closeDatabase();
    expect(await listAllScores()).toEqual([]);
    const legacy = await openDB(LEGACY_DB_NAME);
    expect(await legacy.get("scores", score.id)).toEqual(score);
    legacy.close();
  });

  it("rejects malformed legacy storage and leaves that database in place", async () => {
    const old = await openDB(LEGACY_DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore("events", { keyPath: "id" });
      },
    });
    await old.put("events", event);
    old.close();

    await expect(openDatabase()).rejects.toThrow();
    const unchanged = await openDB(LEGACY_DB_NAME);
    expect(await unchanged.get("events", event.id)).toEqual(event);
    unchanged.close();
    const names = (await indexedDB.databases()).map((database) => database.name);
    expect(names).toContain(LEGACY_DB_NAME);
  });

  it("rolls back a failed copy and retries without dropping the legacy database", async () => {
    const old = await openDB(LEGACY_DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore("events", { keyPath: "id" });
        db.createObjectStore("scores");
        db.createObjectStore("settings");
      },
    });
    await old.put("events", event);
    const { id: _missingId, ...invalidScore } = score;
    await old.put("scores", invalidScore, "invalid");
    await old.put("settings", settings, "app");
    old.close();

    await expect(openDatabase()).rejects.toThrow();
    const destination = await openDB(DB_NAME);
    expect(await destination.getAll("events")).toEqual([]);
    expect(await destination.getAll("scores")).toEqual([]);
    expect(await destination.get("settings", "app")).toBeUndefined();
    expect(await destination.get("settings", "imported-legacy-booth")).toBeUndefined();
    destination.close();

    const source = await openDB(LEGACY_DB_NAME);
    expect(await source.get("events", event.id)).toEqual(event);
    expect(await source.get("scores", "invalid")).toEqual(invalidScore);
    await source.put("scores", score, "invalid");
    source.close();

    expect((await loadBooth()).activeEvent?.id).toBe(event.id);
    expect(await listAllScores()).toHaveLength(1);
    const legacy = await openDB(LEGACY_DB_NAME);
    expect(await legacy.get("events", event.id)).toEqual(event);
    legacy.close();
  });
});
