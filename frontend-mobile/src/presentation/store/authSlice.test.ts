import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AuthApiError, authService } from "@/application/services/auth.service";
import { authSessionService } from "@/application/services/authSession.service";
import type { User } from "@/domain/user/user.types";
import { appApi } from "./api";
import authReducer, { initSession, login, clearSession, refreshSession, refreshAuthenticatedUser, setReturnPath, syncAuthenticatedUser } from "./authSlice";

describe("auth return destination", () => {
  it("keeps a protected deep link when the login route is remembered afterwards", () => {
    const store = configureStore({ reducer: { auth: authReducer } });
    store.dispatch(setReturnPath("/my-tickets/ticket-1"));
    store.dispatch(setReturnPath("/login"));
    expect(store.getState().auth.returnPath).toBe("/my-tickets/ticket-1");
  });

  it("still replaces and clears the remembered destination", () => {
    const store = configureStore({ reducer: { auth: authReducer } });
    store.dispatch(setReturnPath("/wines/one"));
    store.dispatch(setReturnPath("/my-tickets"));
    expect(store.getState().auth.returnPath).toBe("/my-tickets");
    store.dispatch(setReturnPath(null));
    expect(store.getState().auth.returnPath).toBeNull();
  });
});

jest.mock("@/application/services/auth.service", () => {
  const actual = jest.requireActual("@/application/services/auth.service") as object;
  return {
    ...actual,
    authService: {
      getCurrentUser: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
    },
  };
});

jest.mock("@/application/services/authSession.service", () => ({
  authSessionService: {
    restore: jest.fn(),
    persist: jest.fn(),
    persistTokens: jest.fn(),
    persistUser: jest.fn(),
    prepareRotation: jest.fn(),
    completeRotation: jest.fn(),
    clear: jest.fn(),
  },
}));

const authServiceMock = authService as jest.Mocked<typeof authService>;
const sessionServiceMock = authSessionService as jest.Mocked<typeof authSessionService>;

const storedUser: User = {
  id: "usr-1",
  username: "ana",
  email: "ana@vinnot.com",
  firstName: "Ana",
  lastName: "",
  name: "Ana",
  avatarUrl: null,
  roles: ["ROLE_USER"],
  emailVerified: true,
  hasSocialIdentity: false,
  hasPassword: true,
  socialProviders: [],
  onboardingCompleted: true,
  createdAt: "2026-07-20T10:00:00.000Z",
  updatedAt: "2026-07-20T10:00:00.000Z",
};

