import type { EventRecapStats } from "../src/features/recap/eventRecap";

const MODEL = "@cf/meta/llama-3.2-3b-instruct";
const MAX_REQUEST_BYTES = 2048;

type RecapHandlerDependencies = {
  accountId: string | undefined;
  apiToken: string | undefined;
  fetch: typeof fetch;
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidStats(value: unknown): value is EventRecapStats {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const input = value as Record<string, unknown>;
  const { completedRounds, averageWpm, medianWpm, averageAccuracy, modeUsage, durationUsage, plinkoDropsWon, plinkoWinnerPercentage, roundsByHour, peakHours, peakHourRounds } = input;
  if (
    !Number.isSafeInteger(completedRounds) || !Number.isSafeInteger(plinkoDropsWon) ||
    !(averageWpm === null || (typeof averageWpm === "number" && Number.isFinite(averageWpm) && averageWpm >= 0 && averageWpm <= 1000)) ||
    !(medianWpm === null || (typeof medianWpm === "number" && Number.isFinite(medianWpm) && medianWpm >= 0 && medianWpm <= 1000)) ||
    !(averageAccuracy === null || (typeof averageAccuracy === "number" && Number.isFinite(averageAccuracy) && averageAccuracy >= 0 && averageAccuracy <= 100)) ||
    typeof plinkoWinnerPercentage !== "number" || !Number.isFinite(plinkoWinnerPercentage) ||
    plinkoWinnerPercentage < 0 || plinkoWinnerPercentage > 100 ||
    !Array.isArray(modeUsage) || modeUsage.length > 3 ||
    !Array.isArray(durationUsage) || durationUsage.length > 2 ||
    !Array.isArray(roundsByHour) || roundsByHour.length > 24 ||
    !Array.isArray(peakHours) || !Number.isSafeInteger(peakHourRounds)
  ) {
    return false;
  }
  const rounds = completedRounds as number;
  const plinkoWins = plinkoDropsWon as number;
  const busiestHourRounds = peakHourRounds as number;
  const modeCounts = (modeUsage as unknown[]).map((entry) => {
    if (typeof entry !== "object" || entry === null) return null;
    const bucket = entry as Record<string, unknown>;
    return ["words", "famous-lines", "story"].includes(String(bucket.mode)) &&
      Number.isSafeInteger(bucket.rounds) && (bucket.rounds as number) > 0 &&
      typeof bucket.percentage === "number" && bucket.percentage >= 0 && bucket.percentage <= 100
      ? { mode: bucket.mode as string, rounds: bucket.rounds as number, percentage: bucket.percentage }
      : null;
  });
  const durationCounts = (durationUsage as unknown[]).map((entry) => {
    if (typeof entry !== "object" || entry === null) return null;
    const bucket = entry as Record<string, unknown>;
    return typeof bucket.durationSeconds === "number" && [30, 60].includes(bucket.durationSeconds) && Number.isSafeInteger(bucket.rounds) &&
      (bucket.rounds as number) > 0 && typeof bucket.percentage === "number" && bucket.percentage >= 0 && bucket.percentage <= 100
      ? { durationSeconds: bucket.durationSeconds as number, rounds: bucket.rounds as number, percentage: bucket.percentage }
      : null;
  });
  const hourlyCounts = (roundsByHour as unknown[]).map((entry) => {
    if (typeof entry !== "object" || entry === null) return null;
    const bucket = entry as Record<string, unknown>;
    return Number.isInteger(bucket.hour) && (bucket.hour as number) >= 0 && (bucket.hour as number) <= 23 &&
      Number.isSafeInteger(bucket.rounds) && (bucket.rounds as number) > 0
      ? { hour: bucket.hour as number, rounds: bucket.rounds as number }
      : null;
  });
  const peakCount = Math.max(0, ...hourlyCounts.flatMap((bucket) => bucket ? [bucket.rounds] : []));
  const expectedPeakHours = hourlyCounts
    .filter((bucket): bucket is { hour: number; rounds: number } => bucket !== null && bucket.rounds === peakCount)
    .map((bucket) => bucket.hour).sort((a, b) => a - b);
  const expectedPlinkoPercent = rounds === 0 ? 0 : Math.round(plinkoWins / rounds * 1000) / 10;
  const validModes = modeCounts.filter((bucket): bucket is { mode: string; rounds: number; percentage: number } => bucket !== null);
  const validDurations = durationCounts.filter((bucket): bucket is { durationSeconds: number; rounds: number; percentage: number } => bucket !== null);
  const isConsistentUsage = <T extends { rounds: number; percentage: number }>(buckets: T[], key: keyof T) =>
    buckets.reduce((sum, bucket) => sum + bucket.rounds, 0) === rounds &&
    new Set(buckets.map((bucket) => bucket[key])).size === buckets.length &&
    buckets.every((bucket) => bucket.percentage === (rounds === 0 ? 0 : Math.round(bucket.rounds / rounds * 1000) / 10));
  return (
    rounds >= 0 && plinkoWins >= 0 && plinkoWins <= rounds &&
    plinkoWinnerPercentage === expectedPlinkoPercent &&
    (rounds === 0 ? averageWpm === null && medianWpm === null && averageAccuracy === null : averageWpm !== null && medianWpm !== null) &&
    modeCounts.every((bucket) => bucket !== null) && durationCounts.every((bucket) => bucket !== null) &&
    (rounds === 0 ? modeCounts.length === 0 && durationCounts.length === 0 : isConsistentUsage(validModes, "mode") && isConsistentUsage(validDurations, "durationSeconds")) &&
    (averageAccuracy === null || (rounds > 0 && averageAccuracy >= 0 && averageAccuracy <= 100)) &&
    hourlyCounts.every((bucket) => bucket !== null) &&
    new Set(hourlyCounts.filter((bucket): bucket is { hour: number; rounds: number } => bucket !== null).map((bucket) => bucket.hour)).size === hourlyCounts.length &&
    hourlyCounts.reduce((sum, bucket) => sum + (bucket?.rounds ?? 0), 0) <= rounds &&
    peakHours.length <= 24 &&
    peakHours.every((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23) &&
    new Set(peakHours).size === peakHours.length &&
    busiestHourRounds >= 0 && busiestHourRounds <= rounds &&
    expectedPeakHours.join(",") === peakHours.slice().sort((a, b) => a - b).join(",") &&
    (expectedPeakHours.length === 0 ? busiestHourRounds === 0 : busiestHourRounds === peakCount) &&
    ((rounds === 0 && peakHours.length === 0 && busiestHourRounds === 0) ||
      (rounds > 0 && ((peakHours.length === 0 && busiestHourRounds === 0) ||
        (peakHours.length > 0 && busiestHourRounds > 0))))
  );
}

function promptFor(stats: EventRecapStats): string {
  const peakTraffic = stats.peakHours.length === 0
    ? null
    : {
        localHourStarts: stats.peakHours,
        roundsInEachPeakHour: stats.peakHourRounds,
      };
  return JSON.stringify({
    completedRounds: stats.completedRounds,
    averageWpm: stats.averageWpm,
    medianWpm: stats.medianWpm,
    averageAccuracy: stats.averageAccuracy,
    modeUsage: stats.modeUsage,
    durationUsage: stats.durationUsage,
    plinkoDropsWon: stats.plinkoDropsWon,
    plinkoWinnerPercentage: stats.plinkoWinnerPercentage,
    roundsByHour: stats.roundsByHour,
    peakTraffic,
  });
}

export function createRecapHandler(dependencies: RecapHandlerDependencies) {
  return {
    async fetch(request: Request): Promise<Response> {
      if (request.method !== "POST") {
        return json({ error: "method_not_allowed" }, 405);
      }

      const origin = request.headers.get("origin");
      if (!origin || origin !== new URL(request.url).origin) {
        return json({ error: "origin_not_allowed" }, 403);
      }

      if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
        return json({ error: "invalid_content_type" }, 415);
      }

      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (contentLength > MAX_REQUEST_BYTES) {
        return json({ error: "request_too_large" }, 413);
      }

      let body: unknown;
      try {
        const rawBody = await request.text();
        if (rawBody.length > MAX_REQUEST_BYTES) {
          return json({ error: "request_too_large" }, 413);
        }
        body = JSON.parse(rawBody);
      } catch {
        return json({ error: "invalid_json" }, 400);
      }
      if (!isValidStats(body)) {
        return json({ error: "invalid_stats" }, 400);
      }

      if (!dependencies.accountId || !dependencies.apiToken) {
        return json({ error: "recap_unavailable" }, 503);
      }

      try {
        const providerResponse = await dependencies.fetch(
          `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(dependencies.accountId)}/ai/run/${MODEL}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${dependencies.apiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: [
                {
                  role: "system",
                  content: "Write a warm, concise event recap in at most two sentences. Use only the supplied aggregate facts. You may mention the WPM and accuracy summaries, most-used mode or round length, Plinko win rate, or busiest hours. Do not invent causes, dates, participants, rankings, or other numbers, and do not recalculate or alter any supplied statistic. Hour values are local booth clock hours; describe them as one-hour windows. Use the round-by-hour breakdown only if helpful.",
                },
                { role: "user", content: promptFor(body) },
              ],
              max_tokens: 120,
            }),
            signal: AbortSignal.timeout(8_000),
          },
        );
        if (!providerResponse.ok) {
          return json({ error: "recap_unavailable" }, 502);
        }
        const data: unknown = await providerResponse.json();
        if (typeof data !== "object" || data === null) {
          return json({ error: "recap_unavailable" }, 502);
        }
        const result = (data as { result?: { response?: unknown } }).result;
        if (typeof result?.response !== "string" || result.response.trim().length === 0) {
          return json({ error: "recap_unavailable" }, 502);
        }
        return json({ recap: result.response.trim().slice(0, 280) });
      } catch {
        return json({ error: "recap_unavailable" }, 502);
      }
    },
  };
}

const handler = createRecapHandler({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
  fetch: globalThis.fetch,
});

export default handler;
