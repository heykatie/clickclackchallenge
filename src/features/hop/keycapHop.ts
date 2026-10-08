/**
 * Keycap Hop: the booth's own little runner, found by tapping the logo (or a short Escape) on Ready when there are
 * no scores to show yet. A keycap bounces along and jumps desk clutter. This module is the game itself, with no
 * drawing, so its physics and spacing can be tested exactly. Units are pixels of a 600 × 160 world.
 */

export type HopObstacleKind = "stack" | "double" | "mug" | "note" | "book" | "eraser";
export type HopPowerKind = "slow" | "big" | "small";

export interface HopObstacle {
  /** Left edge, in world pixels. */
  x: number;
  width: number;
  height: number;
  /** Desk clutter: mug, sticky note, book, pink eraser, keycap stack, or a wide double stack later on. */
  kind: HopObstacleKind;
}

export interface HopPowerUp {
  x: number;
  /** Height of the pickup above the ground. */
  y: number;
  kind: HopPowerKind;
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
  powerUps: HopPowerUp[];
  /** Space to leave before the next obstacle appears. */
  nextGap: number;
  /** Extra gap used last spawn, so the next one can avoid looking the same. */
  lastExtraGap: number;
  /** Distance when the last power-up was spawned; keeps them from stacking. */
  lastPowerDistance: number;
  /** Per-run offset so obstacle kind rolls and power-up order differ each round. */
  runSalt: number;
  /** Rotates which power-up kind is favored first this round. */
  powerRotate: number;
  running: boolean;
  crashed: boolean;
  /** True after an early release already shortened this hop. */
  cutShort: boolean;
  /** Seconds of slowed scrolling left. */
  slowRemaining: number;
  /** Seconds left on a big/small size effect. */
  sizeRemaining: number;
  /** 1 is normal; big is larger, small is tinier. */
  sizeScale: number;
}

const GRAVITY = 2600;
/** Full hop while the jump key stays held through the rise. */
const JUMP_VELOCITY = 820;
/**
 * Letting go early multiplies upward speed by this, so a tap is a short hop and a hold reaches the full peak.
 * Chosen so a quick release still clears a low book, but not the tallest stack.
 */
const EARLY_RELEASE = 0.48;
/** A gap crosses the screen in a few seconds, gaining up to this much speed on the way. */
const SPEED_HEADROOM = 40;
/** Collisions forgive a few pixels on every side, so a near miss feels like a miss. */
const FORGIVENESS = 4;
/** Score at which difficulty hits 1 — a bit sooner than before so the ramp is felt. */
const DIFFICULTY_SCORE = 450;
const SLOW_SECONDS = 4;
const SIZE_SECONDS = 5;
const SIZE_BIG = 1.4;
const SIZE_SMALL = 0.62;
const SLOW_FACTOR = 0.52;
/** While slowed, falling is softer so hops hang longer (and cover more ground) without raising the peak. */
const SLOW_FALL = 0.42;
/** Score span per level ding; difficulty still ramps on DIFFICULTY_SCORE, not this. */
const LEVEL_SCORE = 150;
/** Extra gap bands, in world pixels, so consecutive obstacles do not feel evenly spaced. */
const EXTRA_GAP_BANDS = [36, 70, 110, 160, 220, 290] as const;
/** Minimum run distance between power-up spawns so they stay occasional, without feeling sparse. */
const POWER_COOLDOWN = 240;
/** Wait at least this far before the first power-up can appear. */
const POWER_EARLY_AFTER = 320;
const POWER_KINDS: HopPowerKind[] = ["slow", "big", "small"];

export const HOP = {
  worldWidth: 600,
  /** Tall enough that a held hop (even when big) clears the top of the strip. */
  worldHeight: 212,
  keycapX: 50,
  keycapSize: 34,
  startSpeed: 280,
  maxSpeed: 760,
  /** Speed gained each second of running. */
  acceleration: 10,
  tallestObstacle: 60,
  /** Seconds from leaving the ground to the top of a held jump. */
  timeToPeak: JUMP_VELOCITY / GRAVITY,
  /** The top of a held jump: v² / 2g. A tap peaks lower after releaseJump. */
  jumpPeak: (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY),
  /** Peak height after an early release, for tests. */
  jumpPeakShort: ((JUMP_VELOCITY * EARLY_RELEASE) * (JUMP_VELOCITY * EARLY_RELEASE)) / (2 * GRAVITY),
  /** Room after one obstacle to land and jump again: a jump's air time at this speed, plus a little ground. */
  minGap: (speed: number) => speed * ((2 * JUMP_VELOCITY) / GRAVITY) + 60,
  powerSlowSeconds: SLOW_SECONDS,
  powerSizeSeconds: SIZE_SECONDS,
  sizeBig: SIZE_BIG,
  sizeSmall: SIZE_SMALL,
};