function createTestStore(seen: string[] = []) {
  return configureStore({
    reducer: {
      auth: authReducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(appApi.middleware, () => (next: (action: unknown) => unknown) => (action: unknown) => {
        if (typeof action === "object" && action !== null && "type" in action) seen.push(String(action.type));
        return next(action);
      }),
  });
}

describe("authSlice session restoration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionServiceMock.persist.mockResolvedValue();
    sessionServiceMock.persistTokens.mockResolvedValue();
    sessionServiceMock.persistUser.mockResolvedValue();
    sessionServiceMock.prepareRotation.mockResolvedValue("55a444cf-50c9-499c-ad59-30c7c08b12a1");
    sessionServiceMock.completeRotation.mockResolvedValue();
    sessionServiceMock.clear.mockResolvedValue();
  });

  it("validates a restored session with its persisted access token", async () => {
    sessionServiceMock.restore.mockResolvedValue({
      accessToken: "persisted-access",
      refreshToken: "persisted-refresh",
      user: storedUser,
    });
    authServiceMock.getCurrentUser.mockResolvedValue(storedUser);
    const store = createTestStore();

    await store.dispatch(initSession());

    expect(authServiceMock.getCurrentUser).toHaveBeenCalledWith("persisted-access");
    expect(store.getState().auth).toMatchObject({
      user: storedUser,
      accessToken: "persisted-access",
      refreshToken: "persisted-refresh",
      isInitializing: false,
    });
  });

  it("uses the validated stored user only for temporary connectivity failures", async () => {
    sessionServiceMock.restore.mockResolvedValue({
      accessToken: "persisted-access",
      refreshToken: "persisted-refresh",
      user: storedUser,
    });
    authServiceMock.getCurrentUser.mockRejectedValue(
      new AuthApiError("Sin conexión", 0, false),
    );
    const store = createTestStore();

    await store.dispatch(initSession());

    expect(store.getState().auth.user).toEqual(storedUser);
    expect(sessionServiceMock.clear).not.toHaveBeenCalled();
  });

  it("clears a session explicitly rejected by the backend", async () => {
    sessionServiceMock.restore.mockResolvedValue({
      accessToken: "persisted-access",
      refreshToken: "persisted-refresh",
      user: storedUser,
    });
    authServiceMock.getCurrentUser.mockRejectedValue(
      new AuthApiError("Cuenta bloqueada", 403, false),
    );
    const store = createTestStore();

    await store.dispatch(initSession());

    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.accessToken).toBeNull();
    expect(sessionServiceMock.clear).toHaveBeenCalledTimes(1);
  });

  it("persists and exposes the rotated refresh token during restoration", async () => {
    sessionServiceMock.restore.mockResolvedValue({
      accessToken: "expired-access",
      refreshToken: "old-refresh",
      user: storedUser,
    });
    authServiceMock.getCurrentUser
      .mockRejectedValueOnce(new AuthApiError("Sesión expirada", 401, true))
      .mockResolvedValueOnce(storedUser);
    authServiceMock.refreshToken.mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "rotated-refresh",
      expiresIn: 3600,
    });
    const store = createTestStore();

    await store.dispatch(initSession());

    expect(sessionServiceMock.completeRotation).toHaveBeenCalledWith(
      "old-refresh", expect.any(String), "new-access", "rotated-refresh", expect.any(Function),
    );
    expect(store.getState().auth).toMatchObject({
      accessToken: "new-access",
      refreshToken: "rotated-refresh",
      user: storedUser,
    });
  });

  it("keeps an authenticated login active when secure persistence is unavailable", async () => {
    const storageError = new Error("Keychain unavailable");
    const consoleWarning = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    authServiceMock.login.mockResolvedValue({
      user: storedUser,
      tokens: {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresIn: 900_000,
      },
    });
    sessionServiceMock.persist.mockRejectedValue(storageError);
    const store = createTestStore();

    const action = await store.dispatch(login({
      usernameOrEmail: "ana@vinnot.com",
      password: "Password1!",
    }));

    expect(action.type).toBe("auth/login/fulfilled");
    expect(store.getState().auth).toMatchObject({
      user: storedUser,
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
    expect(consoleWarning).toHaveBeenCalledWith(
      "[Vinnot Auth] Session persistence failed",
      { operation: "session", message: "Keychain unavailable" },
    );
    consoleWarning.mockRestore();
  });

  it("keeps a backend-validated restored session when rewriting storage fails", async () => {
    const consoleWarning = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    sessionServiceMock.restore.mockResolvedValue({
      accessToken: "persisted-access",
      refreshToken: "persisted-refresh",
      user: storedUser,
    });
    authServiceMock.getCurrentUser.mockResolvedValue(storedUser);
    sessionServiceMock.persist.mockRejectedValue(new Error("Keychain unavailable"));
    const store = createTestStore();

    await store.dispatch(initSession());

    expect(store.getState().auth).toMatchObject({
      user: storedUser,
      accessToken: "persisted-access",
      refreshToken: "persisted-refresh",
    });
    expect(sessionServiceMock.clear).not.toHaveBeenCalled();
    consoleWarning.mockRestore();
  });
});

describe("session race protection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionServiceMock.persist.mockResolvedValue();
    sessionServiceMock.persistTokens.mockResolvedValue();
    sessionServiceMock.persistUser.mockResolvedValue();
    sessionServiceMock.prepareRotation.mockResolvedValue("55a444cf-50c9-499c-ad59-30c7c08b12a1");
    sessionServiceMock.completeRotation.mockResolvedValue();
    sessionServiceMock.clear.mockResolvedValue();
  });

  it("ignores a login result arriving after local logout", async () => {
    let resolve!: (value: Awaited<ReturnType<typeof authService.login>>) => void;
    authServiceMock.login.mockReturnValue(new Promise((done) => { resolve = done; }));
    const store = createTestStore();
    const operation = store.dispatch(login({ usernameOrEmail: "ana", password: "password" }));
    await store.dispatch(clearSession());
    resolve({ user: storedUser, tokens: { accessToken: "late", refreshToken: "late-refresh", expiresIn: 900 } });
    expect((await operation).meta.requestStatus).toBe("rejected");
    expect(store.getState().auth.accessToken).toBeNull();
    expect(sessionServiceMock.persist).not.toHaveBeenCalled();
  });

  it("clears private API cache even when secure storage rejects deletion", async () => {
    sessionServiceMock.clear.mockRejectedValue(new Error("secure storage unavailable"));
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const seen: string[] = [];
    const store = createTestStore(seen);
    await store.dispatch(clearSession());
    expect(seen).toContain(appApi.util.resetApiState.type);
    expect(store.getState().auth.user).toBeNull();
    warning.mockRestore();
  });

  it("does not persist refresh credentials after session invalidation", async () => {
    authServiceMock.login.mockResolvedValue({ user: storedUser, tokens: { accessToken: "access", refreshToken: "refresh", expiresIn: 900 } });
    const store = createTestStore();
    await store.dispatch(login({ usernameOrEmail: "ana", password: "password" }));
    let resolve!: (value: Awaited<ReturnType<typeof authService.refreshToken>>) => void;
    authServiceMock.refreshToken.mockReturnValue(new Promise((done) => { resolve = done; }));
    const refresh = store.dispatch(refreshSession());
    await store.dispatch(clearSession());
    resolve({ accessToken: "stale", refreshToken: "stale-refresh", expiresIn: 900 });
    expect((await refresh).meta.requestStatus).toBe("rejected");
    expect(store.getState().auth.accessToken).toBeNull();
    expect(sessionServiceMock.persistTokens).not.toHaveBeenCalled();
  });
});

