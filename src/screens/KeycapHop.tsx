import { useEffect, useRef, useState } from "react";
import {
  HOP,
  createHop,
  hopLevel,
  hopScore,
  jumpHop,
  stepHop,
  type HopObstacle,
  type HopState,
} from "../features/hop/keycapHop";
import { boothSound } from "../sound/boothSound";
import { useLogoHold } from "./useLogoHold";

/** Like the rest of the booth, the game goes back to Ready when nobody is playing. */
const HOP_IDLE_MS = 30_000;
/** Space, Up, Enter, and W hop; other keys do nothing here, so a mash never starts a typing round. */
const JUMP_KEYS = new Set([" ", "ArrowUp", "Enter", "NumpadEnter", "w", "W"]);

/** The best run since the app opened. Kept nowhere else: the game never touches scores or leaderboards. */
let sessionBest = 0;

type KeycapHopProps = {
  onClose: () => void;
  onSetup: () => void;
};

/**
 * Keycap Hop, the booth's secret runner. Ready opens it when the logo is tapped (or Escape is pressed) and there are
 * no scores to show yet. The logo closes it; holding the logo opens Event Setup, as everywhere else.
 */
export function KeycapHop({ onClose, onSetup }: KeycapHopProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<HopState>(createHop());
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(sessionBest);
  const [phase, setPhase] = useState<"ready" | "running" | "crashed">("ready");
  const [activity, setActivity] = useState(0);
  const levelRef = useRef(1);
  const onCloseRef = useRef(onClose);
  const logoHold = useLogoHold(onSetup, onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  function hop() {
    const before = stateRef.current;
    const after = jumpHop(before);
    if (after !== before) {
      stateRef.current = after;
      setPhase("running");
      if (before.crashed) {
        setScore(0);
        setLevel(1);
        levelRef.current = 1;
      }
      boothSound.play("key");
    }
    setActivity((count) => count + 1);
  }
  const hopRef = useRef(hop);
  useEffect(() => {
    hopRef.current = hop;
  });

  useEffect(() => {
    const id = window.setTimeout(() => onCloseRef.current(), HOP_IDLE_MS);
    return () => window.clearTimeout(id);
  }, [activity]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        return;
      }
      event.preventDefault();
      if (!event.repeat && JUMP_KEYS.has(event.key)) {
        hopRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  // The game loop: step the world each frame and draw it. A tab in the background pauses it with the frames.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const before = stateRef.current;
      const after = stepHop(before, dt, Math.random);
      if (after !== before) {
        stateRef.current = after;
        const nextScore = hopScore(after);
        const nextLevel = hopLevel(after);
        setScore((current) => (current === nextScore ? current : nextScore));
        if (nextLevel !== levelRef.current) {
          if (nextLevel > levelRef.current) {
            boothSound.play("ding");
          }
          levelRef.current = nextLevel;
          setLevel(nextLevel);
        }
        if (after.crashed && !before.crashed) {
          boothSound.play("miss");
          setPhase("crashed");
          if (nextScore > sessionBest) {
            sessionBest = nextScore;
            setBest(nextScore);
          }
        }
      }
      draw(canvasRef.current, stateRef.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main
      className="screen hop-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Keycap Hop"
      tabIndex={-1}
      onPointerDown={(event) => {
        if (!(event.target instanceof Element && event.target.closest(".logo-badge"))) {
          hop();
        }
      }}
    >
      <button type="button" className="logo-badge" aria-label="Close Keycap Hop" {...logoHold} />
      <div className="hop-hud" aria-live="polite">
        <p className="hop-title">Keycap Hop</p>
        <p className="hop-score">
          <span>{String(score).padStart(5, "0")}</span>
          <span className="hop-level">LV {level}</span>
          <span className="hop-best">BEST {String(best).padStart(5, "0")}</span>
        </p>
      </div>
      <canvas ref={canvasRef} className="hop-canvas" aria-hidden="true" />
      <p className="hop-hint">
        {phase === "crashed" ? "Bonk! Hop to go again." : phase === "ready" ? "No scores yet, so: press Space or tap to hop." : " "}
      </p>
    </main>
  );
}

function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Draws the world into the canvas, scaled to its on-screen width. jsdom has no canvas, so it simply skips. */
function draw(canvas: HTMLCanvasElement | null, state: HopState) {
  const context = canvas?.getContext("2d");
  if (!canvas || !context) {
    return;
  }
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = (width * HOP.worldHeight) / HOP.worldWidth;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const scale = (width / HOP.worldWidth) * ratio;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, HOP.worldWidth, HOP.worldHeight);

  const ground = HOP.worldHeight - 18;
  const charcoal = token("--tiny-charcoal", "#403738");
  drawScenery(context, state.distance, ground);

  // A hand-drawn ground: a line with little dashes that scroll with the run.
  context.strokeStyle = charcoal;
  context.lineWidth = 2;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(0, ground);
  context.lineTo(HOP.worldWidth, ground);
  context.stroke();
  context.lineWidth = 1.5;
  const offset = state.distance % 40;
  for (let x = -offset; x < HOP.worldWidth; x += 40) {
    context.beginPath();
    context.moveTo(x + 8, ground + 7);
    context.lineTo(x + 18, ground + 7);
    context.stroke();
  }

  for (const obstacle of state.obstacles) {
    drawObstacle(context, obstacle, ground);
  }

  // The keycap: a mint key with a lighter top face and a little smile, squashed a touch on the ground.
  const size = HOP.keycapSize;
  const x = HOP.keycapX;
  const y = ground - size - state.height;
  roundedRect(context, x, y, size, size, 7);
  context.fillStyle = token("--tiny-mint-strong", "#6ccfc7");
  context.fill();
  context.strokeStyle = charcoal;
  context.lineWidth = 2;
  context.stroke();
  roundedRect(context, x + 5, y + 4, size - 10, size - 12, 5);
  context.fillStyle = token("--tiny-white", "#fffdfc");
  context.fill();
  context.fillStyle = charcoal;
  const eyeY = y + 13;
  if (state.crashed) {
    // Crossed-out eyes after a bonk.
    for (const eyeX of [x + 12, x + 22]) {
      context.beginPath();
      context.moveTo(eyeX - 2.5, eyeY - 2.5);
      context.lineTo(eyeX + 2.5, eyeY + 2.5);
      context.moveTo(eyeX + 2.5, eyeY - 2.5);
      context.lineTo(eyeX - 2.5, eyeY + 2.5);
      context.lineWidth = 1.5;
      context.stroke();
    }
  } else {
    context.beginPath();
    context.arc(x + 12, eyeY, 2, 0, Math.PI * 2);
    context.arc(x + 22, eyeY, 2, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(x + 17, eyeY + 4, 4, 0.15 * Math.PI, 0.85 * Math.PI);
    context.lineWidth = 1.5;
    context.stroke();
  }
}

/**
 * Soft pastel hills and a few doodle stars that scroll slower than the ground, so the strip feels like a place
 * rather than a blank card. Sparse on purpose: nothing crowds the keycap.
 */
function drawScenery(context: CanvasRenderingContext2D, distance: number, ground: number) {
  const far = (distance * 0.18) % 280;
  const mid = (distance * 0.4) % 220;
  const lavender = token("--tiny-lavender-light", "#d9d0ed");
  const pink = token("--tiny-pink", "#f4c1d4");
  const mint = token("--tiny-mint", "#a8e6e1");
  const charcoal = token("--tiny-charcoal", "#403738");

  for (const hill of [
    { x: 40 - far, y: ground - 28, w: 120, h: 36, color: lavender },
    { x: 220 - far, y: ground - 22, w: 100, h: 30, color: pink },
    { x: 400 - far, y: ground - 32, w: 130, h: 40, color: lavender },
    { x: 560 - far, y: ground - 24, w: 110, h: 32, color: mint },
  ]) {
    context.fillStyle = hill.color;
    context.globalAlpha = 0.45;
    context.beginPath();
    context.ellipse(hill.x, hill.y, hill.w / 2, hill.h / 2, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;

  for (const cloud of [
    { x: 90 - mid, y: 28, r: 14 },
    { x: 310 - mid, y: 22, r: 11 },
    { x: 500 - mid, y: 34, r: 13 },
  ]) {
    context.fillStyle = token("--tiny-white", "#fffdfc");
    context.globalAlpha = 0.7;
    context.beginPath();
    context.ellipse(cloud.x, cloud.y, cloud.r * 1.6, cloud.r, 0, 0, Math.PI * 2);
    context.ellipse(cloud.x - cloud.r, cloud.y + 2, cloud.r, cloud.r * 0.75, 0, 0, Math.PI * 2);
    context.ellipse(cloud.x + cloud.r, cloud.y + 2, cloud.r, cloud.r * 0.75, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;

  // A couple of hand-drawn stars, drifting with the mid layer.
  context.strokeStyle = charcoal;
  context.lineWidth = 1.4;
  context.lineCap = "round";
  for (const star of [
    { x: 160 - mid, y: 48 },
    { x: 430 - mid, y: 40 },
  ]) {
    context.beginPath();
    context.moveTo(star.x, star.y - 5);
    context.lineTo(star.x, star.y + 5);
    context.moveTo(star.x - 5, star.y);
    context.lineTo(star.x + 5, star.y);
    context.moveTo(star.x - 3.5, star.y - 3.5);
    context.lineTo(star.x + 3.5, star.y + 3.5);
    context.moveTo(star.x + 3.5, star.y - 3.5);
    context.lineTo(star.x - 3.5, star.y + 3.5);
    context.stroke();
  }
}

function drawObstacle(context: CanvasRenderingContext2D, obstacle: HopObstacle, ground: number) {
  const top = ground - obstacle.height;
  const kind = obstacle.kind;
  if (kind === "cable") {
    context.strokeStyle = token("--tiny-pink", "#f4c1d4");
    context.lineWidth = 5;
    context.lineCap = "round";
    context.beginPath();
    for (let x = 0; x <= obstacle.width; x += 4) {
      const y = top + obstacle.height / 2 + Math.sin(x / 4) * (obstacle.height / 2 - 3);
      if (x === 0) context.moveTo(obstacle.x + x, y);
      else context.lineTo(obstacle.x + x, y);
    }
    context.stroke();
    return;
  }

  const fill = token("--tiny-lavender-light", "#d9d0ed");
  const stroke = token("--tiny-lavender-deep", "#6b5a9a");
  if (kind === "double") {
    // Two side-by-side stacks: the later-level hazard, still the same lavender keycaps.
    const gap = 3;
    const column = (obstacle.width - gap) / 2;
    drawKeycapStack(context, obstacle.x, top, column, obstacle.height, fill, stroke);
    drawKeycapStack(context, obstacle.x + column + gap, top, column, obstacle.height, fill, stroke);
    return;
  }
  drawKeycapStack(context, obstacle.x, top, obstacle.width, obstacle.height, fill, stroke);
}

function drawKeycapStack(
  context: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number,
  fill: string,
  stroke: string,
) {
  const caps = Math.max(2, Math.round(height / 15));
  const capHeight = height / caps;
  for (let index = 0; index < caps; index += 1) {
    roundedRect(context, x, top + index * capHeight, width, capHeight - 1.5, 3);
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = stroke;
    context.lineWidth = 1.5;
    context.stroke();
  }
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}
