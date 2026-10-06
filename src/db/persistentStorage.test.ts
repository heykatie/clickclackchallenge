import { describe, expect, it, vi } from "vitest";
import { requestPersistentStorage } from "./persistentStorage";

describe("requestPersistentStorage", () => {
  it("asks the browser to keep the booth's data", async () => {
    const storage = { persisted: vi.fn(async () => false), persist: vi.fn(async () => true) };
    expect(await requestPersistentStorage(storage)).toBe("granted");
    expect(storage.persist).toHaveBeenCalledOnce();
  });

  it("does not ask again when the data is already kept", async () => {
    const storage = { persisted: vi.fn(async () => true), persist: vi.fn(async () => true) };
    expect(await requestPersistentStorage(storage)).toBe("persisted");
    expect(storage.persist).not.toHaveBeenCalled();
  });

  it("reports a refusal without throwing", async () => {
    expect(await requestPersistentStorage({ persisted: async () => false, persist: async () => false })).toBe("denied");
    expect(
      await requestPersistentStorage({
        persisted: async () => false,
        persist: async () => {
          throw new Error("blocked");
        },
      }),
    ).toBe("denied");
  });

  it("does nothing where the browser has no storage manager", async () => {
    expect(await requestPersistentStorage(undefined)).toBe("unsupported");
    expect(await requestPersistentStorage({})).toBe("unsupported");
  });
});
