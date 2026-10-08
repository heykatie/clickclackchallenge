import { describe, expect, it } from "vitest";
import { pick, seededRandom } from "../../test/seededRandom";
import {
  HOP,
  createHop,
  hopDifficulty,
  hopLevel,
  hopScore,
  jumpHop,
  stepHop,
  type HopState,
} from "./keycapHop";

const FRAME = 1 / 60;

function run(state: HopState, seconds: number, random: () => number = () => 0.5): HopState {
  let next = state;
  for (let t = 0; t < seconds; t += FRAME) {
    next = stepHop(next, FRAME, random);
  }
  return next;
}

describe("Keycap Hop", () => {
  it("starts on the ground, not running, with no obstacles and a score of 0", () => {
    const hop = createHop();
    expect(hop.height).toBe(0);
    expect(hop.running).toBe(false);
    expect(hop.obstacles).toEqual([]);
    expect(hopScore(hop)).toBe(0);
  });

  it("starts running on the first jump, rises, and lands back on the ground", () => {
    const jumped = jumpHop(createHop());
    expect(jumped.running).toBe(true);
    expect(jumped.velocity).toBeGreaterThan(0);
    const midAir = run(jumped, 0.25);
    expect(midAir.height).toBeGreaterThan(40);
    const landed = run(midAir, 1);
    expect(landed.height).toBe(0);
    expect(landed.velocity).toBe(0);
  });

  it("only jumps from the ground, so holding or mashing jump does not fly", () => {
    const midAir = run(jumpHop(createHop()), 0.2);
    expect(jumpHop(midAir)).toBe(midAir);
  });

  it("clears the tallest obstacle at the top of a jump", () => {
    expect(HOP.jumpPeak).toBeGreaterThan(HOP.tallestObstacle + 10);
  });

  it("speeds up as it runs, up to a cap, and the score counts distance", () => {
    const start = jumpHop(createHop());
    const later = run(start, 10);
    expect(later.speed).toBeGreaterThan(start.speed);
    expect(hopScore(later)).toBeGreaterThan(0);
    const muchLater = { ...later, speed: HOP.maxSpeed };
    expect(stepHop(muchLater, FRAME, () => 0.5).speed).toBe(HOP.maxSpeed);
  });

  it("always leaves room to land and jump again between obstacles, at any speed", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const random = seededRandom(seed);
      let hop: HopState = { ...jumpHop(createHop()), speed: pick(random, [HOP.startSpeed, 400, HOP.maxSpeed]) };
      for (let t = 0; t < 20; t += FRAME) {
        // Keep it alive and airborne-free so only spacing is tested.
        hop = { ...stepHop(hop, FRAME, random), crashed: false, running: true, height: 0, velocity: 0 };
      }
      const xs = hop.obstacles.map((obstacle) => obstacle.x).sort((a, b) => a - b);
      for (let index = 1; index < xs.length; index += 1) {
        const previous = hop.obstacles.find((obstacle) => obstacle.x === xs[index - 1])!;
        const gap = xs[index]! - (xs[index - 1]! + previous.width);
        expect(gap, `seed ${seed}`).toBeGreaterThanOrEqual(HOP.minGap(hop.speed));
      }
    }
  });

  it("crashes on hitting an obstacle and then stops moving", () => {
    const hop: HopState = {
      ...jumpHop(createHop()),
      height: 0,
      velocity: 0,
      obstacles: [{ x: HOP.keycapX + 5, width: 30, height: 40, kind: "stack" }],
    };
    const crashed = stepHop(hop, FRAME, () => 0.5);
    expect(crashed.crashed).toBe(true);
    expect(crashed.running).toBe(false);
    expect(stepHop(crashed, FRAME, () => 0.5)).toBe(crashed);
  });

  it("passes over an obstacle while high enough in the air", () => {
    const hop: HopState = {
      ...jumpHop(createHop()),
      height: HOP.tallestObstacle + 20,
      velocity: 0,
      obstacles: [{ x: HOP.keycapX + 5, width: 30, height: HOP.tallestObstacle, kind: "stack" }],
    };
    expect(stepHop(hop, FRAME, () => 0.5).crashed).toBe(false);
  });

  it("starts a fresh run on a jump after crashing, keeping nothing from the last run", () => {
    const crashed: HopState = { ...run(jumpHop(createHop()), 3), crashed: true, running: false };
    const again = jumpHop(crashed);
    expect(again.crashed).toBe(false);
    expect(again.running).toBe(true);
    expect(again.obstacles).toEqual([]);
    expect(hopScore(again)).toBe(0);
  });

  it("gets harder gradually: a level every 100 points, and difficulty rising from 0 to 1", () => {
    const at = (score: number): HopState => ({ ...createHop(), distance: score * 25 });
    expect(hopLevel(at(0))).toBe(1);
    expect(hopLevel(at(99))).toBe(1);
    expect(hopLevel(at(100))).toBe(2);
    expect(hopLevel(at(450))).toBe(5);
    expect(hopDifficulty(at(0))).toBe(0);
    expect(hopDifficulty(at(300))).toBeGreaterThan(hopDifficulty(at(100)));
    expect(hopDifficulty(at(5_000))).toBe(1);
  });

  it("brings taller stacks, double stacks, and tighter gaps as it gets harder", () => {
    const sample = (score: number) => {
      const random = seededRandom(score + 1);
      let hop: HopState = { ...jumpHop(createHop()), distance: score * 25 };
      const seen: HopState["obstacles"] = [];
      const gaps: number[] = [];
      for (let t = 0; t < 60; t += FRAME) {
        const before = hop.obstacles.length;
        hop = { ...stepHop(hop, FRAME, random), crashed: false, running: true, height: 0, velocity: 0, distance: score * 25 };
        if (hop.obstacles.length > before) {
          seen.push(hop.obstacles.at(-1)!);
          gaps.push(hop.nextGap - HOP.minGap(Math.min(HOP.maxSpeed, hop.speed + 40)));
        }
      }
      return { seen, extraGap: gaps.reduce((a, b) => a + b, 0) / gaps.length };
    };
    const easy = sample(0);
    const hard = sample(2_000);
    expect(easy.seen.some((obstacle) => obstacle.kind === "double")).toBe(false);
    expect(hard.seen.some((obstacle) => obstacle.kind === "double")).toBe(true);
    expect(Math.max(...hard.seen.map((obstacle) => obstacle.height))).toBeGreaterThan(Math.max(...easy.seen.map((obstacle) => obstacle.height)));
    expect(hard.extraGap).toBeLessThan(easy.extraGap);
    expect(Math.max(...hard.seen.map((obstacle) => obstacle.height))).toBeLessThanOrEqual(HOP.tallestObstacle);
  });

  it("stays fair at its hardest: a well-timed hopper clears 60 seconds of every run", () => {
    for (let seed = 1; seed <= 120; seed += 1) {
      const random = seededRandom(seed);
      // Start at full difficulty and top speed.
      let hop: HopState = { ...jumpHop(createHop()), distance: 10_000 * 25, speed: HOP.maxSpeed, velocity: 0 };
      for (let t = 0; t < 60; t += FRAME) {
        const keycapMiddle = HOP.keycapX + HOP.keycapSize / 2;
        const next = hop.obstacles.find((obstacle) => obstacle.x + obstacle.width > HOP.keycapX);
        // Hop so the top of the jump lands over the obstacle's middle.
        if (next && hop.height === 0 && next.x + next.width / 2 - keycapMiddle <= hop.speed * HOP.timeToPeak) {
          hop = jumpHop(hop);
        }
        hop = stepHop(hop, FRAME, random);
        expect(hop.crashed, `seed ${seed} at ${t.toFixed(2)}s`).toBe(false);
      }
    }
  }, 60_000);
});

