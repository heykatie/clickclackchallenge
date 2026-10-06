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
  "Name",
  "WPM",
  "Accuracy %",
  "Seconds",
  "Mode",
  "Event rank",
  "All-time rank",
  "Plinko",
  "Cleared",
];

/**
 * Every saved score as CSV, newest first, so staff can back up the iPad and look up winners later.
 * Dates are in the device's local time unless `timeZone` is given. Cleared scores are included and marked,
 * because they are still on the device; like the all-time board, the all-time rank leaves them out.
 */
export function scoresCsv(scores: readonly ScoreRecord[], events: readonly EventRecord[], timeZone?: string): string {
  const format = formatters(timeZone);
  const clearedEvents = new Set(events.filter((event) => event.hiddenAt).map((event) => event.id));

  // "Event 3 · Oct 6, 9:00 AM": events are numbered in the order they started.
  const eventLabels = new Map(
    [...events]
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((event, index) => [event.id, `Event ${index + 1} · ${format.eventStart(event.createdAt)}`]),
  );

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
      eventLabels.get(score.eventId) ?? "Unknown event",
      score.name ?? "",
      String(score.displayedWpm),
      String(Math.round(score.accuracy)),
      String(score.durationSeconds),
      MODE_LABELS[score.testMode],
      rankText(eventRanks.get(score.id)),
      rankText(allTimeRanks.get(score.id)),
      winsPlinko(score.displayedWpm, score.accuracy) ? "yes" : "no",
      clearedEvents.has(score.eventId) ? "yes" : "no",
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

function rankText(rank: number | undefined): string {
  return rank === undefined ? "" : String(rank);
}

function csvCell(value: string): string {
  // A spreadsheet runs a cell that starts with one of these as a formula, so a typed name could do harm.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
