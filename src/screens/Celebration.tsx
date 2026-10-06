import type { CSSProperties } from "react";

type Piece = {
  kind: "star" | "dot";
  color: string;
  /** Start position, kept to the side edges so the score in the middle stays clear. */
  x: number;
  y: number;
  /** How far it drifts, in rem. */
  dx: number;
  dy: number;
  size: number;
  delay: number;
};

const MINT = "var(--tiny-mint-strong)";
const LAVENDER = "var(--tiny-lavender)";
const PINK = "var(--tiny-pink)";

const PIECES: readonly Piece[] = [
  { kind: "star", color: MINT, x: 8, y: 18, dx: -2, dy: -3, size: 2.2, delay: 0 },
  { kind: "dot", color: PINK, x: 14, y: 34, dx: -3, dy: -1, size: 0.9, delay: 60 },
  { kind: "star", color: LAVENDER, x: 6, y: 52, dx: -2.5, dy: 1.5, size: 1.6, delay: 120 },
  { kind: "dot", color: MINT, x: 16, y: 64, dx: -1.5, dy: 3, size: 0.7, delay: 180 },
  { kind: "star", color: PINK, x: 18, y: 10, dx: -1, dy: -3, size: 1.3, delay: 240 },
  { kind: "star", color: LAVENDER, x: 92, y: 16, dx: 2, dy: -3, size: 2, delay: 30 },
  { kind: "dot", color: MINT, x: 86, y: 32, dx: 3, dy: -1, size: 0.9, delay: 90 },
  { kind: "star", color: PINK, x: 94, y: 50, dx: 2.5, dy: 1.5, size: 1.7, delay: 150 },
  { kind: "dot", color: LAVENDER, x: 84, y: 66, dx: 1.5, dy: 3, size: 0.7, delay: 210 },
  { kind: "star", color: MINT, x: 82, y: 8, dx: 1, dy: -3, size: 1.3, delay: 270 },
];

/** A short burst of brand doodles for a new high score. Decoration only: hidden from screen readers and taps. */
export function Celebration() {
  return (
    <div className="result-celebration" aria-hidden="true">
      {PIECES.map((piece, index) => (
        <span
          key={index}
          className={`celebration-piece celebration-${piece.kind}`}
          style={
            {
              "--x": `${piece.x}%`,
              "--y": `${piece.y}%`,
              "--dx": `${piece.dx}rem`,
              "--dy": `${piece.dy}rem`,
              "--size": `${piece.size}rem`,
              "--delay": `${piece.delay}ms`,
              color: piece.color,
            } as CSSProperties
          }
        >
          {piece.kind === "star" ? (
            <svg viewBox="0 0 24 24" width="100%" height="100%" focusable="false">
              <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12Z" fill="currentColor" />
            </svg>
          ) : null}
        </span>
      ))}
    </div>
  );
}
