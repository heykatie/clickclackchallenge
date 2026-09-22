import { describe, expect, it } from "vitest";
import { calculateAccuracy } from "./scoring";
import {
  applyTypingKey,
  createTestSession,
  currentWordBounds,
  remainingSeconds,
  type TestSession,
} from "./typingEngine";

function type(session: TestSession, keys: string, now = 0): TestSession {
  let next = session;
  for (const key of keys) {
    next = applyTypingKey(next, { key }, now);
  }
  return next;
}

describe("typing engine", () => {
  it("starts with no scored input, so a Ready key is not part of the test", () => {
    const session = createTestSession(["house"], 30);
    expect(session.correctAttempts).toBe(0);
    expect(session.incorrectAttempts).toBe(0);
    expect(session.startedAt).toBeNull();
  });

  it("starts the timer and scores the first printable character", () => {
    const session = type(createTestSession(["house"], 30), "h", 1000);
    expect(session.startedAt).toBe(1000);
    expect(session.endsAt).toBe(31_000);
    expect(session.correctAttempts).toBe(1);
    expect(session.characterIndex).toBe(1);
  });

  it("lets space or punctuation be that first key", () => {
    const space = type(createTestSession([" "], 30), " ", 5);
    const punctuation = type(createTestSession(["."], 30), ".", 5);
    expect(space.startedAt).toBe(5);
    expect(space.correctAttempts).toBe(1);
    expect(punctuation.startedAt).toBe(5);
    expect(punctuation.correctAttempts).toBe(1);
  });

  it("does not start the timer for Shift or a function key", () => {
    const session = createTestSession(["house"], 30);
    const shifted = applyTypingKey(session, { key: "Shift" }, 1000);
    const functionKey = applyTypingKey(shifted, { key: "F5" }, 1000);
    expect(functionKey.startedAt).toBeNull();
    expect(functionKey.correctAttempts).toBe(0);
  });

  it("ignores a repeated key event and still counts a separate press", () => {
    const session = createTestSession(["aa"], 30);
    const first = applyTypingKey(session, { key: "a" }, 0);
    const repeated = applyTypingKey(first, { key: "a", repeat: true }, 10);
    const second = applyTypingKey(repeated, { key: "a" }, 20);
    expect(repeated.correctAttempts).toBe(1);
    expect(second.correctAttempts).toBe(2);
  });

  it("advances the caret for a correct character and for an incorrect one", () => {
    const session = type(createTestSession(["house"], 30), "hx");
    expect(session.characterIndex).toBe(2);
    expect(session.typedCharacters[0]?.isCorrect).toBe(true);
    expect(session.typedCharacters[1]?.isCorrect).toBe(false);
  });

  it("does not block a later correct character after an error", () => {
    const session = type(createTestSession(["house"], 30), "hxu");
    expect(session.typedCharacters.map((character) => character.isCorrect)).toEqual([
      true,
      false,
      true,
    ]);
  });

  it("moves Backspace backward and does not change accuracy attempts", () => {
    const typed = type(createTestSession(["house"], 30), "hx");
    const accuracyBefore = calculateAccuracy(
      typed.correctAttempts,
      typed.incorrectAttempts,
    );
    const erased = applyTypingKey(typed, { key: "Backspace" }, 10);
    expect(erased.characterIndex).toBe(1);
    expect(erased.typedCharacters).toHaveLength(1);
    expect(erased.correctAttempts).toBe(typed.correctAttempts);
    expect(erased.incorrectAttempts).toBe(typed.incorrectAttempts);
    expect(
      calculateAccuracy(erased.correctAttempts, erased.incorrectAttempts),
    ).toBe(accuracyBefore);
  });

  it("removes correct-character credit and restores it when that position is retyped", () => {
    const typed = type(createTestSession(["house"], 30), "h");
    const erased = applyTypingKey(typed, { key: "Backspace" }, 10);
    const retyped = applyTypingKey(erased, { key: "h" }, 20);
    expect(erased.correctCharacters).toBe(0);
    expect(retyped.correctCharacters).toBe(1);
    expect(retyped.correctAttempts).toBe(2);
  });

  it("keeps the original incorrect attempt after the character is corrected", () => {
    const typed = type(createTestSession(["house"], 30), "hx");
    const erased = applyTypingKey(typed, { key: "Backspace" }, 10);
    const corrected = applyTypingKey(erased, { key: "o" }, 20);
    expect(corrected.incorrectAttempts).toBe(1);
    expect(corrected.correctCharacters).toBe(2);
  });

  it("does not let Backspace pass the start of the sentence", () => {
    const session = type(createTestSession(["house"], 30), "h");
    const once = applyTypingKey(session, { key: "Backspace" }, 10);
    const twice = applyTypingKey(once, { key: "Backspace" }, 20);
    expect(twice.characterIndex).toBe(0);
    expect(twice.typedCharacters).toHaveLength(0);
  });

  it("does not let Backspace start the timer", () => {
    const session = applyTypingKey(
      createTestSession(["house"], 30),
      { key: "Backspace" },
      1000,
    );
    expect(session.startedAt).toBeNull();
  });

  it("completes a sentence after every position is typed, including a wrong final character", () => {
    const correct = type(createTestSession(["ab", "cd"], 30), "ab");
    const incorrect = type(createTestSession(["ab", "cd"], 30), "ax");
    expect(correct.expectedSentence).toBe("cd");
    expect(correct.correctAttempts).toBe(2);
    expect(incorrect.expectedSentence).toBe("cd");
    expect(incorrect.correctAttempts).toBe(1);
    expect(incorrect.incorrectAttempts).toBe(1);
  });

  it("keeps cumulative counters when the next sentence loads", () => {
    const session = type(createTestSession(["ab", "cd"], 30), "abx");
    expect(session.expectedSentence).toBe("cd");
    expect(session.typedCharacters).toHaveLength(1);
    expect(session.correctAttempts).toBe(2);
    expect(session.incorrectAttempts).toBe(1);
  });

  it("ignores one space typed between sentences and still accepts the next letter", () => {
    const spaced = type(createTestSession(["ab.", "cd"], 30), "ab. c");
    const immediate = type(createTestSession(["ab.", "cd"], 30), "ab.c");
    expect(spaced.expectedSentence).toBe("cd");
    expect(spaced.typedCharacters.map((character) => character.typed)).toEqual(["c"]);
    expect(spaced.correctAttempts).toBe(4);
    expect(spaced.incorrectAttempts).toBe(0);
    expect(immediate.typedCharacters.map((character) => character.typed)).toEqual(["c"]);
    expect(immediate.correctAttempts).toBe(4);
  });

  it("counts a leading space on the first sentence as an incorrect character", () => {
    const session = type(createTestSession(["ab"], 30), " ");
    expect(session.characterIndex).toBe(1);
    expect(session.incorrectAttempts).toBe(1);
  });

  it("counts a second space between sentences as an incorrect first character", () => {
    const session = type(createTestSession(["ab.", "cd"], 30), "ab.  ");
    expect(session.expectedSentence).toBe("cd");
    expect(session.typedCharacters).toEqual([
      { expected: "c", typed: " ", isCorrect: false },
    ]);
    expect(session.incorrectAttempts).toBe(1);
  });

  it("does not let Backspace reopen a committed sentence", () => {
    const session = type(createTestSession(["ab", "cd"], 30), "ab");
    const erased = applyTypingKey(session, { key: "Backspace" }, 10);
    expect(erased.sentenceIndex).toBe(1);
    expect(erased.expectedSentence).toBe("cd");
    expect(erased.correctAttempts).toBe(2);
  });

  it("follows the passage array in order", () => {
    const first = type(createTestSession(["one", "two"], 30), "one");
    const second = type(createTestSession(["one", "two"], 30), "one");
    expect(first.expectedSentence).toBe("two");
    expect(second.expectedSentence).toBe(first.expectedSentence);
  });

  it("ignores input at the timeout", () => {
    const started = type(createTestSession(["house"], 30), "h", 0);
    const late = applyTypingKey(started, { key: "o" }, 30_000);
    expect(late.isFinished).toBe(true);
    expect(late.correctAttempts).toBe(1);
    expect(late.characterIndex).toBe(1);
  });

  it("shows the full duration before the timer starts and counts down after", () => {
    const waiting = createTestSession(["house"], 30);
    expect(remainingSeconds(waiting, 0)).toBe(30);
    const running = type(waiting, "h", 1000);
    expect(remainingSeconds(running, 1000)).toBe(30);
    expect(remainingSeconds(running, 2000)).toBe(29);
  });

  it("finds the word that contains the caret", () => {
    expect(currentWordBounds("The little dog", 4)).toEqual({
      start: 4,
      end: 10,
    });
    expect(currentWordBounds("The little dog", 3)).toBeNull();
  });
});
