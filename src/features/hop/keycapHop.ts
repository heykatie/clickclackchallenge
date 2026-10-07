/**
 * Keycap Hop: the booth's own little runner, found by tapping the logo (or a short Escape) on Ready when there are
 * no scores to show yet. A keycap bounces along and jumps keycap stacks and cables. This module is the game itself,
 * with no drawing, so its physics and spacing can be tested exactly. Units are pixels of a 600 × 160 world.
 */

export interface HopObstacle {
  /** Left edge, in world pixels. */
  x: number;
  width: number;
  height: number;
}

export interface HopState {
  /** The keycap's height above the ground. */
  height: number;
  /** Upward speed, pixels per second. */
  velocity: number;
  /** Ground speed, pixels per second. */
  speed: number;
  distance: number;
  obstacles: HopObstacle[];
  /** Space to leave before the next obstacle appears. */
  nextGap: number;
  running: boolean;
  crashed: boolean;
}

const GRAVITY = 2600;
const JUMP_VELOCITY = 820;
/** A gap crosses the screen in a few seconds, gaining up to this much speed on the way. */
const SPEED_HEADROOM = 40;
/** Collisions forgive a few pixels on every side, so a near miss feels like a miss. */
const FORGIVENESS = 4;

export const HOP = {
  worldWidth: 600,
  worldHeight: 160,
  keycapX: 50,
  keycapSize: 34,
  startSpeed: 280,
  maxSpeed: 640,
  /** Speed gained each second of running. */
  acceleration: 10,
  tallestObstacle: 46,
  /** The top of a jump: v² / 2g. */
  jumpPeak: (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY),
  /** Room after one obstacle to land and jump again: a jump's air time at this speed, plus a little ground. */
  minGap: (speed: number) => speed * ((2 * JUMP_VELOCITY) / GRAVITY) + 60,
};

export function createHop(): HopState {
  return {
    height: 0,
    velocity: 0,
    speed: HOP.startSpeed,
    distance: 0,
    obstacles: [],
    nextGap: HOP.minGap(HOP.startSpeed),
    running: false,
    crashed: false,
  };
}

/** Jumps from the ground. The first jump starts the run, and a jump after a crash starts a fresh one. */
export function jumpHop(state: HopState): HopState {
  if (state.crashed) {
    return { ...createHop(), running: true, velocity: JUMP_VELOCITY };
  }
  if (state.height > 0) {
    return state;
  }
  return { ...state, running: true, velocity: JUMP_VELOCITY };
}

export function hopScore(state: HopState): number {
  return Math.floor(state.distance / 25);
}

function newObstacle(random: () => number): HopObstacle {
  // Two kinds: a tall stack of keycaps, or a long, low tangle of cable.
  if (random() < 0.65) {
    return { x: HOP.worldWidth, width: 22 + Math.round(random() * 12), height: 28 + Math.round(random() * 18) };
  }
  return { x: HOP.worldWidth, width: 40 + Math.round(random() * 16), height: 14 + Math.round(random() * 6) };
}

function hits(state: HopState, obstacle: HopObstacle): boolean {
  const left = HOP.keycapX + FORGIVENESS;
  const right = HOP.keycapX + HOP.keycapSize - FORGIVENESS;
  const overlapsSideways = right > obstacle.x && left < obstacle.x + obstacle.width;
  return overlapsSideways && state.height < obstacle.height - FORGIVENESS;
}

/** Moves the world on by dt seconds. Pure: the same state, time, and random numbers always give the same result. */
export function stepHop(state: HopState, dt: number, random: () => number): HopState {
  if (!state.running || state.crashed) {
    return state;
  }
  let velocity = state.velocity - GRAVITY * dt;
  let height = state.height + velocity * dt;
  if (height <= 0) {
    height = 0;
    velocity = 0;
  }
  const speed = Math.min(HOP.maxSpeed, state.speed + HOP.acceleration * dt);
  const moved = speed * dt;
  const obstacles = state.obstacles
    .map((obstacle) => ({ ...obstacle, x: obstacle.x - moved }))
    .filter((obstacle) => obstacle.x + obstacle.width > 0);

  let nextGap = state.nextGap;
  const last = obstacles.at(-1);
  if (!last || last.x + last.width + nextGap <= HOP.worldWidth) {
    obstacles.push(newObstacle(random));
    // Spaced for a little more speed than now: the run keeps speeding up while this gap crosses the screen.
    nextGap = HOP.minGap(Math.min(HOP.maxSpeed, speed + SPEED_HEADROOM)) + random() * 220;
  }

  const next: HopState = { ...state, height, velocity, speed, distance: state.distance + moved, obstacles, nextGap };
  if (obstacles.some((obstacle) => hits(next, obstacle))) {
    return { ...next, running: false, crashed: true };
  }
  return next;
}
