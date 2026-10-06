import { describe, expect, it } from "vitest";
import type { EventRecord, ScoreRecord } from "../../db/persistence";
import { scoresCsv, scoresFileName } from "./scoresCsv";

function event(id: string, hiddenAt: string | null = null): EventRecord {
  return {
    id,
    durationSeconds: 30,
    testMode: "words",
    passageSetId: "words-v1",
    boardScope: "event",
    hiddenAt,
    status: "active",
    createdAt: "2026-10-06T09:00:00.000Z",
    updatedAt: "2026-10-06T09:00:00.000Z",
  };
}

function score(id: string, eventId: string, name: string | null, displayedWpm: number, accuracy = 98): ScoreRecord {
  return {
    id,
    eventId,
    name,
    rawWpm: displayedWpm,
    displayedWpm,
    accuracy,
    correctCharacters: 100,
    correctAttempts: 100,
    incorrectAttempts: 2,
    durationSeconds: 30,
    testMode: "words",
    passageSetId: "words-v1",
    createdAt: `2026-10-06T10:0${id}:00.000Z`,
  };
}

const lines = (csv: string) => csv.trimEnd().split("\r\n");

describe("scoresCsv", () => {
  it("writes a header and one row per score, newest first, with rank, Plinko, and cleared columns", () => {
    const csv = scoresCsv(
      [score("1", "a", "Alex", 62), score("2", "a", "Bo", 48), score("3", "b", null, 70)],
      [event("a"), event("b", "2026-10-06T11:00:00.000Z")],
    );
    expect(lines(csv)).toEqual([
      "Saved at,Event,Name,WPM,Accuracy %,Seconds,Mode,Event rank,Plinko,Cleared",
      "2026-10-06T10:03:00.000Z,b,,70,98,30,Standard,1,yes,yes",
      "2026-10-06T10:02:00.000Z,a,Bo,48,98,30,Standard,2,no,no",
      "2026-10-06T10:01:00.000Z,a,Alex,62,98,30,Standard,1,yes,no",
    ]);
  });

  it("leaves the rank blank for a score that is not ranked", () => {
    const csv = scoresCsv([score("1", "a", "Low", 40, 50)], [event("a")]);
    expect(lines(csv)[1]).toBe("2026-10-06T10:01:00.000Z,a,Low,40,50,30,Standard,,no,no");
  });

  it("quotes commas and quotes, and defuses names a spreadsheet would run as a formula", () => {
    const csv = scoresCsv(
      [score("1", "a", 'Jo, "Ace"', 60), score("2", "a", "=SUM(A1)", 59), score("3", "a", "@me", 58)],
      [event("a")],
    );
    const rows = lines(csv);
    expect(rows[3]).toContain(',"Jo, ""Ace""",');
    expect(rows[2]).toContain(",'=SUM(A1),");
    expect(rows[1]).toContain(",'@me,");
  });

  it("names the file with the download date", () => {
    expect(scoresFileName(new Date("2026-10-06T15:30:00"))).toBe("clickclackchallenge-scores-2026-10-06.csv");
  });
});
