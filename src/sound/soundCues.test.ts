import { describe, expect, it } from "vitest";
import { applyTypingKey, createTestSession } from "../features/typing/typingEngine";
import type { ResultCopy } from "../features/results/resultPlacement";
import { hopPowerCue, keyCue, resultCue } from "./soundCues";

const start = createTestSession(["Hi there."], 30);

describe("keyCue", () => {
  it("clicks for a correct key and blips for a wrong one", () => {
    const right = applyTypingKey(start, { key: "H" }, 0);
    expect(keyCue(start, right)).toBe("key");
    expect(keyCue(right, applyTypingKey(right, { key: "x" }, 10))).toBe("miss");
  });

  it("stays quiet for Backspace, ignored keys, and no change", () => {
    const right = applyTypingKey(start, { key: "H" }, 0);
    expect(keyCue(right, applyTypingKey(right, { key: "Backspace" }, 10))).toBeNull();
    expect(keyCue(right, applyTypingKey(right, { key: "Shift" }, 10))).toBeNull();
    expect(keyCue(right, right)).toBeNull();
    expect(keyCue(null, start)).toBeNull();
  });
});

function copy(kind: ResultCopy["kind"], plinko: boolean): ResultCopy {
  return { headline: "", kind, placedLine: null, plinkoLine: plinko ? "You win a Plinko drop!" : null };
}

describe("resultCue", () => {
  it("chimes for a new high score, dings for a Plinko win, and stays quiet otherwise", () => {
    expect(resultCue(copy("new-high-score", true))).toBe("chime");
    expect(resultCue(copy("nice", true))).toBe("ding");
    expect(resultCue(copy("nice", false))).toBeNull();
    expect(resultCue(copy("thanks", false))).toBeNull();
    expect(resultCue(copy("casper", false))).toBeNull();
    expect(resultCue(null)).toBeNull();
  });
});

describe("hopPowerCue", () => {
  it("gives each Keycap Hop power-up its own cue", () => {
    expect(hopPowerCue("slow")).toBe("hop-slow");
    expect(hopPowerCue("big")).toBe("hop-big");
    expect(hopPowerCue("small")).toBe("hop-small");
  });
});

describe("hop-bonk", () => {
  it("is a distinct cue name for a Keycap Hop crash", () => {
    expect("hop-bonk" satisfies import("./soundCues").SoundCue).toBe("hop-bonk");
  });
});
