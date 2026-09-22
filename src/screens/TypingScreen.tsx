import { useEffect, useRef, useState } from "react";
import {
  calculateAccuracy,
  calculateWpm,
  displayedAccuracy,
  displayedWpm,
} from "../features/typing/scoring";
import {
  currentWordBounds,
  elapsedSeconds,
  remainingSeconds,
  type TestSession,
} from "../features/typing/typingEngine";

type TypingScreenProps = {
  session: TestSession;
  onType: (key: { key: string; repeat: boolean; now: number }) => void;
  onExpire: () => void;
  onAbort: () => void;
};

export function TypingScreen({
  session,
  onType,
  onExpire,
  onAbort,
}: TypingScreenProps) {
  const screenRef = useRef<HTMLElement>(null);
  const onTypeRef = useRef(onType);
  const onExpireRef = useRef(onExpire);
  const [now, setNow] = useState(() => performance.now());
  const holdTimer = useRef<number | null>(null);

  useEffect(() => {
    onTypeRef.current = onType;
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    screenRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      onTypeRef.current({
        key: event.key,
        repeat: event.repeat,
        now: performance.now(),
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (session.startedAt === null) {
      return;
    }
    const id = window.setInterval(() => {
      const time = performance.now();
      if (session.endsAt !== null && time >= session.endsAt) {
        onExpireRef.current();
        return;
      }
      setNow(time);
    }, 200);
    return () => window.clearInterval(id);
  }, [session.startedAt, session.endsAt]);

  const displayNow =
    session.startedAt === null ? now : Math.max(now, session.startedAt);
  const word = currentWordBounds(session.expectedSentence, session.characterIndex);
  const accuracy = calculateAccuracy(
    session.correctAttempts,
    session.incorrectAttempts,
  );
  const liveWpm = displayedWpm(
    calculateWpm(
      session.correctCharacters,
      elapsedSeconds(session, displayNow),
    ),
  );

  function beginHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
    }
    holdTimer.current = window.setTimeout(onAbort, 600);
  }

  function endHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  return (
    <main className="screen typing-screen" ref={screenRef} tabIndex={-1}>
      <button
        type="button"
        className="logo-badge"
        aria-label="Logo"
        onPointerDown={beginHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
      />
      <p className="passage-line">
        {session.expectedSentence.split("").map((character, index) => {
          const typed = session.typedCharacters[index];
          const inCurrentWord =
            word !== null && index >= word.start && index < word.end;
          const className = [
            "passage-char",
            typed?.isCorrect ? "correct" : "",
            typed && !typed.isCorrect ? "incorrect" : "",
            !typed && inCurrentWord ? "current-word" : "",
            typed?.isCorrect && inCurrentWord ? "current-word" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const atCaret = index === session.characterIndex;
          const atEnd =
            index === session.expectedSentence.length - 1 &&
            session.characterIndex >= session.expectedSentence.length;
          return (
            <span className={className} key={`${session.sentenceIndex}-${index}`}>
              <span className="passage-char-measure" aria-hidden="true">
                {character}
              </span>
              <span className="passage-char-glyph">{character}</span>
              {atCaret ? <span className="caret" aria-hidden="true" /> : null}
              {atEnd ? <span className="caret caret-end" aria-hidden="true" /> : null}
            </span>
          );
        })}
      </p>
      <div className="stats">
        <p>
          <span className="stat-value">{liveWpm}</span> WPM
        </p>
        <p>
          <span className="stat-label">TIME</span>
          <span className="stat-value">
            {remainingSeconds(session, displayNow)}s
          </span>
        </p>
        <p>
          <span className="stat-value">
            {accuracy === null ? "—%" : `${displayedAccuracy(accuracy)}%`}
          </span>
        </p>
      </div>
    </main>
  );
}