/** A fresh run. Pass a random source so each round (and each retry after a bonk) reshuffles gaps and kinds. */
export function createHop(random: () => number = Math.random): HopState {
  const lastExtraGap = EXTRA_GAP_BANDS[Math.floor(random() * EXTRA_GAP_BANDS.length)]!;
  return {
    height: 0,
    velocity: 0,
    speed: HOP.startSpeed,
    distance: 0,
    obstacles: [],
    powerUps: [],
    nextGap: HOP.minGap(HOP.startSpeed) + lastExtraGap + random() * 55,
    lastExtraGap,
    lastPowerDistance: -POWER_COOLDOWN,
    runSalt: random(),
    powerRotate: Math.floor(random() * POWER_KINDS.length),
    running: false,
    crashed: false,
    cutShort: false,
    slowRemaining: 0,
    sizeRemaining: 0,
    sizeScale: 1,
  };
}

/** Drawn / collision size of the keycap for the current size power-up. */
export function hopKeycapSize(state: HopState): number {
  return HOP.keycapSize * state.sizeScale;
}

/** Left edge of the keycap, centered on the usual lane when size changes. */
export function hopKeycapLeft(state: HopState): number {
  return HOP.keycapX + (HOP.keycapSize - hopKeycapSize(state)) / 2;
}

/** Jumps from the ground. The first jump starts the run, and a jump after a crash starts a fresh shuffled one. */
export function jumpHop(state: HopState, random: () => number = Math.random): HopState {
  if (state.crashed) {
    return { ...createHop(random), running: true, velocity: JUMP_VELOCITY };
  }
  if (state.height > 0) {
    return state;
  }
  return { ...state, running: true, velocity: JUMP_VELOCITY, cutShort: false };
}

/**
 * Cuts a hop short when the jump key is released while still rising. Hold through the rise for the full height;
 * a tap is shorter and lands sooner. Safe to call more than once: only the first release shortens.
 */
export function releaseJump(state: HopState): HopState {
  if (!state.running || state.crashed || state.cutShort || state.velocity <= 0) {
    return state;
  }
  return { ...state, velocity: state.velocity * EARLY_RELEASE, cutShort: true };
}

export function hopScore(state: HopState): number {
  return Math.floor(state.distance / 25);
}

/** A new level every LEVEL_SCORE points, as the milestone ding marks. */
export function hopLevel(state: HopState): number {
  return 1 + Math.floor(hopScore(state) / LEVEL_SCORE);
}

/** How hard the run is, from 0 at the start to 1 at DIFFICULTY_SCORE and beyond. */
export function hopDifficulty(state: HopState): number {
  return Math.min(1, hopScore(state) / DIFFICULTY_SCORE);
}

const EASY_KINDS: HopObstacleKind[] = ["mug", "note", "book", "eraser", "stack"];

/**
 * The next obstacle. Early runs mix mugs, sticky notes, books, and pink erasers; stacks and wide doubles show up more
 * as it gets harder. `runSalt` rotates which easy kinds show up first so rounds do not rhyme. Heights stay under the
 * tallest a held hop clears, as the fairness test proves.
 */
