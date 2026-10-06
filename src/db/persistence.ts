import { openDB, type IDBPDatabase, type IDBPTransaction } from "idb";
import { WORD_LIST_ID } from "../data/commonWords";
import { PASSAGE_SET_ID } from "../data/passages";
import { STORY_ID } from "../data/story";

export type TestDuration = 30 | 60;
export type TestMode = "words" | "famous-lines" | "story";
/** Which scores the board ranks: this event's own, or every event's ever saved. Scores always save to the event. */
export type BoardScope = "event" | "all-time";

export function passageSetIdFor(testMode: TestMode): string {
  if (testMode === "words") {
    return WORD_LIST_ID;
  }
  if (testMode === "story") {
    return STORY_ID;
  }
  return PASSAGE_SET_ID;
}

export interface EventRecord {
  id: string;
  durationSeconds: TestDuration;
  testMode: TestMode;
  passageSetId: string;
  boardScope: BoardScope;
  /**
   * Set by Clear all scores. A hidden event's scores are kept on the device but left out of every
   * board, the rolling list, and the all-time best. Setting it back to null shows them again.
   */
  hiddenAt: string | null;
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
  /** Key clicks and result chimes. Off until the operator turns it on in Event Setup. Missing on older records. */
  soundOn?: boolean;
}

