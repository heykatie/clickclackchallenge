import type { AppSettings, EventRecord, ScoreRecord } from "../../db/persistence";

/**
 * A full backup of the booth: every event and score exactly as stored, plus the device settings, as one JSON file.
 * Unlike the scores CSV (a report for people), a backup can be restored onto this or another device.
 */
export const BACKUP_FORMAT = "clickclackchallenge-backup";
export const BACKUP_VERSION = 1;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  events: EventRecord[];
  scores: ScoreRecord[];
  settings: AppSettings | null;
}

export type ParsedBackup = { ok: true; backup: Backup } | { ok: false; reason: string };

const NOT_A_BACKUP = "That file isn’t a clickclackchallenge backup.";
const MODES = new Set(["words", "famous-lines", "story"]);
const DURATIONS = new Set([30, 60]);

export function createBackup(
  data: { events: EventRecord[]; scores: ScoreRecord[]; settings: AppSettings | null },
  now: Date,
): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    events: data.events,
    scores: data.scores,
    settings: data.settings,
  };
}

export function backupFileName(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `clickclackchallenge-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isText = (value: unknown) => typeof value === "string" && value.length > 0;
const isNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const isOptionalText = (value: unknown) => value === undefined || value === null || typeof value === "string";

function isEvent(value: unknown): value is EventRecord {
  return (
    isRecord(value) &&
    isText(value.id) &&
    DURATIONS.has(value.durationSeconds as number) &&
    MODES.has(value.testMode as string) &&
    isText(value.createdAt) &&
    isOptionalText(value.name) &&
    isOptionalText(value.hiddenAt)
  );
}

function isScore(value: unknown): value is ScoreRecord {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.eventId) &&
    isOptionalText(value.name) &&
    isNumber(value.rawWpm) &&
    isNumber(value.displayedWpm) &&
    isNumber(value.accuracy) &&
    DURATIONS.has(value.durationSeconds as number) &&
    MODES.has(value.testMode as string) &&
    isText(value.createdAt)
  );
}

/**
 * Reads a backup file's text. Anything that is not a well-formed backup of a version this app understands is
 * refused with one plain reason, so a wrong or damaged file never half-restores.
 */
export function parseBackup(text: string): ParsedBackup {
  let value: unknown;
  try {
    // The download helper writes a byte-order mark first, for spreadsheets; JSON does not allow one.
    value = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    return { ok: false, reason: NOT_A_BACKUP };
  }
  if (
    !isRecord(value) ||
    value.format !== BACKUP_FORMAT ||
    !isNumber(value.version) ||
    (value.version as number) > BACKUP_VERSION ||
    !Array.isArray(value.events) ||
    !Array.isArray(value.scores) ||
    !value.events.every(isEvent) ||
    !value.scores.every(isScore)
  ) {
    return { ok: false, reason: NOT_A_BACKUP };
  }
  const eventIds = new Set(value.events.map((event) => event.id));
  if (!value.scores.every((score) => eventIds.has(score.eventId))) {
    return { ok: false, reason: NOT_A_BACKUP };
  }
  return { ok: true, backup: value as unknown as Backup };
}
