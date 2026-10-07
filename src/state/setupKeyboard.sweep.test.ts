import { describe, expect, it } from "vitest";
import type { TestMode } from "../db/persistence";
import { pick, seededRandom } from "../test/seededRandom";
import { applySetupKey, setupChoices, type SetupSelection } from "./setupKeyboard";
import { planEventStart } from "./setupRules";

const MODES: readonly TestMode[] = ["words", "famous-lines", "story"];
const KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Enter", "NumpadEnter", " ", "Escape", "a", "Shift"];
const ACTIONS = ["start", "update", "clear", "restore", "download", "sound", "music", "palette", "name"];
const BOOLEANS = [false, true];

/** Every Setup state a device can be in: no event yet, an event, an update waiting, a clear to undo. */
function* situations() {
  for (const testMode of MODES)
    for (const canContinue of BOOLEANS)
      for (const updateReady of BOOLEANS)
        for (const canRestore of BOOLEANS) yield { testMode, canContinue, updateReady, canRestore };
}

describe("Event Setup's keyboard, in every situation", () => {
  it("never puts the cursor on a choice that is not on screen, from any choice, on any key", () => {
    for (const situation of situations()) {
      const choices = setupChoices(situation.testMode, situation.canContinue, situation.updateReady, situation.canRestore);
      for (const cursor of choices) {
        for (const key of KEYS) {
          for (const shiftKey of BOOLEANS) {
            const selection: SetupSelection = { cursor, duration: 30, testMode: situation.testMode, leaderboard: "fresh" };
            const result = applySetupKey(selection, key, { shiftKey, ...situation });
            const where = `${JSON.stringify(situation)} on ${cursor} pressing ${shiftKey ? "Shift+" : ""}${key}`;
            if (result === null) {
              expect(["Escape", "a", "Shift"], where).toContain(key);
            } else if (typeof result === "string") {
              expect(ACTIONS, where).toContain(result);
              expect(result, where).toBe(cursor);
            } else {
              // After a pick, the choices on screen follow the picked game mode (Story has no length).
              const after = setupChoices(result.testMode, situation.canContinue, situation.updateReady, situation.canRestore);
              expect(after, where).toContain(result.cursor);
              expect([30, 60], where).toContain(result.duration);
              if (!situation.canContinue) expect(result.leaderboard, where).toBe("fresh");
            }
          }
        }
      }
    }
  });

  it("starts a sound event plan after 500 long random walks: Story is always 60s, and continue needs an event", () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      const random = seededRandom(seed);
      const situation = { canContinue: random() < 0.6, updateReady: random() < 0.2, canRestore: random() < 0.3 };
      let selection: SetupSelection = { cursor: "start", duration: 30, testMode: "famous-lines", leaderboard: situation.canContinue ? "continue" : "fresh" };
      for (let step = 0; step < 200; step += 1) {
        const result = applySetupKey(selection, pick(random, KEYS), { shiftKey: random() < 0.3, ...situation });
        if (result !== null && typeof result !== "string") selection = result;
        const choices = setupChoices(selection.testMode, situation.canContinue, situation.updateReady, situation.canRestore);
        expect(choices, `seed ${seed}`).toContain(selection.cursor);
      }
      const plan = planEventStart(selection.leaderboard, situation.canContinue, selection.duration, selection.testMode);
      if (selection.testMode === "story") expect(plan.durationSeconds, `seed ${seed}`).toBe(60);
      if (!situation.canContinue) expect(plan.mode, `seed ${seed}`).toBe("fresh");
      if (selection.leaderboard === "all-time" && situation.canContinue) expect(plan.boardScope, `seed ${seed}`).toBe("all-time");
    }
  });
});
