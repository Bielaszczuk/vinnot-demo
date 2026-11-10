import { randomUUID } from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "@/shared/config/constants";

export interface StoredAuthSessionRecord {
  accessToken: string | null;
  refreshToken: string | null;
  serializedUser: string | null;
  pendingRotationId?: string;
}

const SESSION_KEY = "vinnot.auth.session.v3";
const PREVIOUS_SESSION_KEY = "vinnot.auth.session.v2";
const EMPTY: StoredAuthSessionRecord = { accessToken: null, refreshToken: null, serializedUser: null };
let pending: Promise<unknown> = Promise.resolve();

// Serialize whole snapshots, including logout, to avoid mixed identities and late writes.
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation, operation);
  pending = result.catch(() => undefined);
  return result;
}

async function readSnapshot(): Promise<StoredAuthSessionRecord> {
  const snapshot = await SecureStore.getItemAsync(SESSION_KEY) ?? await SecureStore.getItemAsync(PREVIOUS_SESSION_KEY);
  if (snapshot !== null) {
    try {
      const value: unknown = JSON.parse(snapshot);
      if (!value || typeof value !== "object") return { ...EMPTY };
      const record = value as Record<string, unknown>;
      if (!["accessToken", "refreshToken", "serializedUser"].every(
        (key) => record[key] === null || typeof record[key] === "string",
      )) return { ...EMPTY };
      return record as unknown as StoredAuthSessionRecord;
    } catch { return { ...EMPTY }; }
  }
  // Read-only compatibility with installed builds. The next write migrates atomically.
  const [accessToken, refreshToken, serializedUser] = await Promise.all([
    SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
    SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
    SecureStore.getItemAsync(STORAGE_KEYS.USER),
  ]);
  return { accessToken, refreshToken, serializedUser };
}

async function writeSnapshot(record: StoredAuthSessionRecord): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(record), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

export const authSessionStorage = {
  write(accessToken: string, refreshToken: string | null, serializedUser: string): Promise<void> {
    return serialize(() => writeSnapshot({ accessToken, refreshToken, serializedUser }));
  },
  read(): Promise<StoredAuthSessionRecord> {
    return serialize(readSnapshot);
  },
  removeUser(): Promise<void> {
    return serialize(async () => writeSnapshot({ ...await readSnapshot(), serializedUser: null }));
  },
  writeTokens(accessToken: string, refreshToken: string): Promise<void> {
    return serialize(async () => writeSnapshot({ ...await readSnapshot(), accessToken, refreshToken }));
  },
  writeUser(serializedUser: string, assertCurrent: () => void): Promise<void> {
    return serialize(async () => {
      const record = await readSnapshot();
      assertCurrent();
      await writeSnapshot({ ...record, serializedUser });
    });
  },
  prepareRotation(refreshToken: string, assertCurrent: () => void): Promise<string> {
    return serialize(async () => {
      const record = await readSnapshot();
      assertCurrent();
      if (record.refreshToken !== refreshToken) throw new Error("Session changed before rotation");
      const rotationId = record.pendingRotationId ?? randomUUID();
      await writeSnapshot({ ...record, pendingRotationId: rotationId });
      return rotationId;
    });
  },
  completeRotation(previousToken: string, rotationId: string, accessToken: string,
    refreshToken: string, assertCurrent: () => void): Promise<void> {
    return serialize(async () => {
      const record = await readSnapshot();
      assertCurrent();
      if (record.refreshToken !== previousToken || record.pendingRotationId !== rotationId) {
        throw new Error("Session changed during rotation");
      }
      await writeSnapshot({ accessToken, refreshToken, serializedUser: record.serializedUser });
    });
  },
  clear(): Promise<void> {
    return serialize(async () => {
      // The tombstone prevents legacy credentials reappearing if their deletion fails.
      let tombstoneError: unknown;
      try { await writeSnapshot(EMPTY); } catch (error) { tombstoneError = error; }
      const keys: string[] = [PREVIOUS_SESSION_KEY, STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER];
      if (tombstoneError) keys.push(SESSION_KEY);
      const results = await Promise.allSettled(keys.map((key) => SecureStore.deleteItemAsync(key)));
      const failure = results.find((result) => result.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
    });
  },
};
