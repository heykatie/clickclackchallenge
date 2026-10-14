import { countPlinkoWins } from "../typing/scoring";
import type { TestDuration, TestMode } from "../../db/persistence";

export type EventRecapStats = {
  completedRounds: number;
  /** Rounded to one decimal, based on the WPM value shown to contestants. */
  averageWpm: number | null;
  medianWpm: number | null;
  fastestWpm: number | null;
  /** Rounded to one decimal; rounds without accuracy are excluded from this average. */
  averageAccuracy: number | null;
  modeUsage: { mode: TestMode; rounds: number; percentage: number }[];
  durationUsage: { durationSeconds: TestDuration; rounds: number; percentage: number }[];
  plinkoDropsWon: number;
  /** Plinko-winning rounds as a percentage of all completed rounds, rounded to one decimal. */
  plinkoWinnerPercentage: number;
  /** Local device-hour buckets, including only hours with valid saved timestamps. */
  roundsByHour: { hour: number; rounds: number }[];
  /** Hour-of-day buckets in the booth device's local time. Multiple hours can tie. */
  peakHours: number[];
  peakHourRounds: number;
};

type RecapScore = {
  displayedWpm: number;
  accuracy: number | null;
  testMode: TestMode;
  durationSeconds: TestDuration;
  createdAt: string;
};

/**
 * Derive exact event facts locally. The model receives only this aggregate summary, never score rows,
 * names, or the text contestants typed. `createdAt` is written when the finished round is first saved.
 */
export function summarizeEvent(scores: readonly RecapScore[]): EventRecapStats {
  const byHour = new Array<number>(24).fill(0);
  for (const score of scores) {
    const timestamp = new Date(score.createdAt);
    if (!Number.isNaN(timestamp.getTime())) {
      byHour[timestamp.getHours()] = (byHour[timestamp.getHours()] ?? 0) + 1;
    }
  }

  const peakHourRounds = Math.max(0, ...byHour);
  const peakHours = peakHourRounds === 0
    ? []
    : byHour.flatMap((rounds, hour) => rounds === peakHourRounds ? [hour] : []);
  const roundsByHour = byHour.flatMap((rounds, hour) => rounds > 0 ? [{ hour, rounds }] : []);
  const wpms = scores.map((score) => score.displayedWpm).filter(Number.isFinite).sort((a, b) => a - b);
  const accuracies = scores
    .map((score) => score.accuracy)
    .filter((accuracy): accuracy is number => accuracy !== null && Number.isFinite(accuracy));
  const average = (values: readonly number[]) => values.length === 0
    ? null
    : Math.round(values.reduce((total, value) => total + value, 0) / values.length * 10) / 10;
  const midpoint = Math.floor(wpms.length / 2);
  const medianWpm = wpms.length === 0
    ? null
    : Math.round((wpms.length % 2 === 0
        ? ((wpms[midpoint - 1] ?? 0) + (wpms[midpoint] ?? 0)) / 2
        : (wpms[midpoint] ?? 0)) * 10) / 10;
  const plinkoDropsWon = countPlinkoWins(scores);
  const percentage = (rounds: number) => scores.length === 0 ? 0 : Math.round(rounds / scores.length * 1000) / 10;
  const modeUsage = (["words", "famous-lines", "story"] as const).flatMap((mode) => {
    const rounds = scores.filter((score) => score.testMode === mode).length;
    return rounds === 0 ? [] : [{ mode, rounds, percentage: percentage(rounds) }];
  });
  const durationUsage = ([30, 60] as const).flatMap((durationSeconds) => {
    const rounds = scores.filter((score) => score.durationSeconds === durationSeconds).length;
    return rounds === 0 ? [] : [{ durationSeconds, rounds, percentage: percentage(rounds) }];
  });

  return {
    completedRounds: scores.length,
    averageWpm: average(wpms),
    medianWpm,
    fastestWpm: wpms.length === 0 ? null : wpms[wpms.length - 1] ?? null,
    averageAccuracy: average(accuracies),
    modeUsage,
    durationUsage,
    plinkoDropsWon,
    plinkoWinnerPercentage: percentage(plinkoDropsWon),
    roundsByHour,
    peakHours,
    peakHourRounds,
  };
}

export function formatHourWindow(hour: number): string {
  const start = new Date(2020, 0, 1, hour);
  const end = new Date(2020, 0, 1, hour + 1);
  const formatter = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
  return `${formatter.format(start)}–${formatter.format(end)}`;
}

export function formatPeakHours(hours: readonly number[], completedRounds = hours.length): string {
  if (hours.length === 0) {
    return completedRounds === 0 ? "No completed rounds yet" : "Time unavailable";
  }
  return hours.map(formatHourWindow).join(", ");
}
