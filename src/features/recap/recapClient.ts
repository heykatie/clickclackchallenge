import type { EventRecapStats } from "./eventRecap";

export type RecapResult =
  | { ok: true; recap: string }
  | { ok: false; reason: "offline" | "unavailable" };

/** A network-only enhancement: it never changes or blocks the locally computed event statistics. */
export async function generateEventRecap(
  stats: EventRecapStats,
  fetcher: typeof fetch = globalThis.fetch,
  online = typeof navigator === "undefined" || navigator.onLine,
): Promise<RecapResult> {
  if (!online) {
    return { ok: false, reason: "offline" };
  }

  try {
    const response = await fetcher("/api/recap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stats),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return { ok: false, reason: "unavailable" };
    }
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || typeof (body as { recap?: unknown }).recap !== "string") {
      return { ok: false, reason: "unavailable" };
    }
    const recap = (body as { recap: string }).recap.trim();
    return recap.length > 0 ? { ok: true, recap } : { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
