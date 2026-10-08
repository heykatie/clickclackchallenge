import { describe, expect, it, vi } from "vitest";
import { watchForServiceWorkerUpdates, type UpdateCheckEnvironment } from "./updateChecks";

function updateHarness(visible = true, online = true) {
  const windowListeners = new Map<string, EventListener>();
  const documentListeners = new Map<string, EventListener>();
  let intervalCallback: (() => void) | undefined;
  const clearInterval = vi.fn();
  const registration = { update: vi.fn().mockResolvedValue(undefined) };
  const environment = {
    window: {
      addEventListener: vi.fn((type: string, listener: EventListener) => windowListeners.set(type, listener)),
      removeEventListener: vi.fn((type: string) => windowListeners.delete(type)),
      setInterval: vi.fn((callback: () => void, _delay: number) => {
        intervalCallback = callback;
        return 1;
      }),
      clearInterval,
    },
    document: {
      visibilityState: (visible ? "visible" : "hidden") as DocumentVisibilityState,
      addEventListener: vi.fn((type: string, listener: EventListener) => documentListeners.set(type, listener)),
      removeEventListener: vi.fn((type: string) => documentListeners.delete(type)),
    },
    navigator: { onLine: online },
  };
  return {
    registration,
    environment: environment as unknown as UpdateCheckEnvironment,
    windowListeners,
    documentListeners,
    setVisible(value: boolean) {
      environment.document.visibilityState = value ? "visible" : "hidden";
    },
    setOnline(value: boolean) {
      environment.navigator.onLine = value;
    },
    tick() {
      intervalCallback?.();
    },
    clearInterval,
  };
}

describe("watchForServiceWorkerUpdates", () => {
  it("checks on registration, when the app returns to the foreground, and periodically", () => {
    const harness = updateHarness();
    const stop = watchForServiceWorkerUpdates(harness.registration, harness.environment);

    expect(harness.registration.update).toHaveBeenCalledOnce();
    expect(harness.environment.window.setInterval).toHaveBeenCalledWith(expect.any(Function), 30 * 60 * 1000);

    harness.documentListeners.get("visibilitychange")?.(new Event("visibilitychange"));
    harness.windowListeners.get("focus")?.(new Event("focus"));
    harness.tick();
    expect(harness.registration.update).toHaveBeenCalledTimes(4);

    stop();
    expect(harness.clearInterval).toHaveBeenCalledWith(1);
    expect(harness.windowListeners.size).toBe(0);
    expect(harness.documentListeners.size).toBe(0);
  });

  it("skips update checks while hidden or offline", () => {
    const harness = updateHarness(false, true);
    watchForServiceWorkerUpdates(harness.registration, harness.environment);
    expect(harness.registration.update).not.toHaveBeenCalled();

    harness.setVisible(true);
    harness.setOnline(false);
    harness.documentListeners.get("visibilitychange")?.(new Event("visibilitychange"));
    harness.windowListeners.get("focus")?.(new Event("focus"));
    harness.tick();
    expect(harness.registration.update).not.toHaveBeenCalled();

    harness.setOnline(true);
    harness.tick();
    expect(harness.registration.update).toHaveBeenCalledOnce();
  });
});
