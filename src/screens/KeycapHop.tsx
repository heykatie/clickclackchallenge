import { useEffect, useRef, useState } from "react";
import { HOP, createHop, hopScore, jumpHop, stepHop, type HopState } from "../features/hop/keycapHop";
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
  const [best, setBest] = useState(sessionBest);
  const [phase, setPhase] = useState<"ready" | "running" | "crashed">("ready");
  const [activity, setActivity] = useState(0);
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
        setScore((current) => (current === nextScore ? current : nextScore));
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
    const top = ground - obstacle.height;
    if (obstacle.height > 24) {
      // A stack of keycaps: lavender blocks with rounded corners.
      const caps = Math.max(2, Math.round(obstacle.height / 15));
      const capHeight = obstacle.height / caps;
      for (let index = 0; index < caps; index += 1) {
        roundedRect(context, obstacle.x, top + index * capHeight, obstacle.width, capHeight - 1.5, 3);
        context.fillStyle = token("--tiny-lavender-light", "#d9d0ed");
        context.fill();
        context.strokeStyle = token("--tiny-lavender-deep", "#6b5a9a");
        context.lineWidth = 1.5;
        context.stroke();
      }
    } else {
      // A tangle of cable: a pink squiggle.
      context.strokeStyle = token("--tiny-pink", "#f4c1d4");
      context.lineWidth = 5;
      context.beginPath();
      for (let x = 0; x <= obstacle.width; x += 4) {
        const y = top + obstacle.height / 2 + Math.sin(x / 4) * (obstacle.height / 2 - 3);
        if (x === 0) context.moveTo(obstacle.x + x, y);
        else context.lineTo(obstacle.x + x, y);
      }
      context.stroke();
    }
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

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}
