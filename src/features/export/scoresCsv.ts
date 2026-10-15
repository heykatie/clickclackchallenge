import type { EventRecord, ScoreRecord, TestMode } from "../../db/persistence";
import { rankScores } from "../leaderboard/ranking";
import { winsPlinko } from "../typing/scoring";

const MODE_LABELS: Record<TestMode, string> = {
  words: "Standard",
  "famous-lines": "Famous Lines",
  story: "Story",
};

const HEADER = [
  "Date",
  "Time",
  "Event",
  "Event started",
  "Event name",
  "Name",
  "WPM",
  "Accuracy %",
  "Seconds",
  "Mode",
  "Event rank",
  "All-time rank",
  "Plinko",
  "Cleared",
  // Detail columns, for anyone checking or analyzing the scores.
  "Exact WPM",
  "Exact accuracy %",
  "Correct characters",
  "Correct keystrokes",
  "Wrong keystrokes",
  "Time taken (s)",
  "Passage set",
  "Device",
  "Restored on",
  "Cleared on",
];

/**
 * Every saved score as CSV, newest first, so staff can back up the iPad and look up winners later.
 * Dates are in the device's local time unless `timeZone` is given. Cleared scores are included and marked,
 * because they are still on the device; like the all-time board, the all-time rank leaves them out.
 */
export function scoresCsv(scores: readonly ScoreRecord[], events: readonly EventRecord[], timeZone?: string): string {
  const format = formatters(timeZone);
  const clearedAt = new Map(events.filter((event) => event.hiddenAt).map((event) => [event.id, event.hiddenAt as string]));
  const clearedEvents = new Set(clearedAt.keys());

  // Events are numbered in the order they started: "Event 3". The operator's name, if any, has its own column.
  const eventInfo = new Map(
    [...events]
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((event, index) => [
        event.id,
        { number: `Event ${index + 1}`, started: format.eventStart(event.createdAt), name: event.name ?? "" },
      ]),
  );
  const unknownEvent = { number: "Unknown event", started: "", name: "" };

  const eventRanks = new Map<string, number>();
  for (const eventId of new Set(scores.map((score) => score.eventId))) {
    for (const ranked of rankScores(scores.filter((score) => score.eventId === eventId))) {
      eventRanks.set(ranked.score.id, ranked.rank);
    }
  }
  const allTimeRanks = new Map(
    rankScores(scores.filter((score) => !clearedEvents.has(score.eventId))).map((ranked) => [ranked.score.id, ranked.rank]),
  );

  const rows = [...scores]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((score) => [
      format.date(score.createdAt),
      format.time(score.createdAt),
      (eventInfo.get(score.eventId) ?? unknownEvent).number,
      (eventInfo.get(score.eventId) ?? unknownEvent).started,
      // The name set when the score was played, blank if there was none. Scores saved before scores kept their
      // own name have no such field, so they fall back to the event's name.
      score.eventName === undefined ? (eventInfo.get(score.eventId) ?? unknownEvent).name : (score.eventName ?? ""),
      score.name ?? "",
      String(score.displayedWpm),
      String(Math.round(score.accuracy)),
      String(score.durationSeconds),
      MODE_LABELS[score.testMode],
      rankText(eventRanks.get(score.id)),
      rankText(allTimeRanks.get(score.id)),
      winsPlinko(score.displayedWpm, score.accuracy) ? "yes" : "no",
      clearedEvents.has(score.eventId) ? "yes" : "no",
      score.rawWpm.toFixed(2),
      score.accuracy.toFixed(2),
      String(score.correctCharacters),
      String(score.correctAttempts),
      String(score.incorrectAttempts),
      timeTaken(score).toFixed(1),
      score.passageSetId,
      score.device ?? "",
      score.restoredAt ? format.eventStart(score.restoredAt) : "",
      clearedAt.has(score.eventId) ? format.eventStart(clearedAt.get(score.eventId) as string) : "",
    ]);

  return [HEADER, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** "clickclackchallenge-scores-2026-10-06.csv", dated by the device's local day. */
export function scoresFileName(now: Date): string {
  const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
  return `clickclackchallenge-scores-${day}.csv`;
}

function formatters(timeZone: string | undefined) {
  const make = (options: Intl.DateTimeFormatOptions) => {
    const formatter = new Intl.DateTimeFormat("en-US", { ...options, timeZone });
    // Newer browsers put a narrow no-break space before AM/PM; a plain space reads the same everywhere.
    return (iso: string) => formatter.format(new Date(iso)).replace(/ /g, " ");
  };
  return {
    date: make({ weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    time: make({ hour: "numeric", minute: "2-digit" }),
    eventStart: make({ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
  };
}

/**
 * Seconds the round actually ran. WPM is (characters / 5) per minute, so the time follows from the two; it is
 * shorter than the round length only when a Story was finished early. With nothing typed, it is the round length.
 */
function timeTaken(score: ScoreRecord): number {
  return score.rawWpm > 0 && score.correctCharacters > 0
    ? Math.min(score.durationSeconds, (score.correctCharacters * 12) / score.rawWpm)
    : score.durationSeconds;
}

function rankText(rank: number | undefined): string {
  return rank === undefined ? "" : String(rank);
}

function csvCell(value: string): string {
  // A spreadsheet runs a cell that starts with one of these as a formula, so a typed name could do harm.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