describe("refreshing the authenticated profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionServiceMock.persist.mockResolvedValue();
    sessionServiceMock.clear.mockResolvedValue();
    authServiceMock.login.mockResolvedValue({ user: storedUser, tokens: { accessToken: "access", refreshToken: "refresh", expiresIn: 900 } });
  });
  it("updates the account without restarting the session or removing the navigator", async () => {
    const store = createTestStore();
    await store.dispatch(login({ usernameOrEmail: "ana", password: "password" }));
    sessionServiceMock.persist.mockClear();
    const generation = store.getState().auth.sessionGeneration;
    let resolve!: (user: User) => void;
    authServiceMock.getCurrentUser.mockReturnValue(new Promise(done => { resolve = done; }));
    const request = store.dispatch(refreshAuthenticatedUser());
    expect(store.getState().auth).toMatchObject({ isInitializing: false, sessionGeneration: generation, user: storedUser });
    const updated = { ...storedUser, name: "Ana actualizada" };
    resolve(updated);
    await request;
    expect(store.getState().auth).toMatchObject({ isInitializing: false, sessionGeneration: generation, user: updated });
    expect(sessionServiceMock.restore).not.toHaveBeenCalled();
    expect(sessionServiceMock.persistUser).toHaveBeenCalledWith(updated, expect.any(Function));
  });
  it("retains the profile on a temporary error without triggering session initialization", async () => {
    const store = createTestStore();
    await store.dispatch(login({ usernameOrEmail: "ana", password: "password" }));
    authServiceMock.getCurrentUser.mockRejectedValue(new AuthApiError("Sin conexión", 0, false));
    expect((await store.dispatch(refreshAuthenticatedUser())).meta.requestStatus).toBe("rejected");
    expect(store.getState().auth).toMatchObject({ isInitializing: false, user: storedUser });
  });
  it("discards a profile response arriving after logout before persisting it", async () => {
    const store = createTestStore();
    await store.dispatch(login({ usernameOrEmail: "ana", password: "password" }));
    sessionServiceMock.persist.mockClear();
    let resolve!: (user: User) => void;
    authServiceMock.getCurrentUser.mockReturnValue(new Promise(done => { resolve = done; }));
    const request = store.dispatch(refreshAuthenticatedUser());
    await store.dispatch(clearSession());
    resolve(storedUser);
    expect((await request).meta.requestStatus).toBe("rejected");
    expect(store.getState().auth.user).toBeNull();
    expect(sessionServiceMock.persist).not.toHaveBeenCalled();
  });
  it("does not overwrite a newer profile edit with an older refresh response", async () => {
    const store = createTestStore();
    await store.dispatch(login({ usernameOrEmail: "ana", password: "password" }));
    let resolve!: (user: User) => void;
    authServiceMock.getCurrentUser.mockReturnValue(new Promise(done => { resolve = done; }));
    const request = store.dispatch(refreshAuthenticatedUser());
    const updated = { ...storedUser, avatarUrl: "https://vinnot.com/avatar.png" };
    await store.dispatch(syncAuthenticatedUser(updated));
    sessionServiceMock.persist.mockClear();
    resolve(storedUser);
    expect((await request).meta.requestStatus).toBe("rejected");
    expect(store.getState().auth.user).toEqual(updated);
    expect(sessionServiceMock.persist).not.toHaveBeenCalled();
  });
});
