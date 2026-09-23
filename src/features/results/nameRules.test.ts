import { describe, expect, it } from "vitest";
import { isEnterKey, nameCharacterFromKey, nameToSaveOnEnter, normalizeName } from "./nameRules";

describe("normalizeName", () => {
  it("trims a name and keeps the saved value within 20 characters", () => {
    expect(normalizeName("  Morgan  ")).toBe("Morgan");
    expect(normalizeName("a".repeat(20))).toBe("a".repeat(20));
  });

  it("rejects an empty name and a name past 20 characters", () => {
    expect(normalizeName("   ")).toBeNull();
    expect(normalizeName("")).toBeNull();
    expect(normalizeName("a".repeat(21))).toBeNull();
  });

  it("rejects profanity, including spaces and number swaps", () => {
    expect(normalizeName("shit")).toBeNull();
    expect(normalizeName("  SHIT  ")).toBeNull();
    expect(normalizeName("sh1t")).toBeNull();
    expect(normalizeName("s h i t")).toBeNull();
    expect(normalizeName("f.u.c.k")).toBeNull();
    expect(normalizeName("a$$")).toBeNull();
    expect(normalizeName("badass")).toBeNull();
    expect(normalizeName("fuuck")).toBeNull();
    expect(normalizeName("Hell")).toBeNull();
    expect(normalizeName("boob")).toBeNull();
    expect(normalizeName("BOOBIE")).toBeNull();
    expect(normalizeName("boobies")).toBeNull();
    expect(normalizeName("b00b")).toBeNull();
    expect(normalizeName("b o o b")).toBeNull();
    expect(normalizeName("titties")).toBeNull();
    expect(normalizeName("T1TTIES")).toBeNull();
    expect(normalizeName("penis")).toBeNull();
    expect(normalizeName("p3nis")).toBeNull();
  });

  it("keeps an ordinary name that only shares those letters", () => {
    expect(normalizeName("Cass")).toBe("Cass");
    expect(normalizeName("hello")).toBe("hello");
    expect(normalizeName("bass")).toBe("bass");
    expect(normalizeName("Dickey")).toBe("Dickey");
    expect(normalizeName("Bobby")).toBe("Bobby");
    expect(normalizeName("Book")).toBe("Book");
    expect(normalizeName("Titus")).toBe("Titus");
    expect(normalizeName("Penny")).toBe("Penny");
  });
});

describe("isEnterKey", () => {
  it("treats Return as the save key", () => {
    expect(isEnterKey({ key: "Enter" })).toBe(true);
    expect(isEnterKey({ key: "NumpadEnter" })).toBe(true);
    expect(isEnterKey({ key: "Unidentified", code: "Enter" })).toBe(true);
    expect(isEnterKey({ key: "a", code: "KeyA" })).toBe(false);
  });
});

describe("nameToSaveOnEnter", () => {
  it("saves the name from the field, and falls back to state or early letters", () => {
    expect(nameToSaveOnEnter("Ann", "", "")).toBe("Ann");
    expect(nameToSaveOnEnter("", "Ann", "")).toBe("Ann");
    expect(nameToSaveOnEnter("", "", "Ann")).toBe("Ann");
    expect(nameToSaveOnEnter("  Ann  ", "nope", "")).toBe("Ann");
  });

  it("does not save an empty or blocked name", () => {
    expect(nameToSaveOnEnter("   ", "", "")).toBeNull();
    expect(nameToSaveOnEnter("shit", "Ann", "")).toBeNull();
  });
});

describe("nameCharacterFromKey", () => {
  const plain = { repeat: false, metaKey: false, ctrlKey: false, altKey: false };

  it("gives the first letter to the name when the field is not focused", () => {
    expect(nameCharacterFromKey({ ...plain, key: "K" }, { fieldFocused: false, buttonFocused: false })).toBe("K");
  });

  it("leaves the key alone once the name field is focused", () => {
    expect(nameCharacterFromKey({ ...plain, key: "K" }, { fieldFocused: true, buttonFocused: false })).toBeNull();
  });

  it("does not steal Space from a focused button", () => {
    expect(nameCharacterFromKey({ ...plain, key: " " }, { fieldFocused: false, buttonFocused: true })).toBeNull();
  });
});