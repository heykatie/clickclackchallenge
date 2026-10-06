import type { NewScore, ScoreRecord } from "../db/persistence";

type SaveScore = (input: NewScore) => Promise<ScoreRecord>;
type RenameScore = (scoreId: string, name: string | null) => Promise<ScoreRecord>;

/**
 * One score row per finished test. Results saves the row as soon as it opens, with no name, so a reload
 * or crash while the contestant types their name cannot lose the attempt. Leaving Results then adds
 * the name to that same row. `result` identifies the attempt: the next contestant's result starts a new row.
 */
export function createResultSaver(save: SaveScore, rename: RenameScore) {
  let current: { result: object; request: Promise<ScoreRecord> } | null = null;

  function track(result: object, request: Promise<ScoreRecord>): Promise<ScoreRecord> {
    const entry = { result, request };
    current = entry;
    request.catch(() => {
      // A failed save is forgotten, so the next attempt to save tries again.
      if (current === entry) {
        current = null;
      }
    });
    return request;
  }

  function saved(result: object): Promise<ScoreRecord> | null {
    return current?.result === result ? current.request : null;
  }

  return {
    saveEarly(result: object, attempt: NewScore): Promise<ScoreRecord> {
      return saved(result) ?? track(result, save({ ...attempt, name: null }));
    },

    async finish(result: object, attempt: NewScore, name: string | null): Promise<ScoreRecord> {
      const early = saved(result);
      // A failed early save leaves no row, so the whole row is saved now. A failed rename is reported,
      // never retried as a second row.
      const row = early ? await early.catch(() => null) : null;
      if (row) {
        return row.name === name ? row : rename(row.id, name);
      }
      return saved(result) ?? track(result, save({ ...attempt, name }));
    },
  };
}
