import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pick, seededRandom } from "../test/seededRandom";
import {
  clearCurrentEvent,
  closeDatabase,
  DB_NAME,
  hasClearedScores,
  listAllScores,
  listBoardScores,
  loadBooth,
  restoreClearedScores,
  saveScore,
  startFreshEvent,
  updateActiveEvent,
  type EventRecord,
  type TestDuration,
  type TestMode,
} from "./persistence";

/**
 * Random runs of what staff and contestants do, against a plain model of what each board should show:
 * start fresh, continue with changes, switch to the all-time board, save scores, clear, restore, and reopen.
 */
interface Model {
  active: string | null;
  board: "event" | "all-time";
  /** Each event's scores, which clear (if any) hid it, and its own board setting. */
  events: Map<string, { scores: string[]; hiddenBy: number | null; board: "event" | "all-time" }>;
  clears: number[];
}

function visible(model: Model) {
  return [...model.events.values()].filter((event) => event.hiddenBy === null).flatMap((event) => event.scores);
}

let clock = Date.UTC(2026, 9, 7, 9);

beforeEach(async () => {
  // Real people never clear twice in one millisecond; the clock steps so this test does not either.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(clock);
  await closeDatabase();
  await deleteDB(DB_NAME);
});

afterEach(async () => {
  vi.useRealTimers();
  await closeDatabase();
  await deleteDB(DB_NAME);
});

const tick = () => {
  clock += 1_000;
  vi.setSystemTime(clock);
};

describe("storage, over 60 random runs of 40 operations", () => {
  it("shows every board exactly what it should, and never loses or invents a score", async () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const random = seededRandom(seed);
      await closeDatabase();
      await deleteDB(DB_NAME);
      const model: Model = { active: null, board: "event", events: new Map(), clears: [] };
      let activeEvent: EventRecord | null = null;
      let saved = 0;
      let clearCount = 0;
      const log: string[] = [];

      for (let step = 0; step < 40; step += 1) {
        tick();
        const duration: TestDuration = pick(random, [30, 60]);
        const mode: TestMode = pick(random, ["words", "famous-lines", "story"]);
        const roll = random();
        if (roll < 0.15 || activeEvent === null) {
          activeEvent = await startFreshEvent(duration, mode, { name: random() < 0.5 ? "Fair" : null });
          model.events.set(activeEvent.id, { scores: [], hiddenBy: null, board: "event" });
          model.active = activeEvent.id;
          model.board = "event";
          log.push("fresh");
        } else if (roll < 0.25) {
          const board = random() < 0.5 ? "all-time" : "event";
          activeEvent = await updateActiveEvent(activeEvent.id, { durationSeconds: duration, testMode: mode, boardScope: board });
          model.board = board;
          model.events.get(model.active!)!.board = board;
          log.push(`continue ${board}`);
        } else if (roll < 0.32) {
          activeEvent = await clearCurrentEvent(duration, mode);
          // Only the event that was current is hidden, and only when it has scores; earlier events keep theirs.
          const current = model.active === null ? null : model.events.get(model.active)!;
          if (current && current.scores.length > 0) {
            clearCount += 1;
            const clearId = clearCount;
            // Only the newest clear can be restored, so it replaces any older one.
            model.clears = [clearId];
            current.hiddenBy = clearId;
          }
          model.events.set(activeEvent.id, { scores: [], hiddenBy: null, board: "event" });
          model.active = activeEvent.id;
          model.board = "event";
          log.push("clear");
        } else if (roll < 0.38) {
          const restored = await restoreClearedScores();
          const last = model.clears.pop();
          expect(restored, `seed ${seed} after ${log.join(", ")}`).toBe(last !== undefined);
          if (last !== undefined) {
            const restoredIds = [...model.events].filter(([, event]) => event.hiddenBy === last).map(([id]) => id);
            for (const id of restoredIds) model.events.get(id)!.hiddenBy = null;
            // While the current board is still empty, the restored board becomes the current event again.
            if (model.events.get(model.active!)!.scores.length === 0) {
              model.active = restoredIds[0]!;
              model.board = model.events.get(model.active)!.board;
            }
          }
          activeEvent = (await loadBooth()).activeEvent;
          expect(activeEvent?.id, `seed ${seed}: restore`).toBe(model.active);
          log.push("restore");
        } else if (roll < 0.42) {
          await closeDatabase();
          const booth = await loadBooth();
          expect(booth.activeEvent?.id, `seed ${seed}: reopen`).toBe(model.active);
          activeEvent = booth.activeEvent;
          log.push("reopen");
        } else {
          saved += 1;
          const wpm = pick(random, [0, 30, 51, 80, 120, 250]);
          const score = await saveScore({
            eventId: activeEvent.id,
            name: random() < 0.5 ? `P${saved}` : null,
            eventName: activeEvent.name,
            rawWpm: wpm,
            displayedWpm: wpm,
            accuracy: pick(random, [20, 70, 95]),
            correctCharacters: 0,
            correctAttempts: 0,
            incorrectAttempts: 0,
            durationSeconds: activeEvent.durationSeconds,
            testMode: activeEvent.testMode,
            passageSetId: activeEvent.passageSetId,
          });
          model.events.get(activeEvent.id)!.scores.push(score.id);
          log.push("save");
        }

        const where = `seed ${seed} after ${log.join(", ")}`;
        // Every operation leaves an active event; reopening reads it back from storage.
        if (activeEvent === null) throw new Error(`${where}: no active event`);
        const board = (await listBoardScores(activeEvent)).map((score) => score.id).sort();
        const wantBoard = (model.board === "all-time" ? visible(model) : model.events.get(model.active!)!.scores).slice().sort();
        expect(board, where).toEqual(wantBoard);
        expect((await listAllScores()).map((score) => score.id).sort(), where).toEqual(visible(model).slice().sort());
        expect(await hasClearedScores(), where).toBe(model.clears.length > 0);
      }
    }
  }, 120_000);
});
