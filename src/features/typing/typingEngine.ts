export interface TypedCharacter {
  expected: string;
  typed: string;
  isCorrect: boolean;
}

export interface TestSession {
  sentences: readonly string[];
  durationSeconds: 30 | 60;
  testMode: "words" | "race";
  sentenceIndex: number;
  characterIndex: number;
  expectedSentence: string;
  typedCharacters: TypedCharacter[];
  correctCharacters: number;
  correctAttempts: number;
  incorrectAttempts: number;
  startedAt: number | null;
  endsAt: number | null;
  isFinished: boolean;
  skippedSentenceSpace: boolean;
}

export interface TypingKey {
  key: string;
  repeat?: boolean;
}

const IGNORED_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "Tab",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

export function createTestSession(
  sentences: readonly string[],
  durationSeconds: 30 | 60,
  testMode: "words" | "race" = "race",
): TestSession {
  const expectedSentence = sentences[0];
  if (!expectedSentence) {
    throw new Error("A test needs at least one sentence.");
  }

  return {
    sentences,
    durationSeconds,
    testMode,
    sentenceIndex: 0,
    characterIndex: 0,
    expectedSentence,
    typedCharacters: [],
    correctCharacters: 0,
    correctAttempts: 0,
    incorrectAttempts: 0,
    startedAt: null,
    endsAt: null,
    isFinished: false,
    skippedSentenceSpace: false,
  };
}

export function currentWordBounds(
  sentence: string,
  characterIndex: number,
): { start: number; end: number } | null {
  const character = sentence[characterIndex];
  if (character === undefined || character === " ") {
    return null;
  }

  let start = characterIndex;
  while (start > 0 && sentence[start - 1] !== " ") {
    start -= 1;
  }

  let end = characterIndex + 1;
  while (end < sentence.length && sentence[end] !== " ") {
    end += 1;
  }

  return { start, end };
}

export function remainingSeconds(session: TestSession, now: number): number {
  if (session.startedAt === null || session.endsAt === null) {
    return session.durationSeconds;
  }

  return Math.max(0, Math.ceil((session.endsAt - now) / 1000));
}

export function elapsedSeconds(session: TestSession, now: number): number {
  if (session.startedAt === null) {
    return 0;
  }

  return Math.max(0, (now - session.startedAt) / 1000);
}

export function applyTypingKey(
  session: TestSession,
  typingKey: TypingKey,
  now: number,
): TestSession {
  if (typingKey.repeat || session.isFinished) {
    return session;
  }

  if (session.startedAt !== null && session.endsAt !== null && now >= session.endsAt) {
    return { ...session, isFinished: true };
  }

  if (typingKey.key === "Backspace") {
    return backspace(session);
  }

  if (!isPrintable(typingKey.key)) {
    return session;
  }

  const started = startTimer(session, now);
  return typeCharacter(started, typingKey.key);
}

function isPrintable(key: string): boolean {
  if (IGNORED_KEYS.has(key) || /^F\d{1,2}$/.test(key)) {
    return false;
  }

  return key.length === 1;
}

function startTimer(session: TestSession, now: number): TestSession {
  if (session.startedAt !== null) {
    return session;
  }

  return {
    ...session,
    startedAt: now,
    endsAt: now + session.durationSeconds * 1000,
  };
}

function typeCharacter(session: TestSession, typed: string): TestSession {
  // The first space after a committed sentence is the space people type after "." or "?".
  if (
    typed === " " &&
    session.characterIndex === 0 &&
    session.sentenceIndex > 0 &&
    !session.skippedSentenceSpace &&
    session.expectedSentence[0] !== " "
  ) {
    return { ...session, skippedSentenceSpace: true };
  }

  const expected = session.expectedSentence[session.characterIndex];
  if (expected === undefined) {
    return session;
  }

  const isCorrect = typed === expected;
  const typedCharacters = [
    ...session.typedCharacters,
    { expected, typed, isCorrect },
  ];
  const counters = {
    correctCharacters: session.correctCharacters + (isCorrect ? 1 : 0),
    correctAttempts: session.correctAttempts + (isCorrect ? 1 : 0),
    incorrectAttempts: session.incorrectAttempts + (isCorrect ? 0 : 1),
  };

  if (typedCharacters.length < session.expectedSentence.length) {
    return {
      ...session,
      ...counters,
      typedCharacters,
      characterIndex: typedCharacters.length,
    };
  }

  const nextIndex = session.sentenceIndex + 1;
  const nextSentence = session.sentences[nextIndex];
  if (!nextSentence) {
    return {
      ...session,
      ...counters,
      typedCharacters,
      characterIndex: typedCharacters.length,
    };
  }

  return {
    ...session,
    ...counters,
    sentenceIndex: nextIndex,
    characterIndex: 0,
    expectedSentence: nextSentence,
    typedCharacters: [],
    skippedSentenceSpace: false,
  };
}

function backspace(session: TestSession): TestSession {
  if (session.startedAt === null || session.typedCharacters.length === 0) {
    return session;
  }

  const removed = session.typedCharacters.at(-1);
  if (!removed) {
    return session;
  }

  return {
    ...session,
    typedCharacters: session.typedCharacters.slice(0, -1),
    characterIndex: session.characterIndex - 1,
    correctCharacters:
      session.correctCharacters - (removed.isCorrect ? 1 : 0),
  };
}
