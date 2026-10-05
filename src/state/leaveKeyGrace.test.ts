import { describe, expect, it } from "vitest";
import { LEAVE_KEY_GRACE_MS, acceptsLeaveKey } from "./leaveKeyGrace";

describe("acceptsLeaveKey", () => {
  it("ignores a leave key typed in the moment the screen appears", () => {
    expect(acceptsLeaveKey(5_000, 5_000)).toBe(false);
    expect(acceptsLeaveKey(5_000, 5_000 + LEAVE_KEY_GRACE_MS - 1)).toBe(false);
  });

  it("accepts a leave key once the grace has passed", () => {
    expect(acceptsLeaveKey(5_000, 5_000 + LEAVE_KEY_GRACE_MS)).toBe(true);
    expect(acceptsLeaveKey(5_000, 60_000)).toBe(true);
  });

  it("lasts one second", () => {
    expect(LEAVE_KEY_GRACE_MS).toBe(1_000);
  });
});
