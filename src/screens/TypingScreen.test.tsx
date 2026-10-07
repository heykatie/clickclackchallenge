// @vitest-environment jsdom
import { fakeBoothClock } from "../test/domSetup";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyTypingKey, createTestSession, type TestSession } from "../features/typing/typingEngine";
import { TypingScreen } from "./TypingScreen";

const sentences = ["Talk is cheap.", "Show me the code."];

function renderTyping(
  session: TestSession = createTestSession(sentences, 30),
  ignoreHeldKey: (key: string) => boolean = () => false,
) {
  const handlers = { onType: vi.fn(), onExpire: vi.fn(), onSetup: vi.fn(), onReturnToReady: vi.fn() };
  const view = render(
    <TypingScreen session={session} ignoreHeldKey={ignoreHeldKey} claimShortEscape={() => {}} {...handlers} />,
  );
  return { ...handlers, rerender: (next: TestSession) => view.rerender(
    <TypingScreen session={next} ignoreHeldKey={ignoreHeldKey} claimShortEscape={() => {}} {...handlers} />,
  ) };
}

function started(now: number) {
  return applyTypingKey(createTestSession(sentences, 30), { key: "T" }, now);
}

function tapLogo() {
  const logo = screen.getByRole("button", { name: "Back to start" });
  fireEvent.pointerDown(logo, { button: 0 });
  fireEvent.pointerUp(logo, { button: 0 });
}

describe("TypingScreen", () => {
  beforeEach(fakeBoothClock);

  it("shows the whole first sentence, the full time, and no accuracy before the timer starts", () => {
    renderTyping();
    const glyphs = [...document.querySelectorAll(".passage-char-glyph")].map((glyph) => glyph.textContent).join("");
    expect(glyphs).toBe("Talk is cheap.");
    expect(screen.getByText("30s")).toBeTruthy();
    expect(screen.getByText("—%")).toBeTruthy();
  });

  it("passes keys to the typing engine with their repeat flag", () => {
    const { onType } = renderTyping();
    fireEvent.keyDown(window, { key: "T" });
    fireEvent.keyDown(window, { key: "T", repeat: true });
    expect(onType.mock.calls.map(([key]) => [key.key, key.repeat])).toEqual([
      ["T", false],
      ["T", true],
    ]);
  });

  it("ignores the key still held from Ready", () => {
    const { onType } = renderTyping(createTestSession(sentences, 30), (key) => key === "x");
    fireEvent.keyDown(window, { key: "x" });
    expect(onType).not.toHaveBeenCalled();
  });

  it("returns to Ready after 8 seconds without a key that starts the timer", () => {
    const { onReturnToReady } = renderTyping();
    act(() => vi.advanceTimersByTime(7_999));
    expect(onReturnToReady).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onReturnToReady).toHaveBeenCalledOnce();
  });

  it("no longer returns to Ready on its own once the timer has started", () => {
    const { onReturnToReady } = renderTyping(started(performance.now()));
    act(() => vi.advanceTimersByTime(10_000));
    expect(onReturnToReady).not.toHaveBeenCalled();
  });

  it("finishes the test when the time runs out", () => {
    const { onExpire } = renderTyping(started(performance.now()));
    act(() => vi.advanceTimersByTime(29_000));
    expect(onExpire).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1_200));
    expect(onExpire).toHaveBeenCalled();
  });

  it("returns to Ready on a logo tap, before and after the timer starts", () => {
    const waiting = renderTyping();
    tapLogo();
    expect(waiting.onReturnToReady).toHaveBeenCalledOnce();
    expect(waiting.onSetup).not.toHaveBeenCalled();

    waiting.rerender(started(performance.now()));
    tapLogo();
    expect(waiting.onReturnToReady).toHaveBeenCalledTimes(2);
  });

  it("opens Event Setup on a logo hold", () => {
    const { onSetup, onReturnToReady } = renderTyping(started(performance.now()));
    const logo = screen.getByRole("button", { name: "Back to start" });
    fireEvent.pointerDown(logo, { button: 0 });
    act(() => vi.advanceTimersByTime(600));
    fireEvent.pointerUp(logo, { button: 0 });
    expect(onSetup).toHaveBeenCalledOnce();
    expect(onReturnToReady).not.toHaveBeenCalled();
  });

  it("labels the time and accuracy stats under their numbers, like WPM", () => {
    renderTyping();
    const labels = [...document.querySelectorAll(".stat-label")].map((label) => label.textContent);
    expect(labels).toEqual(["TIME", "ACCURACY"]);
    for (const label of ["TIME", "ACCURACY"]) {
      expect(screen.getByText(label).previousElementSibling?.className).toBe("stat-value");
    }
  });
});
