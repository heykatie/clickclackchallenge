import { useEffect, useRef } from "react";
import type { RankedScore } from "../features/leaderboard/ranking";

type ScreensaverProps = {
  scores: readonly RankedScore[];
  onWake: () => void;
};

export function Screensaver({ scores, onWake }: ScreensaverProps) {
  const screenRef = useRef<HTMLElement>(null);
  const crawl = repeatForCrawl(scores);
  const seconds = Math.max(crawl.length, 8) * 2.4;

  useEffect(() => {
    screenRef.current?.focus();
  }, []);

  return (
    <main
      className="screen screensaver"
      ref={screenRef}
      tabIndex={-1}
      onPointerDown={onWake}
      onKeyDown={(event) => {
        if (event.repeat) {
          return;
        }
        event.preventDefault();
        onWake();
      }}
    >
      <p className="screensaver-kicker">HIGH SCORES</p>
      <div className="screensaver-window" aria-label="All-time high scores">
        <div className="screensaver-track" style={{ animationDuration: `${seconds}s` }}>
          <ScoreColumn scores={crawl} />
          <ScoreColumn scores={crawl} hidden />
        </div>
      </div>
    </main>
  );
}

function ScoreColumn({ scores, hidden = false }: { scores: readonly RankedScore[]; hidden?: boolean }) {
  return (
    <ol className="screensaver-rows" aria-hidden={hidden}>
      {scores.map((entry, index) => (
        <li className={entry.rank === 1 ? "screensaver-row is-first" : "screensaver-row"} key={`${entry.score.id}-${index}`}>
          <span className="screensaver-rank">{entry.rank}</span>
          <span className={entry.score.name ? "screensaver-name has-name" : "screensaver-name"}>
            {entry.score.name ?? "—"}
          </span>
          <span className="screensaver-wpm">{entry.score.displayedWpm} WPM</span>
        </li>
      ))}
    </ol>
  );
}

function repeatForCrawl(scores: readonly RankedScore[]): RankedScore[] {
  if (scores.length === 0) {
    return [];
  }
  if (scores.length >= 10) {
    return [...scores];
  }
  const filled: RankedScore[] = [];
  while (filled.length < 10) {
    filled.push(...scores);
  }
  return filled;
}
