import { describe, expect, it, vi } from "vitest";
import type { EventRecapStats } from "./eventRecap";
import { generateEventRecap } from "./recapClient";

const stats: EventRecapStats = {
  completedRounds: 8,
  averageWpm: 48.4,
  medianWpm: 45,
  averageAccuracy: 91.5,
  modeUsage: [{ mode: "story", rounds: 8, percentage: 100 }],
  durationUsage: [{ durationSeconds: 30, rounds: 8, percentage: 100 }],
  plinkoDropsWon: 2,
  plinkoWinnerPercentage: 25,
  roundsByHour: [{ hour: 13, rounds: 4 }],
  peakHours: [13],
  peakHourRounds: 4,
};

describe("generateEventRecap", () => {
  it("makes a request only when online and sends the locally computed aggregates", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ recap: "A busy afternoon." }));

    await expect(generateEventRecap(stats, fetcher, true)).resolves.toEqual({ ok: true, recap: "A busy afternoon." });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith("/api/recap", expect.objectContaining({
      method: "POST",
      body: JSON.stringify(stats),
    }));
  });

  it("does not make a request offline", async () => {
    const fetcher = vi.fn<typeof fetch>();

    await expect(generateEventRecap(stats, fetcher, false)).resolves.toEqual({ ok: false, reason: "offline" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("converts HTTP, parsing, and transport errors to a harmless unavailable result", async () => {
    const failedResponse = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 503 }));
    await expect(generateEventRecap(stats, failedResponse, true)).resolves.toEqual({ ok: false, reason: "unavailable" });

    const transportError = vi.fn<typeof fetch>().mockRejectedValue(new Error("network down"));
    await expect(generateEventRecap(stats, transportError, true)).resolves.toEqual({ ok: false, reason: "unavailable" });
  });
});
