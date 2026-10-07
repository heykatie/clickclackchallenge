import { describe, expect, it } from "vitest";
import type { EventRecord, TestDuration, TestMode } from "../db/persistence";
import { pick, seededRandom } from "../test/seededRandom";
import { appReducer, initialState, type AppState } from "./appState";

const MODES: readonly TestMode[] = ["words", "famous-lines", "story"];
const DURATIONS: readonly TestDuration[] = [30, 60];

function eventFor(testMode: TestMode, durationSeconds: TestDuration): EventRecord {
  return {
    id: "event-1",
    durationSeconds: testMode === "story" ? 60 : durationSeconds,
    testMode,
    passageSetId: "set",
    boardScope: "event",
    hiddenAt: null,
    name: null,
    status: "active",
    createdAt: "2026-10-07T09:00:00.000Z",
    updatedAt: "2026-10-07T09:00:00.000Z",
  };
}

/**
 * Plays one round with random keys: mostly the expected letter, sometimes a wrong one, Backspace, a modifier,
 * a held repeat, or an idle pause, with the clock moving between keys. Returns every state along the way.
 */
function playRandomRound(seed: number) {
  const random = seededRandom(seed);
  const testMode = pick(random, MODES);
  const durationSeconds = pick(random, DURATIONS);
  let state: AppState = appReducer(initialState, { type: "SET_ACTIVE_EVENT", event: eventFor(testMode, durationSeconds) });
  state = appReducer(state, { type: "ENTER_READY" });
  state = appReducer(state, { type: "ENTER_TYPING" });
  const states: AppState[] = [state];
  let now = 1_000;
  for (let step = 0; step < 900 && state.screen === "typing"; step += 1) {
    now += Math.floor(random() * 400);
    const test = state.currentTest!;
    const roll = random();
    const expected = test.expectedSentence[test.characterIndex] ?? " ";
    const key =
      roll < 0.7 ? expected : roll < 0.8 ? pick(random, ["x", "Q", "?", "1", " "]) : roll < 0.88 ? "Backspace" : pick(random, ["Shift", "Tab", "Escape", "ArrowLeft", "F5", "Enter"]);
    const repeat = random() < 0.05;
    state = appReducer(state, { type: "TYPE_KEY", key, repeat, now });
    // Now and then the countdown fires on its own.
    if (state.screen === "typing" && random() < 0.003) {
      state = appReducer(state, { type: "FINISH_TEST" });
    }
    states.push(state);
  }
  return { states, testMode, durationSeconds };
}

describe("a random round, 2,000 times over", () => {
  const SEEDS = Array.from({ length: 2_000 }, (_, index) => index + 1);

  it("keeps every count sound on every key", () => {
    // Plain checks, collected and asserted once: a per-key expect would make 2,000 rounds slow.
    const problems: string[] = [];
    const check = (ok: boolean, seed: number, step: number, rule: string) => {
      if (!ok && problems.length < 10) problems.push(`seed ${seed}, key ${step}: ${rule}`);
    };
    for (const seed of SEEDS) {
      const { states } = playRandomRound(seed);
      let previous: AppState | null = null;
      states.forEach((state, step) => {
        const test = state.currentTest;
        if (test) {
          check(test.correctCharacters >= 0, seed, step, "correct characters never negative");
          check(test.correctCharacters <= test.correctAttempts, seed, step, "correct characters within correct keystrokes");
          check(test.characterIndex === test.typedCharacters.length, seed, step, "cursor matches the letters typed");
          check(test.typedCharacters.length <= test.expectedSentence.length, seed, step, "never typed past the line");
          const before = previous?.currentTest;
          if (before) {
            // Attempts only grow: Backspace takes a character back, never a keystroke.
            check(
              test.correctAttempts + test.incorrectAttempts >= before.correctAttempts + before.incorrectAttempts,
              seed,
              step,
              "keystrokes never go down",
            );
            // The timer starts once and never moves.
            check(before.startedAt === null || test.startedAt === before.startedAt, seed, step, "timer starts once");
          }
          check(test.startedAt === null || test.endsAt === test.startedAt + test.durationSeconds * 1000, seed, step, "round length fixed");
        }
        previous = state;
      });
    }
    expect(problems).toEqual([]);
  }, 60_000);

  it("always ends on a believable result: finite, never negative, accuracy between 0 and 100", () => {
    let finished = 0;
    for (const seed of SEEDS) {
      const { states } = playRandomRound(seed);
      const last = states.at(-1)!;
      if (last.screen !== "results") {
        continue;
      }
      finished += 1;
      const result = last.latestResult!;
      expect(Number.isFinite(result.rawWpm), `seed ${seed}`).toBe(true);
      expect(result.rawWpm, `seed ${seed}`).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result.displayedWpm), `seed ${seed}`).toBe(true);
      expect(result.displayedWpm, `seed ${seed}`).toBe(Math.round(result.rawWpm));
      if (result.accuracy !== null) {
        expect(result.accuracy, `seed ${seed}`).toBeGreaterThanOrEqual(0);
        expect(result.accuracy, `seed ${seed}`).toBeLessThanOrEqual(100);
        expect(result.displayedAccuracy, `seed ${seed}`).toBe(Math.round(result.accuracy));
      }
    }
    expect(finished).toBeGreaterThan(SEEDS.length / 2);
  }, 60_000);

  it("finishes once: keys after Results change nothing", () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const { states } = playRandomRound(seed);
      const last = states.at(-1)!;
      if (last.screen !== "results") {
        continue;
      }
      expect(appReducer(last, { type: "TYPE_KEY", key: "a", repeat: false, now: 10 ** 9 }), `seed ${seed}`).toBe(last);
      expect(appReducer(last, { type: "FINISH_TEST" }), `seed ${seed}`).toBe(last);
    }
  });

  it("scores a timed round on the whole round length, and Story on the time it took", () => {
    for (const seed of SEEDS) {
      const { states, testMode } = playRandomRound(seed);
      const last = states.at(-1)!;
      if (last.screen !== "results") {
        continue;
      }
      const test = last.currentTest!;
      const windowSeconds = (test.correctCharacters / 5) / (last.latestResult!.rawWpm / 60);
      if (last.latestResult!.rawWpm === 0) {
        continue;
      }
      if (testMode === "story") {
        expect(windowSeconds, `seed ${seed}`).toBeLessThanOrEqual(test.durationSeconds + 1e-6);
      } else {
        expect(windowSeconds, `seed ${seed}`).toBeCloseTo(test.durationSeconds, 6);
      }
    }
  }, 60_000);
});
