import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "@/shared/config/constants";
import { authSessionStorage } from "./authSession.storage";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

const values = new Map<string, string>();
const empty = { accessToken: null, refreshToken: null, serializedUser: null };

beforeEach(() => {
  jest.resetAllMocks();
  values.clear();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => values.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { values.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => { values.delete(key); });
});

it("reads legacy installations and prefers the next atomic snapshot", async () => {
  values.set(STORAGE_KEYS.ACCESS_TOKEN, "legacy");
  expect((await authSessionStorage.read()).accessToken).toBe("legacy");
  await authSessionStorage.write("new", "refresh", "{}");
  expect(await authSessionStorage.read()).toEqual({ accessToken: "new", refreshToken: "refresh", serializedUser: "{}" });
});

it("serializes a pending write before logout without resurrecting credentials", async () => {
  const writing = authSessionStorage.write("access", "refresh", "{}");
  const clearing = authSessionStorage.clear();
  await Promise.all([writing, clearing]);
  expect(await authSessionStorage.read()).toEqual(empty);
});

it("keeps a tombstone when deleting legacy keys fails", async () => {
  values.set(STORAGE_KEYS.ACCESS_TOKEN, "legacy");
  jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error("denied"));
  await expect(authSessionStorage.clear()).rejects.toThrow("denied");
  expect(await authSessionStorage.read()).toEqual(empty);
});

it("deletes the atomic record if a tombstone cannot be written", async () => {
  await authSessionStorage.write("access", "refresh", "{}");
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error("quota"));
  await authSessionStorage.clear();
  expect(await authSessionStorage.read()).toEqual(empty);
});

it("does not fall back to legacy credentials after malformed atomic storage", async () => {
  await authSessionStorage.write("access", "refresh", "{}");
  values.set(STORAGE_KEYS.ACCESS_TOKEN, "legacy");
  const key = jest.mocked(SecureStore.setItemAsync).mock.calls[0]![0];
  values.set(key, "invalid JSON");
  expect(await authSessionStorage.read()).toEqual(empty);
});

it("updates tokens while preserving user and recovers the queue after failure", async () => {
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error("unavailable"));
  await expect(authSessionStorage.write("bad", null, "{}")).rejects.toThrow();
  await authSessionStorage.write("access", "refresh", "{\"id\":1}");
  await authSessionStorage.writeTokens("rotated", "rotated-refresh");
  expect((await authSessionStorage.read()).serializedUser).toBe('{"id":1}');
  await authSessionStorage.removeUser();
  expect(await authSessionStorage.read()).toEqual({ accessToken: "rotated", refreshToken: "rotated-refresh", serializedUser: null });
});

it("migrates v2 credentials to a key available after the first device unlock", async () => {
  values.set("vinnot.auth.session.v2", JSON.stringify({ accessToken: "old", refreshToken: "refresh", serializedUser: "{}" }));
  await authSessionStorage.writeTokens("new", "new-refresh");
  expect(jest.mocked(SecureStore.setItemAsync)).toHaveBeenLastCalledWith("vinnot.auth.session.v3", expect.any(String),
    { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  await authSessionStorage.clear();
  expect(values.has("vinnot.auth.session.v2")).toBe(false);
});
it("refuses stale rotation and profile writes after logout", async () => {
  await authSessionStorage.write("access", "refresh", "{}");
  const stale = () => { throw new Error("superseded"); };
  await expect(authSessionStorage.prepareRotation("refresh", stale)).rejects.toThrow("superseded");
  await expect(authSessionStorage.writeUser("{}", stale)).rejects.toThrow("superseded");
  await expect(authSessionStorage.prepareRotation("other", () => undefined)).rejects.toThrow("Session changed");
});
it("preserves the pending rotation when updating the profile", async () => {
  values.set("vinnot.auth.session.v3", JSON.stringify({ accessToken: "old", refreshToken: "refresh", serializedUser: "{}", pendingRotationId: "operation" }));
  await authSessionStorage.writeUser('{"name":"new"}', () => undefined);
  expect(await authSessionStorage.read()).toMatchObject({ refreshToken: "refresh", pendingRotationId: "operation", serializedUser: '{"name":"new"}' });
});