export interface BoothState {
  settings: AppSettings;
  activeEvent: EventRecord | null;
  /** A clear can be undone: Event Setup offers RESTORE. */
  hasClearedScores: boolean;
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

interface ClickClackChallengeDB {
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

export const DB_NAME = "clickclackchallenge-db";
/** Previous booth database. Read it during migration; do not delete or update it. */
export const LEGACY_DB_NAME = "typing-test-db";
const MIGRATION_KEY = "imported-legacy-booth";
export const SETTINGS_KEY = "app";
const SCHEMA_VERSION = 3;

let databasePromise: Promise<IDBPDatabase<ClickClackChallengeDB>> | null = null;

function defaultSettings(): AppSettings {
  return {
    activeEventId: null,
    lastSelectedDuration: 30,
    schemaVersion: SCHEMA_VERSION,
    soundOn: false,
  };
}

export function openDatabase(): Promise<IDBPDatabase<ClickClackChallengeDB>> {
  if (!databasePromise) {
    databasePromise = openDB<ClickClackChallengeDB>(DB_NAME, SCHEMA_VERSION, {
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
            transaction as IDBPTransaction<ClickClackChallengeDB, ["events", "scores"], "versionchange">,
          );
        }

        if (oldVersion < 3) {
          await renameStoredRaceMode(
            transaction as IDBPTransaction<ClickClackChallengeDB, ["events", "scores"], "versionchange">,
          );
        }
      },
      terminated() {
        databasePromise = null;
      },
    }).then(async (database) => {
      try {
        await importLegacyBooth(database);
        return database;
      } catch (error) {
        database.close();
        throw error;
      }
    }).catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function backfillTestMode(
  transaction: IDBPTransaction<ClickClackChallengeDB, ["events", "scores"], "versionchange">,
): Promise<void> {
  let eventCursor = await transaction.objectStore("events").openCursor();
  while (eventCursor) {
    if (!eventCursor.value.testMode) {
      await eventCursor.update({ ...eventCursor.value, testMode: "famous-lines" });
    }
    eventCursor = await eventCursor.continue();
  }

  let scoreCursor = await transaction.objectStore("scores").openCursor();
  while (scoreCursor) {
    const value = scoreCursor.value;
    if (!value.testMode || !value.passageSetId) {
      await scoreCursor.update({
        ...value,
        testMode: value.testMode ?? "famous-lines",
        passageSetId: value.passageSetId || PASSAGE_SET_ID,
      });
    }
    scoreCursor = await scoreCursor.continue();
  }
}

async function renameStoredRaceMode(
  transaction: IDBPTransaction<ClickClackChallengeDB, ["events", "scores"], "versionchange">,
): Promise<void> {
  let eventCursor = await transaction.objectStore("events").openCursor();
  while (eventCursor) {
    // Schema 2 stored Famous Lines as "race".
    if ((eventCursor.value as { testMode?: string }).testMode === "race") {
      await eventCursor.update({ ...eventCursor.value, testMode: "famous-lines" });
    }
    eventCursor = await eventCursor.continue();
  }

  let scoreCursor = await transaction.objectStore("scores").openCursor();
  while (scoreCursor) {
    if ((scoreCursor.value as { testMode?: string }).testMode === "race") {
      await scoreCursor.update({ ...scoreCursor.value, testMode: "famous-lines" });
    }
    scoreCursor = await scoreCursor.continue();
  }
}

async function importLegacyBooth(database: IDBPDatabase<ClickClackChallengeDB>): Promise<void> {
  if (await database.get("settings", MIGRATION_KEY)) {
    return;
  }

  let absent = false;
  const legacy = await openDB<ClickClackChallengeDB>(LEGACY_DB_NAME, undefined, {
    upgrade(_database, oldVersion, _newVersion, transaction) {
      // Opening a missing database would create it. Abort that creation.
      if (oldVersion === 0) {
        absent = true;
        void transaction.done.catch(() => undefined);
        transaction.abort();
      }
    },
  }).catch((error: unknown) => {
    if (absent) {
      return null;
    }
    throw error;
  });
  if (!legacy) {
    return;
  }

  try {
    const read = legacy.transaction(["events", "scores", "settings"]);
    const [events, scores, settings] = await Promise.all([
      read.objectStore("events").getAll(),
      read.objectStore("scores").getAll(),
      read.objectStore("settings").get(SETTINGS_KEY),
    ]);
    await read.done;

    const write = database.transaction(["events", "scores", "settings"], "readwrite");
    const done = write.done;
    try {
      if (!(await write.objectStore("settings").get(MIGRATION_KEY))) {
        for (const event of events) {
          if (!(await write.objectStore("events").get(event.id))) {
            await write.objectStore("events").put(normalizeEvent(event));
          }
        }
        for (const score of scores) {
          if (!(await write.objectStore("scores").get(score.id))) {
            await write.objectStore("scores").put(normalizeScore(score));
          }
        }
        if (settings && !(await write.objectStore("settings").get(SETTINGS_KEY))) {
          await write.objectStore("settings").put(
            { ...settings, schemaVersion: SCHEMA_VERSION },
            SETTINGS_KEY,
          );
        }
        await write.objectStore("settings").put(defaultSettings(), MIGRATION_KEY);
      }
      await done;
    } catch (error) {
      try {
        write.abort();
      } catch {
        // The transaction may already be aborting.
      }
      await done.catch(() => undefined);
      throw error;
    }
  } finally {
    legacy.close();
  }
}

function asTestMode(value: string | undefined): TestMode {
  if (value === "words" || value === "story" || value === "famous-lines") {
    return value;
  }
  return "famous-lines";
}

function normalizeEvent(event: EventRecord): EventRecord {
  const testMode = asTestMode(event.testMode);
  return {
    ...event,
    // Events saved before the board choice existed rank their own scores.
    boardScope: event.boardScope === "all-time" ? "all-time" : "event",
    hiddenAt: event.hiddenAt ?? null,
    testMode,
    passageSetId: event.passageSetId || passageSetIdFor(testMode),
  };
}

function normalizeScore(score: ScoreRecord): ScoreRecord {
  const testMode = asTestMode(score.testMode);
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
  const stored = (await database.get("settings", SETTINGS_KEY)) ?? defaultSettings();
  const settings = { ...stored, soundOn: stored.soundOn ?? false };
  if (!settings.activeEventId) {
    return { settings, activeEvent: null, hasClearedScores: await hasClearedScores() };
  }

  const event = await database.get("events", settings.activeEventId);
  if (!event || event.status !== "active") {
    const cleared = { ...settings, activeEventId: null };
    await database.put("settings", cleared, SETTINGS_KEY);
    return { settings: cleared, activeEvent: null, hasClearedScores: await hasClearedScores() };
  }

  return { settings, activeEvent: normalizeEvent(event), hasClearedScores: await hasClearedScores() };
}

export async function startFreshEvent(
  durationSeconds: TestDuration,
  testMode: TestMode = "famous-lines",
  options: { clearScores?: boolean } = {},
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
  if (options.clearScores) {
    for (const event of await events.getAll()) {
      if (!event.hiddenAt) {
        await events.put({ ...event, status: "archived", hiddenAt: now, updatedAt: now });
      }
    }
  }

  const event: EventRecord = {
    id: crypto.randomUUID(),
    durationSeconds,
    testMode,
    passageSetId: passageSetIdFor(testMode),
    boardScope: "event",
    hiddenAt: null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  const previous = await settingsStore.get(SETTINGS_KEY);
  await events.put(event);
  await settingsStore.put(
    {
      // Keep the operator's other settings, such as sound.
      ...previous,
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
  next: { durationSeconds: TestDuration; testMode: TestMode; boardScope?: BoardScope },
): Promise<EventRecord> {
  const database = await openDatabase();
  const event = await database.get("events", eventId);
  if (!event || event.status !== "active") {
    throw new Error("No active event to update");
  }
  const current = normalizeEvent(event);
  const boardScope = next.boardScope ?? current.boardScope;
  if (
    current.durationSeconds === next.durationSeconds &&
    current.testMode === next.testMode &&
    current.passageSetId === passageSetIdFor(next.testMode) &&
    current.boardScope === boardScope
  ) {
    return current;
  }

  const updated: EventRecord = {
    ...current,
    durationSeconds: next.durationSeconds,
    testMode: next.testMode,
    passageSetId: passageSetIdFor(next.testMode),
    boardScope,
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

/**
 * Hides every event, and so every score, from view and starts an empty event with the given choices.
 * Nothing is deleted: setting an event's hiddenAt back to null brings its scores back.
 */
export function clearAllScores(durationSeconds: TestDuration, testMode: TestMode): Promise<EventRecord> {
  return startFreshEvent(durationSeconds, testMode, { clearScores: true });
}

export async function hasClearedScores(): Promise<boolean> {
  const database = await openDatabase();
  return (await database.getAll("events")).some((event) => Boolean(event.hiddenAt));
}

/**
 * Undoes the most recent clear: shows again the events it hid, which share its hiddenAt time. The current
 * event stays active. Returns false when nothing is hidden. Earlier clears are restored by later calls.
 */
export async function restoreClearedScores(): Promise<boolean> {
  const database = await openDatabase();
  const transaction = database.transaction("events", "readwrite");
  const events = await transaction.store.getAll();
  const latest = events.reduce<string | null>(
    (newest, event) => (event.hiddenAt && (newest === null || event.hiddenAt > newest) ? event.hiddenAt : newest),
    null,
  );
  if (latest === null) {
    await transaction.done;
    return false;
  }
  const now = new Date().toISOString();
  for (const event of events) {
    if (event.hiddenAt === latest) {
      await transaction.store.put({ ...event, hiddenAt: null, updatedAt: now });
    }
  }
  await transaction.done;
  return true;
}

async function visibleScores(
  database: IDBPDatabase<ClickClackChallengeDB>,
  scores: readonly ScoreRecord[],
): Promise<ScoreRecord[]> {
  const hidden = new Set((await database.getAll("events")).filter((event) => event.hiddenAt).map((event) => event.id));
  return scores.filter((score) => !hidden.has(score.eventId)).map(normalizeScore);
}

export async function listScores(eventId: string): Promise<ScoreRecord[]> {
  const database = await openDatabase();
  return visibleScores(database, await database.getAllFromIndex("scores", "eventId", eventId));
}

export async function listAllScores(): Promise<ScoreRecord[]> {
  const database = await openDatabase();
  return visibleScores(database, await database.getAll("scores"));
}

export async function setSoundOn(soundOn: boolean): Promise<void> {
  const database = await openDatabase();
  const settings = (await database.get("settings", SETTINGS_KEY)) ?? defaultSettings();
  await database.put("settings", { ...settings, soundOn }, SETTINGS_KEY);
}

/** Every score and event on the device, cleared ones included, for the scores download. */
export async function listEverything(): Promise<{ scores: ScoreRecord[]; events: EventRecord[] }> {
  const database = await openDatabase();
  const [scores, events] = await Promise.all([database.getAll("scores"), database.getAll("events")]);
  return { scores: scores.map(normalizeScore), events: events.map(normalizeEvent) };
}

/** The scores the event's board ranks: its own, or every event's when the board is all-time. */
export function listBoardScores(event: EventRecord): Promise<ScoreRecord[]> {
  return event.boardScope === "all-time" ? listAllScores() : listScores(event.id);
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
