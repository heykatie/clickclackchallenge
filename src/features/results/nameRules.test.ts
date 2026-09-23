import { describe, expect, it } from "vitest";
import { nameCharacterFromKey, normalizeName } from "./nameRules";

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
  });

  it("keeps an ordinary name that only shares those letters", () => {
    expect(normalizeName("Cass")).toBe("Cass");
    expect(normalizeName("hello")).toBe("hello");
    expect(normalizeName("bass")).toBe("bass");
    expect(normalizeName("Dickey")).toBe("Dickey");
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