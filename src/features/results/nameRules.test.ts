import { describe, expect, it } from "vitest";
import { normalizeName } from "./nameRules";

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