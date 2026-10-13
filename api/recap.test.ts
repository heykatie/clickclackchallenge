import { describe, expect, it, vi } from "vitest";
import { createRecapHandler } from "./recap";

const validStats = {
  completedRounds: 23,
  averageWpm: 58.2,
  medianWpm: 53,
  averageAccuracy: 94.6,
  modeUsage: [{ mode: "story", rounds: 23, percentage: 100 }],
  durationUsage: [{ durationSeconds: 60, rounds: 23, percentage: 100 }],
  plinkoDropsWon: 4,
  plinkoWinnerPercentage: 17.4,
  roundsByHour: [{ hour: 14, rounds: 6 }, { hour: 15, rounds: 6 }],
  peakHours: [14, 15],
  peakHourRounds: 6,
};

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://clickclackchallenge.vercel.app/api/recap", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://clickclackchallenge.vercel.app", ...headers },
    body: JSON.stringify(body),
  });
}

function handler(fetchImpl = vi.fn<typeof fetch>()) {
  return createRecapHandler({
    accountId: "account",
    apiToken: "private-token",
    fetch: fetchImpl,
  });
}

const selectedFacts = {
  completedRounds: "completedRounds",
  medianWpm: "medianWpm",
  modeUsage: "modeUsage",
  plinko: "plinko",
};