function newObstacle(random: () => number, difficulty: number, runSalt: number): HopObstacle {
  const roll = (random() + runSalt) % 1;
  const tall = (base: number, span: number) => base + Math.round(random() * (span + 14 * difficulty));
  if (roll < 0.22 * difficulty) {
    return { x: HOP.worldWidth, width: 50 + Math.round(random() * 12), height: tall(26, 12), kind: "double" };
  }
  const easy = (roll - 0.22 * difficulty) / Math.max(0.001, 1 - 0.22 * difficulty);
  const rotated = EASY_KINDS[(Math.floor(easy * EASY_KINDS.length) + Math.floor(runSalt * EASY_KINDS.length)) % EASY_KINDS.length]!;
  if (rotated === "mug") {
    return { x: HOP.worldWidth, width: 22 + Math.round(random() * 8), height: tall(24, 16), kind: "mug" };
  }
  if (rotated === "note") {
    return { x: HOP.worldWidth, width: 26 + Math.round(random() * 10), height: tall(22, 14), kind: "note" };
  }
  if (rotated === "book") {
    return { x: HOP.worldWidth, width: 36 + Math.round(random() * 14), height: tall(16, 10), kind: "book" };
  }
  if (rotated === "eraser") {
    return { x: HOP.worldWidth, width: 28 + Math.round(random() * 10), height: tall(18, 12), kind: "eraser" };
  }
  return { x: HOP.worldWidth, width: 22 + Math.round(random() * 12), height: tall(28, 18), kind: "stack" };
}

/** Uneven extras: pick a band unlike the last one, then nudge it, and shrink the range a little as it gets harder. */
function nextExtraGap(random: () => number, difficulty: number, lastExtraGap: number): number {
  const shrink = 1 - 0.35 * difficulty;
  let extra = lastExtraGap;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const band = EXTRA_GAP_BANDS[Math.floor(random() * EXTRA_GAP_BANDS.length)]!;
    extra = band * shrink + random() * 28 * shrink;
    if (Math.abs(extra - lastExtraGap) >= 40 * shrink || attempt === 5) {
      break;
    }
  }
  return extra;
}

/**
 * Min space between a power-up's edge and an obstacle's edge. Tight enough that the orb sits in the same hop as
 * the hazard (so grabbing it does not leave you open), without letting them touch.
 */
const POWER_CLEARANCE = 56;
/** Power-up hit radius used for spacing and pickup (drawn a touch larger on the canvas). */
const POWER_RADIUS = 15;

/** Kind for a new orb; the first of a round is never slow. */
function powerKind(random: () => number, powerRotate: number, allowSlow: boolean): HopPowerKind {
  const kinds = allowSlow ? POWER_KINDS : POWER_KINDS.filter((kind) => kind !== "slow");
  const index = (Math.floor(random() * kinds.length) + powerRotate) % kinds.length;
  return kinds[index]!;
}

/**
 * Horizontal lead so a hop for the orb lands before the hazard: full air time at this speed, plus a little ground.
 */
export function slowBeforeLead(speed: number): number {
  const airTime = (2 * JUMP_VELOCITY) / GRAVITY;
  return speed * airTime + HOP.keycapSize + POWER_CLEARANCE;
}

type PowerBand = "walk" | "hop" | "high";

/**
 * Reach band by difficulty: early runs favor walk-in orbs in front of you; later runs ask for higher, harder hops.
 * Gradual — difficulty 0…1 blends the weights.
 */
function pickPowerBand(difficulty: number, random: () => number): PowerBand {
  const walkChance = 0.7 * (1 - difficulty);
  const highChance = 0.12 + 0.58 * difficulty;
  const roll = random();
  if (roll < walkChance) {
    return "walk";
  }
  if (roll > 1 - highChance) {
    return "high";
  }
  return "hop";
}

/** Orb height for a band. Walk clears a standing keycap; high needs a committed hop. */
function powerHeight(band: PowerBand, obstacle: HopObstacle, random: () => number, difficulty: number): number {
  if (band === "walk") {
    // Overlaps the standing keycap — no jump required.
    return 12 + random() * 14;
  }
  if (band === "hop") {
    return Math.min(72, Math.max(38, obstacle.height * 0.55 + 18 + random() * (12 + 10 * difficulty)));
  }
  return Math.min(HOP.jumpPeak - 8, 56 + difficulty * 30 + random() * 16);
}

/**
 * Places an orb with its paired obstacle. Preserves prior rules: big/small stay clear just before the hazard;
 * slow is over, after, or far enough before that a collect hop lands short. Height and how often orbs ask for a
 * jump ease in with difficulty — easy runs hand more walk-in pickups out in front.
 */
