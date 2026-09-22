import { openDB, type IDBPDatabase, type IDBPTransaction } from "idb";
import { WORD_LIST_ID } from "../data/commonWords";
import { PASSAGE_SET_ID } from "../data/passages";

export type TestDuration = 30 | 60;
export type TestMode = "words" | "race";

export function passageSetIdFor(testMode: TestMode): string {
  return testMode === "words" ? WORD_LIST_ID : PASSAGE_SET_ID;
}

export interface EventRecord {
  id: string;
  durationSeconds: TestDuration;
  testMode: TestMode;
  passageSetId: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface ScoreRecord {
  id: string;
  eventId: string;
  name: string | null;
  rawWpm: number;
  displayedWpm: number;
  accuracy: number;
  correctCharacters: number;
  correctAttempts: number;
  incorrectAttempts: number;
  durationSeconds: TestDuration;
  testMode: TestMode;
  passageSetId: string;
  createdAt: string;
}

export interface AppSettings {
  activeEventId: string | null;
  lastSelectedDuration: TestDuration;
  schemaVersion: number;
}

export interface BoothState {
  settings: AppSettings;
  activeEvent: EventRecord | null;
}

export interface NewScore {
  eventId: string;
  name: string | null;
  rawWpm: number;
  displayedWpm: number;
  accuracy: number;
  correctCharacters: number;
  correctAttempts: number;
  incorrectAttempts: number;
  durationSeconds: TestDuration;
  testMode: TestMode;
  passageSetId: string;
}

interface TypingTestDB {
  events: {
    key: string;
    value: EventRecord;
    indexes: { createdAt: string; status: EventRecord["status"] };
  };
  scores: {
    key: string;
    value: ScoreRecord;
    indexes: { eventId: string; createdAt: string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

export const DB_NAME = "typing-test-db";
export const SETTINGS_KEY = "app";
const SCHEMA_VERSION = 2;

let databasePromise: Promise<IDBPDatabase<TypingTestDB>> | null = null;

function defaultSettings(): AppSettings {
  return {
    activeEventId: null,
    lastSelectedDuration: 30,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function openDatabase(): Promise<IDBPDatabase<TypingTestDB>> {
  if (!databasePromise) {
    databasePromise = openDB<TypingTestDB>(DB_NAME, SCHEMA_VERSION, {
      async upgrade(database, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          const events = database.createObjectStore("events", { keyPath: "id" });
          events.createIndex("createdAt", "createdAt");
          events.createIndex("status", "status");

          const scores = database.createObjectStore("scores", { keyPath: "id" });
          scores.createIndex("eventId", "eventId");
          scores.createIndex("createdAt", "createdAt");

          database.createObjectStore("settings");
        }

        if (oldVersion === 1) {
          await backfillTestMode(
            transaction as IDBPTransaction<TypingTestDB, ["events", "scores"], "versionchange">,
          );
        }
      },
      terminated() {
        databasePromise = null;
      },
    }).catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function backfillTestMode(
  transaction: IDBPTransaction<TypingTestDB, ["events", "scores"], "versionchange">,
): Promise<void> {
  let eventCursor = await transaction.objectStore("events").openCursor();
  while (eventCursor) {
    if (!eventCursor.value.testMode) {
      await eventCursor.update({ ...eventCursor.value, testMode: "race" });
    }
    eventCursor = await eventCursor.continue();
  }

  let scoreCursor = await transaction.objectStore("scores").openCursor();
  while (scoreCursor) {
    const value = scoreCursor.value;
    if (!value.testMode || !value.passageSetId) {
      await scoreCursor.update({
        ...value,
        testMode: value.testMode ?? "race",
        passageSetId: value.passageSetId || PASSAGE_SET_ID,
      });
    }
    scoreCursor = await scoreCursor.continue();
  }
}

function normalizeEvent(event: EventRecord): EventRecord {
  const testMode = event.testMode ?? "race";
  return {
    ...event,
    testMode,
    passageSetId: event.passageSetId || passageSetIdFor(testMode),
  };
}

function normalizeScore(score: ScoreRecord): ScoreRecord {
  const testMode = score.testMode ?? "race";
  return {
    ...score,
    testMode,
    passageSetId: score.passageSetId || passageSetIdFor(testMode),
  };
}

export async function closeDatabase(): Promise<void> {
  if (!databasePromise) {
    return;
  }
  const database = await databasePromise;
  database.close();
  databasePromise = null;
}

export async function loadBooth(): Promise<BoothState> {
  const database = await openDatabase();
  const settings = (await database.get("settings", SETTINGS_KEY)) ?? defaultSettings();
  if (!settings.activeEventId) {
    return { settings, activeEvent: null };
  }

  const event = await database.get("events", settings.activeEventId);
  if (!event || event.status !== "active") {
    const cleared = { ...settings, activeEventId: null };
    await database.put("settings", cleared, SETTINGS_KEY);
    return { settings: cleared, activeEvent: null };
  }

  return { settings, activeEvent: normalizeEvent(event) };
}

export async function startFreshEvent(
  durationSeconds: TestDuration,
  testMode: TestMode = "race",
): Promise<EventRecord> {
  const database = await openDatabase();
  const transaction = database.transaction(["events", "settings"], "readwrite");
  const events = transaction.objectStore("events");
  const settingsStore = transaction.objectStore("settings");
  const now = new Date().toISOString();
  const activeEvents = await events.index("status").getAll("active");

  for (const event of activeEvents) {
    await events.put({ ...event, status: "archived", updatedAt: now });
  }

  const event: EventRecord = {
    id: crypto.randomUUID(),
    durationSeconds,
    testMode,
    passageSetId: passageSetIdFor(testMode),
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  const previous = await settingsStore.get(SETTINGS_KEY);
  await events.put(event);
  await settingsStore.put(
    {
      activeEventId: event.id,
      lastSelectedDuration: durationSeconds,
      schemaVersion: previous?.schemaVersion ?? SCHEMA_VERSION,
    },
    SETTINGS_KEY,
  );
  await transaction.done;
  return event;
}

export async function updateActiveEvent(
  eventId: string,
  next: { durationSeconds: TestDuration; testMode: TestMode },
): Promise<EventRecord> {
  const database = await openDatabase();
  const event = await database.get("events", eventId);
  if (!event || event.status !== "active") {
    throw new Error("No active event to update");
  }
  const current = normalizeEvent(event);
  if (current.durationSeconds === next.durationSeconds && current.testMode === next.testMode) {
    return current;
  }

  const updated: EventRecord = {
    ...current,
    durationSeconds: next.durationSeconds,
    testMode: next.testMode,
    passageSetId: passageSetIdFor(next.testMode),
    updatedAt: new Date().toISOString(),
  };
  const transaction = database.transaction(["events", "settings"], "readwrite");
  await transaction.objectStore("events").put(updated);
  const settings = await transaction.objectStore("settings").get(SETTINGS_KEY);
  if (settings) {
    await transaction.objectStore("settings").put(
      { ...settings, lastSelectedDuration: next.durationSeconds },
      SETTINGS_KEY,
    );
  }
  await transaction.done;
  return updated;
}

export async function listScores(eventId: string): Promise<ScoreRecord[]> {
  const database = await openDatabase();
  const scores = await database.getAllFromIndex("scores", "eventId", eventId);
  return scores.map(normalizeScore);
}

export async function saveScore(input: NewScore): Promise<ScoreRecord> {
  const database = await openDatabase();
  const score: ScoreRecord = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await database.put("scores", score);
  return score;
}

export async function updateScoreName(
  scoreId: string,
  name: string | null,
): Promise<ScoreRecord> {
  const database = await openDatabase();
  const existing = await database.get("scores", scoreId);
  if (!existing) {
    throw new Error(`Missing score ${scoreId}`);
  }
  const updated = { ...existing, name };
  await database.put("scores", updated);
  return updated;
}