describe("event recap API", () => {
  it("accepts only a same-origin request and sends only computed aggregate statistics to the model", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, result: { response: JSON.stringify({ highlights: Object.values(selectedFacts) }) } }),
    );
    const response = await handler(fetchImpl).fetch(request({ ...validStats, name: "private name" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ recap: "The event completed 23 rounds. Median speed was 53 WPM. Mode use: Story 100%. Plinko winners were 17.4% of rounds (4 wins)." });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toContain("/accounts/account/ai/run/");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer private-token");
    expect(JSON.stringify(JSON.parse(String(init?.body)))).not.toContain("private name");
    expect(JSON.parse(String(init?.body))).toMatchObject({ max_tokens: 80 });
    const providerBody = JSON.parse(String(init?.body));
    const aggregatePayload = JSON.parse(providerBody.messages[1].content);
    expect(aggregatePayload).toEqual({
      completedRounds: 23,
      averageWpm: 58.2,
      medianWpm: 53,
      averageAccuracy: 94.6,
      modeUsage: [{ mode: "story", rounds: 23, percentage: 100 }],
      durationUsage: [{ durationSeconds: 60, rounds: 23, percentage: 100 }],
      plinkoDropsWon: 4,
      plinkoWinnerPercentage: 17.4,
      roundsByHour: [{ hour: 14, rounds: 6 }, { hour: 15, rounds: 6 }],
      peakTraffic: { localHourStarts: [14, 15], roundsInEachPeakHour: 6 },
    });
  });

  it("does not return unsupported prose from the model and uses a recap built from exact local facts", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, result: { response: "The popular game session showed exceptional performance." } }),
    );
    const response = await handler(fetchImpl).fetch(request({ ...validStats, completedRounds: 1, averageWpm: 0, medianWpm: 0, averageAccuracy: 100, modeUsage: [{ mode: "famous-lines", rounds: 1, percentage: 100 }], durationUsage: [{ durationSeconds: 30, rounds: 1, percentage: 100 }], plinkoDropsWon: 0, plinkoWinnerPercentage: 0, roundsByHour: [{ hour: 15, rounds: 1 }], peakHours: [15], peakHourRounds: 1 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ recap: "The event completed 1 round. Median speed was 0 WPM, and average accuracy was 100%. Mode use: Famous Lines 100%. Plinko winners were 0% of rounds (0 wins)." });
  });

  it("ignores unavailable or unknown highlight keys and never asks the model to write free-form prose", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, result: { response: JSON.stringify({ highlights: ["peakHours", "inventedTrend"] }) } }),
    );
    const response = await handler(fetchImpl).fetch(request({ ...validStats, averageWpm: null, medianWpm: null, averageAccuracy: null, completedRounds: 0, modeUsage: [], durationUsage: [], plinkoDropsWon: 0, plinkoWinnerPercentage: 0, roundsByHour: [], peakHours: [], peakHourRounds: 0 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ recap: "The event completed 0 rounds." });
    const [, init] = fetchImpl.mock.calls[0]!;
    expect(String(init?.body)).toContain("Return only JSON with a highlights array");
  });

  it("renders tied peak hours as exact one-hour local windows", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, result: { response: JSON.stringify({ highlights: ["completedRounds", "peakHours"] }) } }),
    );
    const response = await handler(fetchImpl).fetch(request(validStats));

    expect(await response.json()).toEqual({ recap: "The event completed 23 rounds. Busiest local booth hours: 2 PM–3 PM, 3 PM–4 PM (6 rounds each)." });
  });

  it("formats one-hour windows across midnight without changing the booth clock hour", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, result: { response: JSON.stringify({ highlights: ["completedRounds", "peakHours"] }) } }),
    );
    const response = await handler(fetchImpl).fetch(request({
      completedRounds: 2,
      averageWpm: 20,
      medianWpm: 20,
      averageAccuracy: 95,
      modeUsage: [{ mode: "words", rounds: 2, percentage: 100 }],
      durationUsage: [{ durationSeconds: 60, rounds: 2, percentage: 100 }],
      plinkoDropsWon: 0,
      plinkoWinnerPercentage: 0,
      roundsByHour: [{ hour: 23, rounds: 1 }, { hour: 0, rounds: 1 }],
      peakHours: [0, 23],
      peakHourRounds: 1,
    }));

    expect(await response.json()).toEqual({ recap: "The event completed 2 rounds. Busiest local booth hours: 12 AM–1 AM, 11 PM–12 AM (1 round each)." });
  });

  it("falls back when model highlights are empty or duplicated", async () => {
    const empty = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, result: { response: JSON.stringify({ highlights: [] }) } }),
    );
    const duplicate = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, result: { response: JSON.stringify({ highlights: ["completedRounds", "completedRounds"] }) } }),
    );
    const emptyResponse = await handler(empty).fetch(request(validStats));
    const duplicateResponse = await handler(duplicate).fetch(request(validStats));

    expect(await emptyResponse.json()).toEqual({ recap: "The event completed 23 rounds. Median speed was 53 WPM, and average accuracy was 94.6%. Mode use: Story 100%. Plinko winners were 17.4% of rounds (4 wins)." });
    expect(await duplicateResponse.json()).toEqual({ recap: "The event completed 23 rounds. Median speed was 53 WPM, and average accuracy was 94.6%. Mode use: Story 100%. Plinko winners were 17.4% of rounds (4 wins)." });
  });

  it("rejects malformed aggregate data before contacting the model", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const response = await handler(fetchImpl).fetch(request({ ...validStats, plinkoDropsWon: 24 }));

    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("allows a round count when old or malformed timestamps leave the busiest hour unknown", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, result: { response: "The time could not be determined." } }),
    );
    const response = await handler(fetchImpl).fetch(request({
      completedRounds: 2,
      averageWpm: 40,
      medianWpm: 40,
      averageAccuracy: 95,
      modeUsage: [{ mode: "famous-lines", rounds: 2, percentage: 100 }],
      durationUsage: [{ durationSeconds: 30, rounds: 2, percentage: 100 }],
      plinkoDropsWon: 0,
      plinkoWinnerPercentage: 0,
      roundsByHour: [],
      peakHours: [],
      peakHourRounds: 0,
    }));

    expect(response.status).toBe(200);
  });

  it("rejects inconsistent hour breakdowns and Plinko percentages", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const invalidHours = await handler(fetchImpl).fetch(request({ ...validStats, roundsByHour: [{ hour: 14, rounds: 99 }] }));
    const invalidRate = await handler(fetchImpl).fetch(request({ ...validStats, plinkoWinnerPercentage: 90 }));
    expect(invalidHours.status).toBe(400);
    expect(invalidRate.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed when the server-side provider credentials are missing", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const response = await createRecapHandler({ accountId: "", apiToken: "", fetch: fetchImpl }).fetch(request(validStats));

    expect(response.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns a harmless unavailable response when the provider errors or returns unusable text", async () => {
    const providerError = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 429 }));
    const errorResponse = await handler(providerError).fetch(request(validStats));
    expect(errorResponse.status).toBe(502);

    const emptyResponse = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, result: { response: "  " } }),
    );
    const emptyResult = await handler(emptyResponse).fetch(request(validStats));
    expect(emptyResult.status).toBe(502);
  });

  it("does not process a request from another origin", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const response = await handler(fetchImpl).fetch(request(validStats, { origin: "https://attacker.example" }));

    expect(response.status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