function powerForObstacle(
  obstacle: HopObstacle,
  random: () => number,
  powerRotate: number,
  allowSlow: boolean,
  speed: number,
  difficulty: number,
): HopPowerUp {
  const kind = powerKind(random, powerRotate, allowSlow);
  const band = pickPowerBand(difficulty, random);
  const y = powerHeight(band, obstacle, random, difficulty);
  if (kind === "slow") {
    const overPeak = Math.min(HOP.jumpPeak - 8, obstacle.height + POWER_RADIUS + 18 + random() * 14);
    // Easy: favor after / far-before at walk height. Hard: favor over and high arcs.
    const overWeight = 0.12 + 0.48 * difficulty;
    const afterWeight = 0.5 - 0.18 * difficulty;
    const slot = random();
    if (slot < overWeight) {
      return {
        x: obstacle.x + obstacle.width / 2,
        y: overPeak,
        kind: "slow",
      };
    }
    if (slot < overWeight + afterWeight) {
      return {
        x: obstacle.x + obstacle.width + POWER_CLEARANCE + POWER_RADIUS + random() * 18,
        y,
        kind: "slow",
      };
    }
    // Before the hazard, but with enough runway that landing from the collect hop is still short of it.
    const lead = slowBeforeLead(Math.min(HOP.maxSpeed, speed + SPEED_HEADROOM));
    return {
      x: obstacle.x - lead - random() * 24,
      y,
      kind: "slow",
    };
  }
  // Big/small: walk-in sits further in front; hop/high stay tucked just before the clear.
  const approach =
    band === "walk"
      ? POWER_CLEARANCE + POWER_RADIUS + 36 + random() * (50 + 40 * (1 - difficulty))
      : POWER_CLEARANCE + POWER_RADIUS + random() * 18;
  return {
    x: obstacle.x - approach,
    y,
    kind,
  };
}

function powerBlockedByObstacles(x: number, obstacles: HopObstacle[]): boolean {
  const left = x - POWER_RADIUS - POWER_CLEARANCE;
  const right = x + POWER_RADIUS + POWER_CLEARANCE;
  return obstacles.some((obstacle) => obstacle.x < right && obstacle.x + obstacle.width > left);
}

function obstacleBlockedByPowers(x: number, width: number, powers: HopPowerUp[]): boolean {
  const left = x - POWER_CLEARANCE;
  const right = x + width + POWER_CLEARANCE;
  return powers.some((power) => power.x + POWER_RADIUS > left && power.x - POWER_RADIUS < right);
}

/**
 * First orb after a short warm-up, then a cooldown for the whole run — including late hard stretches, so power-ups
 * never simply vanish once the difficulty tops out. Early runs spawn more often; hard runs stay occasional.
 */
function shouldSpawnPowerUp(
  difficulty: number,
  distance: number,
  lastPowerDistance: number,
  random: () => number,
): boolean {
  // Shorter gaps between orbs while it is still easy.
  const cooldown = POWER_COOLDOWN * (0.62 + 0.38 * difficulty);
  if (distance - lastPowerDistance < cooldown) {
    return false;
  }
  const first = lastPowerDistance < 0;
  if (first) {
    if (distance < POWER_EARLY_AFTER) {
      return false;
    }
    return random() < 0.34 || distance >= POWER_EARLY_AFTER + 220;
  }
  // About 22% per open lane at difficulty 0 → about 8% at full difficulty.
  return random() < 0.08 + 0.14 * (1 - difficulty);
}

function hitsObstacle(state: HopState, obstacle: HopObstacle): boolean {
  const size = hopKeycapSize(state);
  const left = hopKeycapLeft(state) + FORGIVENESS;
  const right = hopKeycapLeft(state) + size - FORGIVENESS;
  const overlapsSideways = right > obstacle.x && left < obstacle.x + obstacle.width;
  return overlapsSideways && state.height < obstacle.height - FORGIVENESS;
}

function hitsPowerUp(state: HopState, power: HopPowerUp): boolean {
  const size = hopKeycapSize(state);
  const left = hopKeycapLeft(state);
  const right = left + size;
  const bottom = state.height;
  const top = state.height + size;
  const px = power.x;
  const py = power.y;
  return right > px - POWER_RADIUS && left < px + POWER_RADIUS && top > py - POWER_RADIUS && bottom < py + POWER_RADIUS;
}

