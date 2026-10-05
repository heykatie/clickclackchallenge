import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import type { RankedScore } from "../features/leaderboard/ranking";
import { rollPlan, type RollPlan } from "../features/leaderboard/rollPlan";

type ScreensaverProps = {
  scores: readonly RankedScore[];
  onWake: () => void;
};

export function Screensaver({ scores, onWake }: ScreensaverProps) {
  const screenRef = useRef<HTMLElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const [plan, setPlan] = useState<RollPlan>({ rolls: false, seconds: 0 });

  useEffect(() => {
    screenRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    const scoreWindow = windowRef.current;
    const list = listRef.current;
    if (!scoreWindow || !list) {
      return;
    }
    const measure = () => {
      const next = rollPlan(list.offsetHeight, scoreWindow.clientHeight);
      setPlan((current) => (current.rolls === next.rolls && current.seconds === next.seconds ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scoreWindow);
    observer.observe(list);
    return () => observer.disconnect();
  }, [scores]);

  return (
    <main
      className="screen screensaver"
      ref={screenRef}
      tabIndex={-1}
      // Waking on pointerdown would let the same tap's pointerup reach Ready and start a test.
      onPointerUp={onWake}
      onKeyDown={(event) => {
        if (event.repeat) {
          return;
        }
        event.preventDefault();
        onWake();
      }}
    >
      <p className="screensaver-kicker">HIGH SCORES</p>
      <div
        className={plan.rolls ? "screensaver-window is-rolling" : "screensaver-window"}
        ref={windowRef}
        aria-label="All-time high scores"
      >
        <div
          className="screensaver-track"
          style={plan.rolls ? ({ animationDuration: `${plan.seconds}s` } as CSSProperties) : undefined}
        >
          <ScoreColumn scores={scores} listRef={listRef} />
          {/* The second copy makes the roll loop without a jump. */}
          {plan.rolls ? <ScoreColumn scores={scores} hidden /> : null}
        </div>
      </div>
    </main>
  );
}

function ScoreColumn({
  scores,
  hidden = false,
  listRef,
}: {
  scores: readonly RankedScore[];
  hidden?: boolean;
  listRef?: Ref<HTMLOListElement>;
}) {
  return (
    <ol className="screensaver-rows" aria-hidden={hidden} ref={listRef}>
      {scores.map((entry, index) => (
        <li
          className={entry.rank === 1 ? "screensaver-row is-first" : "screensaver-row"}
          key={entry.score.id}
          style={{ "--row-index": index } as CSSProperties}
        >
          <span className="screensaver-rank">{entry.rank}</span>
          <span className="screensaver-crown" aria-hidden="true">
            {entry.rank === 1 ? <Crown /> : null}
          </span>
          <span className={entry.score.name ? "screensaver-name has-name" : "screensaver-name"}>
            {entry.score.name ?? "—"}
          </span>
          <span className="screensaver-wpm">
            <span className="screensaver-wpm-value">{entry.score.displayedWpm}</span>
            <span className="screensaver-wpm-unit">WPM</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Crown() {
  return (
    <svg viewBox="0 0 32 26" width="32" height="26" focusable="false">
      <path
        d="M4 21 2.5 6.5l8 6.5L16 3l5.5 10 8-6.5L28 21Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
