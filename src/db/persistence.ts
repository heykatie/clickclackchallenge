import { openDB, type IDBPDatabase } from "idb";
import { PASSAGE_SET_ID } from "../data/passages";

export type TestDuration = 30 | 60;

export interface EventRecord {
  id: string;
  durationSeconds: TestDuration;
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
const SCHEMA_VERSION = 1;

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
      upgrade(database) {
        const events = database.createObjectStore("events", { keyPath: "id" });
        events.createIndex("createdAt", "createdAt");
        events.createIndex("status", "status");

        const scores = database.createObjectStore("scores", { keyPath: "id" });
        scores.createIndex("eventId", "eventId");
        scores.createIndex("createdAt", "createdAt");

        database.createObjectStore("settings");
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

  return { settings, activeEvent: event };
}

export async function startFreshEvent(durationSeconds: TestDuration): Promise<EventRecord> {
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
    passageSetId: PASSAGE_SET_ID,
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

export async function updateEventDuration(
  eventId: string,
  durationSeconds: TestDuration,
): Promise<EventRecord> {
  const database = await openDatabase();
  const event = await database.get("events", eventId);
  if (!event || event.status !== "active") {
    throw new Error("No active event to update");
  }
  if (event.durationSeconds === durationSeconds) {
    return event;
  }

  const updated: EventRecord = {
    ...event,
    durationSeconds,
    updatedAt: new Date().toISOString(),
  };
  const transaction = database.transaction(["events", "settings"], "readwrite");
  await transaction.objectStore("events").put(updated);
  const settings = await transaction.objectStore("settings").get(SETTINGS_KEY);
  if (settings) {
    await transaction.objectStore("settings").put(
      { ...settings, lastSelectedDuration: durationSeconds },
      SETTINGS_KEY,
    );
  }
  await transaction.done;
  return updated;
}

export async function listScores(eventId: string): Promise<ScoreRecord[]> {
  const database = await openDatabase();
  return database.getAllFromIndex("scores", "eventId", eventId);
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