function applyPowerUp(state: HopState, kind: HopPowerKind): HopState {
  if (kind === "slow") {
    return {
      ...state,
      slowRemaining: SLOW_SECONDS,
      speed: Math.min(state.speed, HOP.startSpeed + 80),
    };
  }
  if (kind === "big") {
    return { ...state, sizeScale: SIZE_BIG, sizeRemaining: SIZE_SECONDS };
  }
  return { ...state, sizeScale: SIZE_SMALL, sizeRemaining: SIZE_SECONDS };
}

/** Moves the world on by dt seconds. Pure: the same state, time, and random numbers always give the same result. */
export function stepHop(state: HopState, dt: number, random: () => number): HopState {
  if (!state.running || state.crashed) {
    return state;
  }
  const slowed = state.slowRemaining > 0;
  // Soften only the fall while slowed so air time stretches without a higher peak that would clip the strip.
  const gravity = slowed && state.velocity < 0 ? GRAVITY * SLOW_FALL : GRAVITY;
  let velocity = state.velocity - gravity * dt;
  let height = state.height + velocity * dt;
  if (height <= 0) {
    height = 0;
    velocity = 0;
  }

  let slowRemaining = Math.max(0, state.slowRemaining - dt);
  let sizeRemaining = Math.max(0, state.sizeRemaining - dt);
  let sizeScale = sizeRemaining > 0 ? state.sizeScale : 1;

  const accelerating = slowed ? HOP.acceleration * 0.25 : HOP.acceleration;
  const speed = Math.min(HOP.maxSpeed, state.speed + accelerating * dt);
  const scroll = speed * (slowed ? SLOW_FACTOR : 1);
  const moved = scroll * dt;

  let obstacles = state.obstacles
    .map((obstacle) => ({ ...obstacle, x: obstacle.x - moved }))
    .filter((obstacle) => obstacle.x + obstacle.width > 0);
  let powerUps = state.powerUps
    .map((power) => ({ ...power, x: power.x - moved }))
    .filter((power) => power.x > -20);

  let nextGap = state.nextGap;
  let lastExtraGap = state.lastExtraGap;
  let lastPowerDistance = state.lastPowerDistance;
  const last = obstacles.at(-1);
  const distance = state.distance + moved;
  const difficulty = hopDifficulty(state);
  const laneOpen = !last || last.x + last.width + nextGap <= HOP.worldWidth;
  if (laneOpen) {
    const obstacle = newObstacle(random, difficulty, state.runSalt);
    if (!obstacleBlockedByPowers(obstacle.x, obstacle.width, powerUps)) {
      obstacles.push(obstacle);
      const extra = nextExtraGap(random, difficulty, lastExtraGap);
      lastExtraGap = extra;
      // Spaced for a little more speed than now: the run keeps speeding up while this gap crosses the screen.
      nextGap = HOP.minGap(Math.min(HOP.maxSpeed, speed + SPEED_HEADROOM)) + extra;
      // Orb rides with this hazard. Slow is over, after, or far enough before; big/small stay clear before it.
      if (shouldSpawnPowerUp(difficulty, distance, lastPowerDistance, random)) {
        const firstOfRound = lastPowerDistance < 0;
        const power = powerForObstacle(obstacle, random, state.powerRotate, !firstOfRound, speed, difficulty);
        // Skip the paired hazard: slow-over shares its x on purpose; only other clutter must stay clear.
        const others = obstacles.filter((item) => item !== obstacle);
        if (!powerBlockedByObstacles(power.x, others)) {
          powerUps.push(power);
          lastPowerDistance = distance;
        }
      }
    } else {
      // A lingering power-up still owns the right lane: wait a bit longer before the next hazard.
      nextGap = Math.max(nextGap, POWER_CLEARANCE + 40);
    }
  }

  let next: HopState = {
    ...state,
    height,
    velocity,
    speed,
    distance: state.distance + moved,
    obstacles,
    powerUps,
    nextGap,
    lastExtraGap,
    lastPowerDistance,
    slowRemaining,
    sizeRemaining,
    sizeScale,
  };

  for (const power of [...powerUps]) {
    if (hitsPowerUp(next, power)) {
      next = applyPowerUp(
        { ...next, powerUps: next.powerUps.filter((item) => item !== power) },
        power.kind,
      );
      powerUps = next.powerUps;
    }
  }

  if (obstacles.some((obstacle) => hitsObstacle(next, obstacle))) {
    return { ...next, running: false, crashed: true };
  }
  return next;
}
