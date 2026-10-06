import type { CSSProperties } from "react";
import type { RowMotion } from "../features/leaderboard/boardMotion";

type ScoreRowProps = {
  rank: number;
  /** Null for a score saved without a name. Ignored for an empty place. */
  name: string | null;
  /** Null marks an unoccupied place on the board. */
  displayedWpm: number | null;
  isCurrent?: boolean;
  style?: CSSProperties;
  /** How the row moves as the Leaderboard opens. */
  motion?: RowMotion;
};

/** One ranked row, shared by the Leaderboard and the rolling high-score list. */
export function ScoreRow({
  rank,
  name,
  displayedWpm,
  isCurrent = false,
  style,
  motion = null,
}: ScoreRowProps) {
  const empty = displayedWpm === null;
  const first = rank === 1 && !empty;
  const className = [
    "score-row",
    first ? "is-first" : "",
    isCurrent ? "is-current" : "",
    empty ? "is-empty" : "",
    rank <= 3 && !empty ? `is-podium-${rank}` : "",
    motion?.kind === "climb" ? "is-climbing" : "",
    motion?.kind === "nudge" ? "is-nudged" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li
      className={className}
      style={motion ? ({ ...style, "--climb-rows": motion.rows } as CSSProperties) : style}
    >
      <span className="score-rank">{rank}</span>
      <span className="score-crown" aria-hidden="true">
        {first ? <Crown /> : null}
      </span>
      <span className="score-name-cell">
        <span className={!empty && name ? "score-name has-name" : "score-name"}>{empty ? "—" : (name ?? "—")}</span>
        {isCurrent ? <span className="you-pill">YOU</span> : null}
      </span>
      {empty ? (
        <span className="score-wpm">
          <span className="score-wpm-value">—</span>
        </span>
      ) : (
        <span className="score-wpm">
          <span className="score-wpm-value">{displayedWpm}</span>
          <span className="score-wpm-unit">WPM</span>
        </span>
      )}
    </li>
  );
}

export function Crown() {
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
