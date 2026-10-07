import { describe, expect, it } from "vitest";
import type { EventRecord, ScoreRecord } from "../../db/persistence";
import { scoresCsv, scoresFileName } from "./scoresCsv";

function event(id: string, createdAt: string, hiddenAt: string | null = null, name: string | null = null): EventRecord {
  return {
    id,
    durationSeconds: 30,
    testMode: "words",
    passageSetId: "words-v1",
    boardScope: "event",
    hiddenAt,
    name,
    status: "active",
    createdAt,
    updatedAt: createdAt,
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

// Fixed to UTC so the expected text does not depend on where the tests run.
const csvAt = (scores: ScoreRecord[], events: EventRecord[]) => scoresCsv(scores, events, "UTC");

describe("scoresCsv", () => {
  it("writes readable dates, numbered events, and both ranks, newest first", () => {
    const csv = csvAt(
      [score("1", "a", "Alex", 62), score("2", "a", "Bo", 48), score("3", "b", "Cy", 70)],
      [event("a", "2026-10-06T09:00:00.000Z"), event("b", "2026-10-06T09:30:00.000Z")],
    );
    expect(lines(csv)).toEqual([
      "Date,Time,Event,Event started,Event name,Name,WPM,Accuracy %,Seconds,Mode,Event rank,All-time rank,Plinko,Cleared",
      '"Tue, Oct 6, 2026",10:03 AM,Event 2,"Oct 6, 9:30 AM",,Cy,70,98,30,Standard,1,1,yes,no',
      '"Tue, Oct 6, 2026",10:02 AM,Event 1,"Oct 6, 9:00 AM",,Bo,48,98,30,Standard,2,3,no,no',
      '"Tue, Oct 6, 2026",10:01 AM,Event 1,"Oct 6, 9:00 AM",,Alex,62,98,30,Standard,1,2,yes,no',
    ]);
  });

  it("numbers events in the order they started, and leaves cleared scores out of the all-time rank", () => {
    const csv = csvAt(
      [score("1", "old", "Old", 90), score("2", "new", "New", 60)],
      [event("new", "2026-10-06T12:00:00.000Z"), event("old", "2026-10-06T08:00:00.000Z", "2026-10-06T11:00:00.000Z")],
    );
    expect(lines(csv)[1]).toBe('"Tue, Oct 6, 2026",10:02 AM,Event 2,"Oct 6, 12:00 PM",,New,60,98,30,Standard,1,1,yes,no');
    expect(lines(csv)[2]).toBe('"Tue, Oct 6, 2026",10:01 AM,Event 1,"Oct 6, 8:00 AM",,Old,90,98,30,Standard,1,,yes,yes');
  });

  it("keeps the event number and the operator's event name in separate columns", () => {
    const csv = csvAt(
      [score("1", "a", "Alex", 62)],
      [event("a", "2026-10-06T09:00:00.000Z", null, "Saturday market")],
    );
    expect(lines(csv)[1]).toBe('"Tue, Oct 6, 2026",10:01 AM,Event 1,"Oct 6, 9:00 AM",Saturday market,Alex,62,98,30,Standard,1,1,yes,no');
  });

  it("names each score with the event name set when it was played, so a continued board keeps each day's name", () => {
    const fanime = event("e1", "2026-10-03T16:00:00.000Z", null, "Fanime Sun");
    const saturday = { ...score("1", "e1", "Ana", 90), eventName: "Fanime Sat" };
    const sunday = { ...score("2", "e1", "Kai", 80), eventName: "Fanime Sun" };
    const older = score("3", "e1", "Jo", 70);
    const rows = lines(csvAt([saturday, sunday, older], [fanime])).slice(1);
    // The event name column sits right before the player's name.
    expect(rows.some((row) => row.includes(",Fanime Sat,Ana,"))).toBe(true);
    expect(rows.some((row) => row.includes(",Fanime Sun,Kai,"))).toBe(true);
    // A score saved before scores kept their own name falls back to the event's.
    expect(rows.some((row) => row.includes(",Fanime Sun,Jo,"))).toBe(true);
  });

  it("keeps a score blank when the event had no name yet, even after the event is named", () => {
    const named = event("e1", "2026-10-03T16:00:00.000Z", null, "Fanime Sun");
    const unnamed = { ...score("1", "e1", "Ana", 90), eventName: null };
    expect(lines(csvAt([unnamed], [named]))[1]).toContain('"Oct 3, 4:00 PM",,Ana,');
  });

  it("leaves both ranks blank for a score that is not ranked", () => {
    const csv = csvAt([score("1", "a", "Low", 40, 50)], [event("a", "2026-10-06T09:00:00.000Z")]);
    expect(lines(csv)[1]).toBe('"Tue, Oct 6, 2026",10:01 AM,Event 1,"Oct 6, 9:00 AM",,Low,40,50,30,Standard,,,no,no');
  });

  it("quotes commas and quotes, and defuses names a spreadsheet would run as a formula", () => {
    const csv = csvAt(
      [score("1", "a", 'Jo, "Ace"', 60), score("2", "a", "=SUM(A1)", 59), score("3", "a", "@me", 58)],
      [event("a", "2026-10-06T09:00:00.000Z")],
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
