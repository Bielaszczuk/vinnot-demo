import * as SecureStore from "expo-secure-store";
import { authSessionStorage } from "@/infrastructure/storage/authSession.storage";
import { authService } from "./auth.service";
import { sessionRenewalService } from "./sessionRenewal.service";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 4,
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "bc913fd9-a7bb-44b9-80a6-480a5e9a56ee" }));
jest.mock("./auth.service", () => ({
  ...jest.requireActual("./auth.service"), authService: { refreshToken: jest.fn() },
}));
const values = new Map<string, string>();
const tokens = { accessToken: "new-access", refreshToken: "successor", expiresIn: 900 };
const guard = () => undefined;
const context = () => ({ owner: {}, generation: 1, assertCurrent: guard });
beforeEach(async () => {
  jest.resetAllMocks(); values.clear();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => values.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { values.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { values.delete(key); });
  await authSessionStorage.write("old-access", "old-refresh", "{}");
  jest.mocked(authService.refreshToken).mockResolvedValue(tokens);
});
it("joins concurrent refreshes and durably commits one successor", async () => {
  const ctx = context();
  const first = sessionRenewalService.renew("old-refresh", ctx);
  expect(sessionRenewalService.renew("old-refresh", ctx)).toBe(first);
  await expect(first).resolves.toEqual(tokens);
  expect(authService.refreshToken).toHaveBeenCalledTimes(1);
  expect(await authSessionStorage.read()).toEqual({ ...tokens, serializedUser: "{}", expiresIn: undefined });
});
it("recovers the same operation after a lost response and cold start", async () => {
  jest.mocked(authService.refreshToken).mockRejectedValueOnce(new Error("connection lost"));
  await expect(sessionRenewalService.renew("old-refresh", context())).rejects.toThrow("connection lost");
  const intent = (await authSessionStorage.read()).pendingRotationId;
  await expect(sessionRenewalService.renew("old-refresh", context())).resolves.toEqual(tokens);
  expect(jest.mocked(authService.refreshToken).mock.calls).toEqual([
    ["old-refresh", intent], ["old-refresh", intent],
  ]);
});
it("keeps a recoverable intent when final persistence fails", async () => {
  jest.mocked(authService.refreshToken).mockImplementationOnce(async () => {
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error("device locked"));
    return tokens;
  });
  await expect(sessionRenewalService.renew("old-refresh", context())).rejects.toMatchObject({ statusCode: 0 });
  expect((await authSessionStorage.read()).refreshToken).toBe("old-refresh");
  await expect(sessionRenewalService.renew("old-refresh", context())).resolves.toEqual(tokens);
});
it("does not spend the refresh credential if the intent cannot be saved", async () => {
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error("locked"));
  await expect(sessionRenewalService.renew("old-refresh", context())).rejects.toMatchObject({ statusCode: 0 });
  expect(authService.refreshToken).not.toHaveBeenCalled();
});
it("does not restore credentials when logout happens during the response", async () => {
  let current = true;
  jest.mocked(authService.refreshToken).mockImplementationOnce(async () => {
    current = false; await authSessionStorage.clear(); return tokens;
  });
  await expect(sessionRenewalService.renew("old-refresh", {
    ...context(), assertCurrent: () => { if (!current) throw new Error("superseded"); },
  })).rejects.toThrow("superseded");
  expect((await authSessionStorage.read()).refreshToken).toBeNull();
});
it("does not join another generation or let its late response overwrite the new session", async () => {
  let release!: (value: typeof tokens) => void;
  jest.mocked(authService.refreshToken).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const ctx = context();
  let generation = 1;
  const first = sessionRenewalService.renew("old-refresh", {
    ...ctx, assertCurrent: () => { if (generation !== 1) throw new Error("superseded"); },
  });
  const failure = expect(first).rejects.toThrow("superseded");
  while (!release) await new Promise(resolve => setTimeout(resolve, 0));
  generation = 2;
  await authSessionStorage.write("other-access", "other-refresh", "{}");
  const next = sessionRenewalService.renew("other-refresh", { ...ctx, generation });
  release(tokens);
  await failure;
  await expect(next).resolves.toEqual(tokens);
  expect(authService.refreshToken).toHaveBeenCalledTimes(2);
});

it("reuses the committed result for a late caller that still holds the previous token", async () => {
  const ctx = context();
  await sessionRenewalService.renew("old-refresh", ctx);
  await expect(sessionRenewalService.renew("old-refresh", ctx)).resolves.toEqual(tokens);
  expect(authService.refreshToken).toHaveBeenCalledTimes(1);
});


it("forgets a completed result when the session is cleared", async () => {
  const ctx = context();
  await sessionRenewalService.renew("old-refresh", ctx);
  sessionRenewalService.forget(ctx.owner);
  await authSessionStorage.clear();
  await expect(sessionRenewalService.renew("old-refresh", ctx)).rejects.toMatchObject({ statusCode: 0 });
});
