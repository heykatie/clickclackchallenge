import type { EventRecord, ScoreRecord, TestMode } from "../../db/persistence";
import { rankScores } from "../leaderboard/ranking";
import { winsPlinko } from "../typing/scoring";

const MODE_LABELS: Record<TestMode, string> = {
  words: "Standard",
  "famous-lines": "Famous Lines",
  story: "Story",
};

const HEADER = ["Saved at", "Event", "Name", "WPM", "Accuracy %", "Seconds", "Mode", "Event rank", "Plinko", "Cleared"];

/**
 * Every saved score as CSV, newest first, so staff can back up the iPad and look up winners later.
 * Cleared scores are included and marked, because they are still on the device.
 */
export function scoresCsv(scores: readonly ScoreRecord[], events: readonly EventRecord[]): string {
  const clearedEvents = new Set(events.filter((event) => event.hiddenAt).map((event) => event.id));
  const ranks = new Map<string, number>();
  for (const eventId of new Set(scores.map((score) => score.eventId))) {
    for (const ranked of rankScores(scores.filter((score) => score.eventId === eventId))) {
      ranks.set(ranked.score.id, ranked.rank);
    }
  }

  const rows = [...scores]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((score) => [
      score.createdAt,
      score.eventId,
      score.name ?? "",
      String(score.displayedWpm),
      String(Math.round(score.accuracy)),
      String(score.durationSeconds),
      MODE_LABELS[score.testMode],
      ranks.has(score.id) ? String(ranks.get(score.id)) : "",
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

function csvCell(value: string): string {
  // A spreadsheet runs a cell that starts with one of these as a formula, so a typed name could do harm.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
