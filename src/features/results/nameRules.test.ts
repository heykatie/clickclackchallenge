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
});