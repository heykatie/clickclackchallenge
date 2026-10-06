import { describe, expect, it, vi } from "vitest";
import type { NewScore, ScoreRecord } from "../db/persistence";
import { createResultSaver } from "./resultSave";

const attempt: NewScore = {
  eventId: "event-1",
  name: null,
  rawWpm: 61.2,
  displayedWpm: 61,
  accuracy: 97,
  correctCharacters: 153,
  correctAttempts: 153,
  incorrectAttempts: 5,
  durationSeconds: 30,
  testMode: "words",
  passageSetId: "words-v1",
};

function fakeStore() {
  const rows = new Map<string, ScoreRecord>();
  let next = 0;
  const save = vi.fn(async (input: NewScore) => {
    const row: ScoreRecord = { ...input, id: `score-${++next}`, createdAt: "2026-10-06T10:00:00.000Z" };
    rows.set(row.id, row);
    return row;
  });
  const rename = vi.fn(async (id: string, name: string | null) => {
    const row = { ...rows.get(id)!, name };
    rows.set(id, row);
    return row;
  });
  return { rows, save, rename, saver: createResultSaver(save, rename) };
}

describe("createResultSaver", () => {
  it("saves the attempt as soon as Results opens, with no name, so a reload cannot lose it", async () => {
    const { rows, save, saver } = fakeStore();
    const result = {};
    await saver.saveEarly(result, attempt);
    expect(save).toHaveBeenCalledExactlyOnceWith({ ...attempt, name: null });
    expect([...rows.values()]).toHaveLength(1);
  });

  it("adds the typed name to that same row instead of writing a second one", async () => {
    const { rows, save, rename, saver } = fakeStore();
    const result = {};
    await saver.saveEarly(result, attempt);
    const finished = await saver.finish(result, attempt, "Zed");
    expect(save).toHaveBeenCalledOnce();
    expect(rename).toHaveBeenCalledExactlyOnceWith("score-1", "Zed");
    expect(finished).toMatchObject({ id: "score-1", name: "Zed" });
    expect([...rows.values()]).toHaveLength(1);
  });

  it("leaves the early row as it is when the player leaves without a name", async () => {
    const { save, rename, saver } = fakeStore();
    const result = {};
    await saver.saveEarly(result, attempt);
    const finished = await saver.finish(result, attempt, null);
    expect(save).toHaveBeenCalledOnce();
    expect(rename).not.toHaveBeenCalled();
    expect(finished).toMatchObject({ id: "score-1", name: null });
  });

  it("waits for an early save still in flight rather than saving again", async () => {
    const { save, saver } = fakeStore();
    const result = {};
    const early = saver.saveEarly(result, attempt);
    const finished = saver.finish(result, attempt, "Zed");
    await Promise.all([early, finished]);
    expect(save).toHaveBeenCalledOnce();
    expect(await finished).toMatchObject({ id: "score-1", name: "Zed" });
  });

  it("saves once when Results asks twice for the same result, as React does in development", async () => {
    const { save, saver } = fakeStore();
    const result = {};
    await Promise.all([saver.saveEarly(result, attempt), saver.saveEarly(result, attempt)]);
    expect(save).toHaveBeenCalledOnce();
  });

  it("saves with the name when there was no early save, and only once for a double submit", async () => {
    const { save, rename, saver } = fakeStore();
    const result = {};
    await Promise.all([saver.finish(result, attempt, "Zed"), saver.finish(result, attempt, "Zed")]);
    expect(save).toHaveBeenCalledExactlyOnceWith({ ...attempt, name: "Zed" });
    expect(rename).not.toHaveBeenCalled();
  });

  it("starts a new row for the next contestant's result", async () => {
    const { save, saver } = fakeStore();
    await saver.saveEarly({}, attempt);
    await saver.saveEarly({}, attempt);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("tries again when an early save failed", async () => {
    const { save, saver } = fakeStore();
    save.mockRejectedValueOnce(new Error("disk full"));
    const result = {};
    await expect(saver.saveEarly(result, attempt)).rejects.toThrow("disk full");
    expect(await saver.finish(result, attempt, "Zed")).toMatchObject({ name: "Zed" });
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("reports a failed rename instead of writing a second row", async () => {
    const { save, rename, saver } = fakeStore();
    const result = {};
    await saver.saveEarly(result, attempt);
    rename.mockRejectedValueOnce(new Error("disk full"));
    await expect(saver.finish(result, attempt, "Zed")).rejects.toThrow("disk full");
    expect(save).toHaveBeenCalledOnce();
  });
});
