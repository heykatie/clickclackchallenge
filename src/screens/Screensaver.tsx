import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import type { RankedScore } from "../features/leaderboard/ranking";
import { rollPlan, type RollPlan } from "../features/leaderboard/rollPlan";
import { ScoreRow } from "./ScoreRow";

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
      className="screen screensaver edge-motifs"
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
      <p className="score-kicker">HIGH SCORES</p>
      <div
        className={plan.rolls ? "score-card screensaver-window is-rolling" : "score-card screensaver-window"}
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
    <ol className="score-rows screensaver-rows" aria-hidden={hidden} ref={listRef}>
      {scores.map((entry, index) => (
        <ScoreRow
          key={entry.score.id}
          rank={entry.rank}
          name={entry.score.name}
          displayedWpm={entry.score.displayedWpm}
          style={{ "--row-index": index } as CSSProperties}
        />
      ))}
    </ol>
  );
}
