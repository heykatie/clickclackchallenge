/**
 * Shared setup for component tests. Each component test file starts with
 * `// @vitest-environment jsdom` and imports this file first.
 */
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom has no PointerEvent. The logo badge and Ready read `button` from it.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

// jsdom has no ResizeObserver. The rolling list only needs it to exist.
if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

/** Fake every clock the screens read, including performance.now for the leave-key grace. */
export function fakeBoothClock() {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance", "Date"],
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
