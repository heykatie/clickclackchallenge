type StorageManagerLike = {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
};

export type PersistResult = "persisted" | "granted" | "denied" | "unsupported";

/**
 * Asks the browser not to evict IndexedDB. Safari can clear a site's data after about 7 days without use
 * unless the app is on the Home Screen or storage is persistent. Never throws; the booth works either way.
 */
export async function requestPersistentStorage(
  storage: StorageManagerLike | undefined = globalThis.navigator?.storage,
): Promise<PersistResult> {
  if (!storage?.persist) {
    return "unsupported";
  }
  try {
    if (storage.persisted && (await storage.persisted())) {
      return "persisted";
    }
    return (await storage.persist()) ? "granted" : "denied";
  } catch {
    return "denied";
  }
}
