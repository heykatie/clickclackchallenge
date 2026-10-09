import { describe, expect, it } from "vitest";
import { pick, seededRandom } from "../../test/seededRandom";
import {
  HOP,
  createHop,
  hopDifficulty,
  hopLevel,
  hopScore,
  jumpHop,
  releaseJump,
  slowBeforeLead,
  stepHop,
  type HopState,
} from "./keycapHop";

const FRAME = 1 / 60;
/** Long enough for a slow power-up to expire in the power-up test. */
const SLOW_WAIT = 5;
/** Distance at which hopDifficulty is already 1 (score ≥ 450). */
const DIFFICULTY_DISTANCE = 450 * 25;

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

  it("clears the tallest obstacle at the top of a held jump", () => {
    expect(HOP.jumpPeak).toBeGreaterThan(HOP.tallestObstacle + 10);
  });

  it("keeps a held hop (even when big) inside the world so the keycap is not clipped", () => {
    const ground = HOP.worldHeight - 18;
    const top = ground - HOP.keycapSize * HOP.sizeBig - HOP.jumpPeak;
    expect(top).toBeGreaterThan(4);
  });

  it("a held jump rises higher and longer than a tap that releases early", () => {
    const peak = (releaseAfter: number | null) => {
      let hop = jumpHop(createHop());
      let maxHeight = 0;
      let airTime = 0;
      let released = false;
      for (let t = 0; t < 2; t += FRAME) {
        if (releaseAfter !== null && !released && t >= releaseAfter) {
          hop = releaseJump(hop);
          released = true;
        }
        hop = stepHop(hop, FRAME, () => 0.5);
        maxHeight = Math.max(maxHeight, hop.height);
        if (hop.height > 0) {
          airTime += FRAME;
        }
      }
      return { maxHeight, airTime };
    };
    const held = peak(null);
    const tapped = peak(FRAME);
    expect(held.maxHeight).toBeGreaterThan(tapped.maxHeight + 20);
    expect(held.airTime).toBeGreaterThan(tapped.airTime);
    expect(tapped.maxHeight).toBeGreaterThan(16);
    const idle = createHop(() => 0.5);
    expect(releaseJump(idle)).toEqual(idle);
    const rising = run(jumpHop(createHop(() => 0.5)), FRAME);
    expect(releaseJump(releaseJump(rising)).cutShort).toBe(true);
  });

  it("reshuffles gaps and kind order on each new round", () => {
    const a = createHop(seededRandom(1));
    const b = createHop(seededRandom(2));
    expect(a.nextGap !== b.nextGap || a.runSalt !== b.runSalt || a.powerRotate !== b.powerRotate).toBe(true);
    const crashed: HopState = { ...run(jumpHop(createHop(seededRandom(3))), 2), crashed: true, running: false };
    const again = jumpHop(crashed, seededRandom(4));
    expect(again.runSalt).not.toBe(a.runSalt);
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

  it("gets harder gradually: a level every 150 points, and difficulty rising from 0 to 1 by 450 points", () => {
    const at = (score: number): HopState => ({ ...createHop(), distance: score * 25 });
    expect(hopLevel(at(0))).toBe(1);
    expect(hopLevel(at(149))).toBe(1);
    expect(hopLevel(at(150))).toBe(2);
    expect(hopLevel(at(450))).toBe(4);
    expect(hopDifficulty(at(0))).toBe(0);
    expect(hopDifficulty(at(225))).toBe(0.5);
    expect(hopDifficulty(at(300))).toBeGreaterThan(hopDifficulty(at(100)));
    expect(hopDifficulty(at(450))).toBe(1);
  });

  it("makes hops hang longer while slowed, without raising the jump peak", () => {
    const launch = jumpHop(createHop(() => 0.5));
    const normal = run({ ...launch, obstacles: [], powerUps: [], nextGap: 10_000 }, 0.55);
    const slowed = run(
      { ...launch, slowRemaining: 4, obstacles: [], powerUps: [], nextGap: 10_000 },
      0.55,
    );
    // Same rise, then a softer fall: still airborne longer while slowed.
    expect(slowed.height).toBeGreaterThan(normal.height);
    let peakNormal = 0;
    let peakSlow = 0;
    let hopN = launch;
    let hopS: HopState = {
      ...launch,
      slowRemaining: 4,
      obstacles: [],
      powerUps: [],
      nextGap: 10_000,
    };
    for (let t = 0; t < 1.2; t += FRAME) {
      hopN = stepHop({ ...hopN, obstacles: [], powerUps: [], nextGap: 10_000 }, FRAME, () => 0.5);
      hopS = stepHop({ ...hopS, obstacles: [], powerUps: [], nextGap: 10_000 }, FRAME, () => 0.5);
      peakNormal = Math.max(peakNormal, hopN.height);
      peakSlow = Math.max(peakSlow, hopS.height);
    }
    expect(peakSlow).toBeLessThanOrEqual(peakNormal + 1);
  });

  it("mixes desk clutter early, then brings doubles, taller hazards, and tighter gaps as it gets harder", () => {
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
      return { seen, extras: gaps, extraGap: gaps.reduce((a, b) => a + b, 0) / gaps.length };
    };
    const easy = sample(0);
    const hard = sample(2_000);
    const easyKinds = new Set(easy.seen.map((obstacle) => obstacle.kind));
    expect(easy.seen.some((obstacle) => obstacle.kind === "double")).toBe(false);
    expect(["mug", "note", "book", "eraser"].some((kind) => easyKinds.has(kind as HopState["obstacles"][number]["kind"]))).toBe(true);
    expect(
      [...easyKinds].every(
        (kind) => kind === "mug" || kind === "note" || kind === "book" || kind === "eraser" || kind === "stack",
      ),
    ).toBe(true);
    expect(hard.seen.some((obstacle) => obstacle.kind === "double")).toBe(true);
    expect(Math.max(...hard.seen.map((obstacle) => obstacle.height))).toBeGreaterThan(Math.max(...easy.seen.map((obstacle) => obstacle.height)));
    expect(hard.extraGap).toBeLessThan(easy.extraGap);
    expect(Math.max(...hard.seen.map((obstacle) => obstacle.height))).toBeLessThanOrEqual(HOP.tallestObstacle);
    // Extras jump between bands, so a run is not a metronome of equal gaps.
    const rounded = new Set(easy.extras.map((gap) => Math.round(gap / 25)));
    expect(rounded.size).toBeGreaterThanOrEqual(3);
  });

  it("offers slow, big, and small power-ups that change scroll or size for a few seconds", () => {
    const random = seededRandom(11);
    let hop = jumpHop(createHop(random));
    let sawPower = false;
    let firstAt = 0;
    for (let t = 0; t < 20 && !sawPower; t += FRAME) {
      hop = { ...stepHop(hop, FRAME, random), crashed: false, running: true };
      if (hop.powerUps.length > 0) {
        sawPower = true;
        firstAt = hop.distance;
      }
    }
    expect(sawPower).toBe(true);
    expect(firstAt).toBeGreaterThanOrEqual(300);
    // Spawns with an obstacle placement, so it may land a little after the warm-up threshold.
    expect(firstAt).toBeLessThan(1_100);
    const firstPower = hop.powerUps[0]!;
    expect(firstPower.kind).not.toBe("slow");
    // Sits before its paired obstacle with clearance (walk-in orbs may sit further ahead on easy runs).
    const paired = hop.obstacles.find((obstacle) => obstacle.x > firstPower.x)!;
    expect(paired).toBeTruthy();
    const edgeGap = paired.x - (firstPower.x + 15);
    expect(edgeGap).toBeGreaterThanOrEqual(56);
    // Reachable: walk-in through a held-hop peak.
    expect(firstPower.y).toBeGreaterThanOrEqual(12);
    expect(firstPower.y).toBeLessThan(HOP.jumpPeak);
    // Cooldown: the next short stretch should not rain more orbs.
    let extras = 0;
    for (let t = 0; t < 1.2; t += FRAME) {
      hop = { ...stepHop(hop, FRAME, random), crashed: false, running: true };
      extras = Math.max(extras, hop.powerUps.length);
    }
    expect(extras).toBeLessThanOrEqual(1);

    // Spacing: big/small stay clear sideways; slow sits over a hazard or after it — never only in front.
    for (let seed = 1; seed <= 80; seed += 1) {
      const clearanceRandom = seededRandom(seed + 40);
      let clearanceHop: HopState = { ...jumpHop(createHop()), speed: HOP.startSpeed };
      for (let t = 0; t < 25; t += FRAME) {
        clearanceHop = {
          ...stepHop(clearanceHop, FRAME, clearanceRandom),
          crashed: false,
          running: true,
          height: 0,
          velocity: 0,
        };
        for (const power of clearanceHop.powerUps) {
          if (power.kind === "slow") {
            const over = clearanceHop.obstacles.some(
              (obstacle) =>
                power.x >= obstacle.x &&
                power.x <= obstacle.x + obstacle.width &&
                power.y >= obstacle.height,
            );
            const after = clearanceHop.obstacles.some(
              (obstacle) => power.x - 15 >= obstacle.x + obstacle.width + 56,
            );
            const ahead = clearanceHop.obstacles
              .filter((obstacle) => obstacle.x + obstacle.width > power.x)
              .sort((a, b) => a.x - b.x)[0];
            // Before (or after a host that scrolled off) needs enough lead to land short; allow speed drift since spawn.
            if (over || after || ahead === undefined) {
              continue;
            }
            const gap = ahead.x - (power.x + 15);
            // Lead is set from spawn speed (+ headroom); current speed may have risen, so allow drift.
            const minLead = slowBeforeLead(Math.max(HOP.startSpeed, clearanceHop.speed - 80));
            expect(gap, `seed ${seed} slow before lead`).toBeGreaterThanOrEqual(minLead - 24);
            continue;
          }
          for (const obstacle of clearanceHop.obstacles) {
            const powerLeft = power.x - 15;
            const powerRight = power.x + 15;
            const gap =
              powerRight < obstacle.x
                ? obstacle.x - powerRight
                : powerLeft > obstacle.x + obstacle.width
                  ? powerLeft - (obstacle.x + obstacle.width)
                  : 0;
            expect(gap, `seed ${seed}`).toBeGreaterThanOrEqual(56);
          }
        }
      }
    }

    const slowed = stepHop(
      {
        ...jumpHop(createHop()),
        speed: 500,
        powerUps: [{ x: HOP.keycapX + 10, y: 20, kind: "slow" }],
        height: 10,
      },
      FRAME,
      () => 0.5,
    );
    expect(slowed.slowRemaining).toBeGreaterThan(3);
    expect(slowed.speed).toBeLessThan(500);
    expect(slowed.powerUps).toHaveLength(0);

    const grown = stepHop(
      {
        ...jumpHop(createHop()),
        powerUps: [{ x: HOP.keycapX + 10, y: 20, kind: "big" }],
        height: 10,
      },
      FRAME,
      () => 0.5,
    );
    expect(grown.sizeScale).toBe(HOP.sizeBig);
    expect(grown.sizeRemaining).toBeGreaterThan(4);

    const shrunk = stepHop(
      {
        ...jumpHop(createHop()),
        powerUps: [{ x: HOP.keycapX + 10, y: 20, kind: "small" }],
        height: 10,
      },
      FRAME,
      () => 0.5,
    );
    expect(shrunk.sizeScale).toBe(HOP.sizeSmall);

    let afterSlow: HopState = { ...slowed, obstacles: [], powerUps: [], height: 0, velocity: 0, nextGap: 10_000 };
    for (let t = 0; t < SLOW_WAIT; t += FRAME) {
      afterSlow = { ...stepHop(afterSlow, FRAME, () => 0.5), obstacles: [], powerUps: [] };
    }
    expect(afterSlow.slowRemaining).toBe(0);
  });

  it("hands out more walk-in orbs early, and asks for higher hops as difficulty rises", () => {
    const collect = (score: number) => {
      const heights: number[] = [];
      for (let seed = 1; seed <= 30; seed += 1) {
        const random = seededRandom(score + seed * 90);
        let hop: HopState = { ...jumpHop(createHop(random)), distance: score * 25, speed: HOP.startSpeed };
        for (let t = 0; t < 35; t += FRAME) {
          const before = hop.powerUps.length;
          hop = { ...stepHop(hop, FRAME, random), crashed: false, running: true, height: 0, velocity: 0 };
          if (hop.powerUps.length > before) {
            heights.push(hop.powerUps.at(-1)!.y);
          }
        }
      }
      return heights;
    };
    const easy = collect(0);
    const hard = collect(400);
    expect(easy.length).toBeGreaterThan(0);
    expect(hard.length).toBeGreaterThan(0);
    // Early runs favor orbs a standing keycap can touch.
    expect(easy.filter((y) => y <= 28).length).toBeGreaterThan(hard.filter((y) => y <= 28).length);
    const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    expect(avg(hard)).toBeGreaterThan(avg(easy));
  });

  it("keeps offering power-ups after difficulty tops out", () => {
    const random = seededRandom(77);
    // Full difficulty used to cut power-ups off; they should still appear late in a long run.
    let hop: HopState = {
      ...jumpHop(createHop()),
      distance: DIFFICULTY_DISTANCE,
      speed: HOP.maxSpeed,
      lastPowerDistance: DIFFICULTY_DISTANCE,
    };
    let saw = false;
    for (let t = 0; t < 40 && !saw; t += FRAME) {
      hop = { ...stepHop(hop, FRAME, random), crashed: false, running: true, height: 0, velocity: 0 };
      if (hop.powerUps.length > 0) {
        saw = true;
      }
    }
    expect(saw).toBe(true);
  });

  it("stays fair at its hardest: a well-timed hopper clears 60 seconds of every run", () => {
    for (let seed = 1; seed <= 120; seed += 1) {
      const random = seededRandom(seed);
      // Start at full difficulty and top speed. Strip power-ups so fairness is about obstacle spacing only.
      let hop: HopState = {
        ...jumpHop(createHop()),
        distance: 10_000 * 25,
        speed: HOP.maxSpeed,
        velocity: 0,
        lastPowerDistance: 10_000 * 25,
      };
      for (let t = 0; t < 60; t += FRAME) {
        const keycapMiddle = HOP.keycapX + HOP.keycapSize / 2;
        const next = hop.obstacles.find((obstacle) => obstacle.x + obstacle.width > HOP.keycapX);
        // Hop so the top of the jump lands over the obstacle's middle.
        if (next && hop.height === 0 && next.x + next.width / 2 - keycapMiddle <= hop.speed * HOP.timeToPeak) {
          hop = jumpHop(hop);
        }
        hop = stepHop(hop, FRAME, random);
        hop = {
          ...hop,
          lastPowerDistance: hop.distance,
          powerUps: [],
          sizeScale: 1,
          sizeRemaining: 0,
          slowRemaining: 0,
        };
        expect(hop.crashed, `seed ${seed} at ${t.toFixed(2)}s`).toBe(false);
      }
    }
  }, 60_000);
});
