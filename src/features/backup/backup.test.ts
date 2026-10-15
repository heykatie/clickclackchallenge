import { describe, expect, it } from "vitest";
import type { AppSettings, EventRecord, ScoreRecord } from "../../db/persistence";
import { BACKUP_FORMAT, BACKUP_VERSION, backupFileName, createBackup, parseBackup } from "./backup";

const event: EventRecord = {
  id: "event-1",
  durationSeconds: 30,
  testMode: "words",
  passageSetId: "words-v1",
  boardScope: "event",
  hiddenAt: null,
  name: "Maker Faire",
  status: "active",
  createdAt: "2026-10-14T17:00:00.000Z",
  updatedAt: "2026-10-14T17:00:00.000Z",
};

const score: ScoreRecord = {
  id: "score-1",
  eventId: "event-1",
  name: "Mochi",
  eventName: "Maker Faire",
  rawWpm: 88.2,
  displayedWpm: 88,
  accuracy: 97,
  correctCharacters: 220,
  correctAttempts: 228,
  incorrectAttempts: 7,
  durationSeconds: 30,
  testMode: "words",
  passageSetId: "words-v1",
  createdAt: "2026-10-14T17:05:00.000Z",
};

const settings: AppSettings = { activeEventId: "event-1", lastSelectedDuration: 30, schemaVersion: 3, soundOn: true };

describe("backup", () => {
  it("round-trips every event, score, and setting exactly", () => {
    const backup = createBackup({ events: [event], scores: [score], settings }, new Date("2026-10-15T09:00:00.000Z"));
    expect(backup).toMatchObject({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: "2026-10-15T09:00:00.000Z" });
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed).toEqual({ ok: true, backup });
  });

  it("reads a file saved with a byte-order mark, as the download helper writes it", () => {
    const backup = createBackup({ events: [event], scores: [score], settings }, new Date());
    expect(parseBackup(`﻿${JSON.stringify(backup)}`).ok).toBe(true);
  });

  it("names the file with the local date", () => {
    expect(backupFileName(new Date(2026, 9, 15, 9))).toBe("clickclackchallenge-backup-2026-10-15.json");
  });

  it("rejects anything that is not a valid backup, and says so", () => {
    const valid = createBackup({ events: [event], scores: [score], settings }, new Date());
    const cases: string[] = [
      "not json",
      "date,name,wpm\n1,2,3",
      JSON.stringify({ ...valid, format: "something-else" }),
      JSON.stringify({ ...valid, version: BACKUP_VERSION + 1 }),
      JSON.stringify({ ...valid, events: "nope" }),
      JSON.stringify({ ...valid, scores: [{ ...score, displayedWpm: "fast" }] }),
      JSON.stringify({ ...valid, scores: [{ ...score, id: undefined }] }),
      JSON.stringify({ ...valid, events: [{ ...event, testMode: "poetry" }] }),
      // A score whose event is missing from the file would show on no board.
      JSON.stringify({ ...valid, scores: [{ ...score, eventId: "elsewhere" }] }),
    ];
    for (const text of cases) {
      const parsed = parseBackup(text);
      expect(parsed.ok, text.slice(0, 60)).toBe(false);
      if (!parsed.ok) expect(parsed.reason).toBe("That file isn’t a clickclackchallenge backup.");
    }
  });
});
