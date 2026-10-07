import { describe, expect, it } from "vitest";
import { pick, seededRandom } from "../../test/seededRandom";
import {
  HOP,
  createHop,
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
      obstacles: [{ x: HOP.keycapX + 5, width: 30, height: 40 }],
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
      obstacles: [{ x: HOP.keycapX + 5, width: 30, height: HOP.tallestObstacle }],
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
});
