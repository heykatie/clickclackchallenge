import { useEffect, useRef, useState } from "react";
import {
  HOP,
  createHop,
  hopKeycapLeft,
  hopKeycapSize,
  hopLevel,
  hopScore,
  jumpHop,
  releaseJump,
  stepHop,
  type HopObstacle,
  type HopPowerUp,
  type HopState,
} from "../features/hop/keycapHop";
import { boothSound } from "../sound/boothSound";
import { boothMusic } from "../sound/music/musicPlayer";
import { hopPowerCue } from "../sound/soundCues";
import { useLogoHold } from "./useLogoHold";

/** Like the rest of the booth, the game goes back to Ready when nobody is playing. */
const HOP_IDLE_MS = 20_000;
/** Space, Up, Enter, and W hop; other keys do nothing here, so a mash never starts a typing round. */
const JUMP_KEYS = new Set([" ", "ArrowUp", "Enter", "NumpadEnter", "w", "W"]);
/** Pixel size for the chunky trees (world pixels per “pixel”). */
const TREE_PX = 4;

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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Duck the bed while hopping so the bonk and power cues stay on top; restore on close.
  useEffect(() => {
    boothMusic.setHopQuiet(true);
    return () => boothMusic.setHopQuiet(false);
  }, []);

  function hop() {
    const before = stateRef.current;
    const after = jumpHop(before, Math.random);
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

  function endHopHold() {
    const before = stateRef.current;
    const after = releaseJump(before);
    if (after !== before) {
      stateRef.current = after;
    }
  }

  const hopRef = useRef(hop);
  const endHopHoldRef = useRef(endHopHold);
  useEffect(() => {
    hopRef.current = hop;
    endHopHoldRef.current = endHopHold;
  });

  useEffect(() => {
    const id = window.setTimeout(() => onCloseRef.current(), HOP_IDLE_MS);
    return () => window.clearTimeout(id);
  }, [activity]);

  useEffect(() => {
    const held = new Set<string>();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }
      event.preventDefault();
      if (!JUMP_KEYS.has(event.key) || event.repeat || held.has(event.key)) {
        return;
      }
      held.add(event.key);
      hopRef.current();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!JUMP_KEYS.has(event.key)) {
        return;
      }
      held.delete(event.key);
      // Only cut the hop short when no other jump key is still down.
      if (held.size === 0) {
        endHopHoldRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest(".logo-badge")) {
        return;
      }
      hopRef.current();
    };
    const onPointerUp = () => endHopHoldRef.current();
    const onPointerCancel = () => endHopHoldRef.current();

    // The landscape stage is narrower than the phone viewport; capture taps on the surrounding screen too.
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerCancel, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerCancel, true);
    };
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
        if (after.slowRemaining > before.slowRemaining) {
          boothSound.play(hopPowerCue("slow"));
        } else if (after.sizeRemaining > before.sizeRemaining) {
          boothSound.play(hopPowerCue(after.sizeScale >= HOP.sizeBig ? "big" : "small"));
        }
        if (after.crashed && !before.crashed) {
          boothSound.play("hop-bonk");
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
    >
      <button ref={closeButtonRef} type="button" className="logo-badge" aria-label="Close Keycap Hop" {...logoHold} />
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
        {phase === "crashed" ? "Bonk! Hop to go again." : phase === "ready" ? "Press Space or tap to hop." : " "}
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

  for (const power of state.powerUps) {
    drawPowerUp(context, power, ground);
  }

  // The keycap: a mint key with a lighter top face and a little smile. Size power-ups scale it.
  const size = hopKeycapSize(state);
  const x = hopKeycapLeft(state);
  const y = ground - size - state.height;
  const face = size / HOP.keycapSize;
  roundedRect(context, x, y, size, size, 7 * face);
  context.fillStyle = token("--tiny-mint-strong", "#6ccfc7");
  context.fill();
  context.strokeStyle = charcoal;
  context.lineWidth = 2;
  context.stroke();
  roundedRect(context, x + 5 * face, y + 4 * face, size - 10 * face, size - 12 * face, 5 * face);
  context.fillStyle = token("--tiny-white", "#fffdfc");
  context.fill();
  context.fillStyle = charcoal;
  const eyeY = y + 13 * face;
  if (state.crashed) {
    // Crossed-out eyes after a bonk.
    for (const eyeX of [x + 12 * face, x + 22 * face]) {
      context.beginPath();
      context.moveTo(eyeX - 2.5 * face, eyeY - 2.5 * face);
      context.lineTo(eyeX + 2.5 * face, eyeY + 2.5 * face);
      context.moveTo(eyeX + 2.5 * face, eyeY - 2.5 * face);
      context.lineTo(eyeX - 2.5 * face, eyeY + 2.5 * face);
      context.lineWidth = 1.5;
      context.stroke();
    }
  } else {
    context.beginPath();
    context.arc(x + 12 * face, eyeY, 2 * face, 0, Math.PI * 2);
    context.arc(x + 22 * face, eyeY, 2 * face, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(x + 17 * face, eyeY + 4 * face, 4 * face, 0.15 * Math.PI, 0.85 * Math.PI);
    context.lineWidth = 1.5;
    context.stroke();
  }

  // A soft ring while a size or slow power is active, so the effect reads at a glance.
  if (state.slowRemaining > 0 || state.sizeRemaining > 0) {
    context.strokeStyle =
      state.slowRemaining > 0
        ? token("--tiny-lavender-deep", "#6b5a9a")
        : state.sizeScale > 1
          ? token("--tiny-mint-deep", "#24756e")
          : token("--tiny-gold-deep", "#8a5d00");
    context.globalAlpha = 0.55;
    context.lineWidth = 2;
    context.strokeRect(x - 3, y - 3, size + 6, size + 6);
    context.globalAlpha = 1;
  }
}

function drawPowerUp(context: CanvasRenderingContext2D, power: HopPowerUp, ground: number) {
  const cx = power.x;
  const cy = ground - power.y;
  const fill =
    power.kind === "slow"
      ? token("--tiny-lavender-light", "#d9d0ed")
      : power.kind === "big"
        ? token("--tiny-mint", "#a8e6e1")
        : token("--tiny-gold", "#f2c14e");
  const stroke =
    power.kind === "slow"
      ? token("--tiny-lavender-deep", "#6b5a9a")
      : power.kind === "big"
        ? token("--tiny-mint-deep", "#24756e")
        : token("--tiny-gold-deep", "#8a5d00");
  // Soft pulsing halo so orbs read as pickups, not clutter.
  const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 220);
  const core = 14;
  for (const [radius, alpha] of [
    [28, 0.12 * pulse],
    [22, 0.22 * pulse],
    [17, 0.35 * pulse],
  ] as const) {
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.globalAlpha = alpha;
    context.fill();
  }
  context.globalAlpha = 1;
  context.beginPath();
  context.arc(cx, cy, core, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 2;
  context.stroke();
  // Bright rim catch-light.
  context.beginPath();
  context.arc(cx, cy, core + 0.5, 0, Math.PI * 2);
  context.strokeStyle = token("--tiny-white", "#fffdfc");
  context.globalAlpha = 0.55 * pulse;
  context.lineWidth = 1.25;
  context.stroke();
  context.globalAlpha = 1;
  context.fillStyle = stroke;
  context.font = "bold 13px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(power.kind === "slow" ? "S" : power.kind === "big" ? "+" : "−", cx, cy + 0.5);
}

/**
 * Back to front: bright sun, sparse stars, far then near blue clouds, then muted trees. Scenery scrolls on integer
 * pixels so nothing shimmers; clouds and trees stay washed out so they read as backdrop.
 */
function drawScenery(context: CanvasRenderingContext2D, distance: number, ground: number) {
  context.globalAlpha = 0.9;
  drawSun(context, 548, 34);
  context.globalAlpha = 1;

  // A few mid-sky stars, sparse on purpose, scrolling a little slower than the trees.
  const starScroll = Math.floor(distance * 0.22);
  const starLoop = STAR_BELT[STAR_BELT.length - 1]!.x + 120;
  const starOffset = ((starScroll % starLoop) + starLoop) % starLoop;
  context.globalAlpha = 0.4;
  for (const star of STAR_BELT) {
    for (const wrap of [0, starLoop]) {
      const x = Math.floor(star.x - starOffset + wrap);
      if (x < -8 || x > HOP.worldWidth + 8) {
        continue;
      }
      drawPixelStar(context, x, star.y, star.size);
    }
  }
  context.globalAlpha = 1;

  // Soft blue clouds: far belt drifts slower and smaller; near belt is rarer and closer.
  const farSky = mixToken("--tiny-sky", "#b8dcf3", "--tiny-white", "#fffdfc", 0.28);
  const nearSky = mixToken("--tiny-sky", "#b8dcf3", "--tiny-white", "#fffdfc", 0.08);
  drawCloudBelt(context, distance, CLOUD_FAR, 0.14, farSky, 0.4);
  drawCloudBelt(context, distance, CLOUD_NEAR, 0.32, nearSky, 0.55);

  // Soft palette mixes so the trees sit behind the keycap instead of competing with it.
  const foliage = mixToken("--tiny-mint-deep", "#24756e", "--tiny-white", "#fffdfc", 0.55);
  const foliageLight = mixToken("--tiny-mint", "#a8e6e1", "--tiny-white", "#fffdfc", 0.65);
  const trunk = mixToken("--tiny-charcoal", "#403738", "--tiny-white", "#fffdfc", 0.5);
  const scroll = Math.floor(distance * 0.45);
  const loop = TREE_BELT[TREE_BELT.length - 1]!.x + 80;
  const offset = ((scroll % loop) + loop) % loop;
  context.globalAlpha = 0.32;
  for (const tree of TREE_BELT) {
    for (const wrap of [0, loop]) {
      const x = tree.x - offset + wrap;
      if (x < -48 || x > HOP.worldWidth + 24) {
        continue;
      }
      drawPixelTree(context, x, ground, tree.shape, tree.scale, foliage, foliageLight, trunk);
    }
  }
  context.globalAlpha = 1;
}

/** Sparse far clouds: small, slow, washed toward white. */
const CLOUD_FAR: Array<{ x: number; y: number; scale: number }> = [
  { x: 80, y: 48, scale: 0.7 },
  { x: 310, y: 36, scale: 0.55 },
  { x: 520, y: 52, scale: 0.65 },
  { x: 780, y: 40, scale: 0.5 },
];

/** Even sparser near clouds: larger, a touch stronger, scrolls faster for depth. */
const CLOUD_NEAR: Array<{ x: number; y: number; scale: number }> = [
  { x: 160, y: 58, scale: 1.05 },
  { x: 640, y: 44, scale: 0.95 },
];

function drawCloudBelt(
  context: CanvasRenderingContext2D,
  distance: number,
  belt: Array<{ x: number; y: number; scale: number }>,
  parallax: number,
  fill: string,
  alpha: number,
) {
  const loop = belt[belt.length - 1]!.x + 220;
  const scroll = Math.floor(distance * parallax);
  const offset = ((scroll % loop) + loop) % loop;
  context.fillStyle = fill;
  context.globalAlpha = alpha;
  for (const cloud of belt) {
    for (const wrap of [0, loop]) {
      const x = Math.floor(cloud.x - offset + wrap);
      if (x < -70 || x > HOP.worldWidth + 40) {
        continue;
      }
      drawCloud(context, x, cloud.y, cloud.scale);
    }
  }
  context.globalAlpha = 1;
}

/** Soft stacked ovals — handmade cloud, not a cartoon outline. */
function drawCloud(context: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const bumps: Array<[number, number, number, number]> = [
    [0, 4, 18, 11],
    [14, 0, 16, 12],
    [28, 3, 20, 12],
    [10, 8, 22, 10],
  ];
  for (const [dx, dy, w, h] of bumps) {
    context.beginPath();
    context.ellipse(x + dx * scale, y + dy * scale, (w / 2) * scale, (h / 2) * scale, 0, 0, Math.PI * 2);
    context.fill();
  }
}

/** Irregular belt: clustered gaps, skipped stretches, and mixed heights so the skyline is not a fence. */
const TREE_BELT: Array<{ x: number; shape: number; scale: number }> = [
  { x: 12, shape: 2, scale: 0.7 },
  { x: 48, shape: 0, scale: 1.1 },
  { x: 130, shape: 3, scale: 0.55 },
  { x: 168, shape: 1, scale: 1.35 },
  { x: 210, shape: 4, scale: 0.8 },
  { x: 310, shape: 0, scale: 0.9 },
  { x: 355, shape: 2, scale: 1.2 },
  { x: 455, shape: 3, scale: 0.65 },
  { x: 520, shape: 1, scale: 1.05 },
  { x: 548, shape: 4, scale: 0.75 },
];

/**
 * Mid-sky stars with uneven gaps (built from mixed steps) so they never march in a grid. A few more than a dusting,
 * still plenty of empty sky.
 */
const STAR_BELT: Array<{ x: number; y: number; size: number }> = (() => {
  const gaps = [38, 92, 54, 128, 46, 110, 68, 150, 42, 88];
  let x = 24;
  return gaps.map((gap, index) => {
    const star = {
      x,
      y: 26 + ((index * 17) % 36),
      size: index % 4 === 1 ? 2 : 1,
    };
    x += gap;
    return star;
  });
})();

function mixToken(a: string, aFallback: string, b: string, bFallback: string, towardB: number): string {
  const left = rgb(token(a, aFallback));
  const right = rgb(token(b, bFallback));
  if (!left || !right) {
    return token(a, aFallback);
  }
  const mix = (channel: number) => Math.round(left[channel]! * (1 - towardB) + right[channel]! * towardB);
  return `rgb(${mix(0)} ${mix(1)} ${mix(2)})`;
}

function rgb(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const value = Number.parseInt(hex[1]!, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  const rgbMatch = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i.exec(color.trim());
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }
  return null;
}

function drawSun(context: CanvasRenderingContext2D, cx: number, cy: number) {
  const gold = mixToken("--tiny-gold", "#f0c36a", "--tiny-white", "#fffdfc", 0.08);
  const goldDeep = mixToken("--tiny-gold-deep", "#8a5d00", "--tiny-white", "#fffdfc", 0.12);
  context.fillStyle = gold;
  // Pixel sun: a filled diamond-ish block circle on the TREE_PX grid.
  const cells: Array<[number, number]> = [
    [-2, -1],
    [-1, -1],
    [0, -1],
    [1, -1],
    [-3, 0],
    [-2, 0],
    [-1, 0],
    [0, 0],
    [1, 0],
    [2, 0],
    [-3, 1],
    [-2, 1],
    [-1, 1],
    [0, 1],
    [1, 1],
    [2, 1],
    [-2, 2],
    [-1, 2],
    [0, 2],
    [1, 2],
  ];
  for (const [dx, dy] of cells) {
    context.fillRect(cx + dx * TREE_PX, cy + dy * TREE_PX, TREE_PX, TREE_PX);
  }
  // Short pixel rays.
  context.fillStyle = goldDeep;
  for (const [dx, dy] of [
    [0, -3],
    [0, 4],
    [-4, 0],
    [3, 0],
    [-3, -2],
    [2, -2],
    [-3, 3],
    [2, 3],
  ] as Array<[number, number]>) {
    context.fillRect(cx + dx * TREE_PX, cy + dy * TREE_PX, TREE_PX, TREE_PX);
  }
}

/** A tiny pixel star on the integer grid so scroll does not shimmer. */
function drawPixelStar(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const charcoal = mixToken("--tiny-charcoal", "#403738", "--tiny-white", "#fffdfc", 0.35);
  context.fillStyle = charcoal;
  const arm = size === 2 ? 3 : 2;
  context.fillRect(x, y - arm, 1, arm * 2 + 1);
  context.fillRect(x - arm, y, arm * 2 + 1, 1);
  if (size === 2) {
    context.fillRect(x - 1, y - 1, 3, 3);
  }
}

/** Pixel pines and shrubs at a few shapes and scales, drawn in TREE_PX blocks. */
function drawPixelTree(
  context: CanvasRenderingContext2D,
  left: number,
  ground: number,
  shape: number,
  scale: number,
  foliage: string,
  foliageLight: string,
  trunk: string,
) {
  const px = Math.max(2, Math.round(TREE_PX * scale));
  const x = Math.floor(left / px) * px;
  const rows =
    shape === 0
      ? ["..##..", ".####.", "######", ".####.", "..##.."]
      : shape === 1
        ? ["...#...", "..###..", ".#####.", "#######", ".#####.", "..###.."]
        : shape === 2
          ? [".###.", "#####", ".###."]
          : shape === 3
            ? ["...#..", "..###.", ".#####", "#######", "#######", "..###.."]
            : ["####", "####"];
  const trunkHeight = shape === 2 || shape === 4 ? 1 : 2;
  const trunkWidth = shape === 1 || shape === 3 ? 2 : 1;
  const top = ground - (rows.length + trunkHeight) * px;
  rows.forEach((row, rowIndex) => {
    [...row].forEach((cell, colIndex) => {
      if (cell !== "#") {
        return;
      }
      context.fillStyle = rowIndex % 2 === 0 ? foliage : foliageLight;
      context.fillRect(x + colIndex * px, top + rowIndex * px, px, px);
    });
  });
  const trunkX = x + Math.floor((rows[0]!.length - trunkWidth) / 2) * px;
  context.fillStyle = trunk;
  context.fillRect(trunkX, ground - trunkHeight * px, trunkWidth * px, trunkHeight * px);
}

function drawObstacle(context: CanvasRenderingContext2D, obstacle: HopObstacle, ground: number) {
  const top = ground - obstacle.height;
  switch (obstacle.kind) {
    case "mug": {
      const fill = token("--tiny-peach", "#f5cfc0");
      const stroke = token("--tiny-gold-deep", "#8a5d00");
      roundedRect(context, obstacle.x, top + 4, obstacle.width * 0.72, obstacle.height - 4, 4);
      context.fillStyle = fill;
      context.fill();
      context.strokeStyle = stroke;
      context.lineWidth = 1.5;
      context.stroke();
      // Handle.
      context.beginPath();
      context.arc(obstacle.x + obstacle.width * 0.72, top + obstacle.height * 0.55, obstacle.width * 0.28, -0.6, 0.6);
      context.stroke();
      return;
    }
    case "note": {
      const fill = token("--tiny-gold", "#f2c14e");
      const stroke = token("--tiny-gold-deep", "#8a5d00");
      roundedRect(context, obstacle.x, top, obstacle.width, obstacle.height, 2);
      context.fillStyle = fill;
      context.fill();
      context.strokeStyle = stroke;
      context.lineWidth = 1.5;
      context.stroke();
      // Folded corner.
      context.beginPath();
      context.moveTo(obstacle.x + obstacle.width - 8, top);
      context.lineTo(obstacle.x + obstacle.width, top + 8);
      context.lineTo(obstacle.x + obstacle.width - 8, top + 8);
      context.closePath();
      context.fillStyle = token("--tiny-white", "#fffdfc");
      context.fill();
      context.stroke();
      return;
    }
    case "book": {
      const fill = token("--tiny-lavender-light", "#d9d0ed");
      const stroke = token("--tiny-lavender-deep", "#6b5a9a");
      roundedRect(context, obstacle.x, top, obstacle.width, obstacle.height, 3);
      context.fillStyle = fill;
      context.fill();
      context.strokeStyle = stroke;
      context.lineWidth = 1.5;
      context.stroke();
      context.beginPath();
      context.moveTo(obstacle.x + 6, top + 2);
      context.lineTo(obstacle.x + 6, top + obstacle.height - 2);
      context.stroke();
      return;
    }
    case "eraser": {
      const fill = token("--tiny-pink", "#f4c1d4");
      const stroke = mixToken("--tiny-pink", "#f4c1d4", "--tiny-charcoal", "#403738", 0.35);
      roundedRect(context, obstacle.x, top, obstacle.width, obstacle.height, 4);
      context.fillStyle = fill;
      context.fill();
      context.strokeStyle = stroke;
      context.lineWidth = 1.5;
      context.stroke();
      // Soft bevel stripe so it reads as a pink eraser, not a flat block.
      context.fillStyle = token("--tiny-white", "#fffdfc");
      context.globalAlpha = 0.35;
      roundedRect(context, obstacle.x + 3, top + 3, obstacle.width - 6, Math.max(4, obstacle.height * 0.28), 2);
      context.fill();
      context.globalAlpha = 1;
      return;
    }
    case "double": {
      const fill = token("--tiny-lavender-light", "#d9d0ed");
      const stroke = token("--tiny-lavender-deep", "#6b5a9a");
      const gap = 3;
      const column = (obstacle.width - gap) / 2;
      drawKeycapStack(context, obstacle.x, top, column, obstacle.height, fill, stroke);
      drawKeycapStack(context, obstacle.x + column + gap, top, column, obstacle.height, fill, stroke);
      return;
    }
    default: {
      const fill = token("--tiny-lavender-light", "#d9d0ed");
      const stroke = token("--tiny-lavender-deep", "#6b5a9a");
      drawKeycapStack(context, obstacle.x, top, obstacle.width, obstacle.height, fill, stroke);
    }
  }
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
