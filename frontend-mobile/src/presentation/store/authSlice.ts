import { pushNotificationsService } from "@/application/services/pushNotifications.service";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { rememberReturnPathValue } from "@/domain/navigation/returnPath";
import { AUTH_ERROR_MESSAGES } from "@/domain/user/auth.messages";
import {
  AuthApiError,
  AuthValidationError,
  authService,
  type AuthResult,
  type RegistrationResult,
  type SocialLoginRequest,
} from "@/application/services/auth.service";
import { authSessionService } from "@/application/services/authSession.service";
import { sessionRenewalService } from "@/application/services/sessionRenewal.service";
import type { User } from "@/domain/user/user.types";
import type { AppState, AuthState } from "./state.types";
import { appApi } from "./api";
import { coverImagesService } from "@/application/services/coverImages.service";

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isInitializing: true,
  isSessionExpired: false,
};

export type AuthThunkErrorPayload =
  | {
      name: "AuthValidationError";
      message: string;
      fieldErrors: Record<string, string[]>;
    }
  | {
      name: "AuthApiError";
      message: string;
      statusCode: number;
      isSessionExpired: boolean;
      code?: string;
    }
  | {
      name: "Error";
      message: string;
    };

function serializeAuthError(error: unknown): AuthThunkErrorPayload {
  if (error instanceof AuthValidationError) {
    return {
      name: "AuthValidationError",
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  if (error instanceof AuthApiError) {
    return {
      name: "AuthApiError",
      message: error.message,
      statusCode: error.statusCode,
      isSessionExpired: error.isSessionExpired,
      code: error.code,
    };
  }

  return {
    name: "Error",
    message: error instanceof Error ? error.message : AUTH_ERROR_MESSAGES.unexpected,
  };
}

function canRestoreStoredSession(error: unknown): error is AuthApiError {
  return (
    error instanceof AuthApiError &&
    !error.isSessionExpired &&
    (error.statusCode === 0 || error.statusCode === 429 || error.statusCode >= 500)
  );
}

type SessionPersistenceOperation = "session" | "tokens" | "clear";

function sessionGuard(getState: () => Pick<AppState, "auth">): () => void {
  const generation = getState().auth.sessionGeneration ?? 0;
  return () => {
    if (generation !== (getState().auth.sessionGeneration ?? 0)) {
      throw new Error("Session operation superseded");
    }
  };
}

async function clearPersistedSession(): Promise<void> {
  // Private cover images must not outlive the session that was allowed to read them.
  coverImagesService.clearPreviews();
  try { await authSessionService.clear(); } catch (error) {
    reportSessionPersistenceFailure("clear", error);
  }
}

function reportSessionPersistenceFailure(
  operation: SessionPersistenceOperation,
  error: unknown,
): void {
  if (!__DEV__) return;
  console.warn("[Vinnot Auth] Session persistence failed", {
    operation,
    message: error instanceof Error ? error.message : "Unknown storage error",
  });
}

async function persistSessionBestEffort(
  accessToken: string,
  refreshToken: string | null,
  user: User,
): Promise<void> {
  try {
    await authSessionService.persist(accessToken, refreshToken, user);
  } catch (error) {
    reportSessionPersistenceFailure("session", error);
  }
}

function renewSession(token: string, getState: () => Pick<AppState, "auth">, assertCurrent: () => void) {
  return sessionRenewalService.renew(token, {
    owner: getState, generation: getState().auth.sessionGeneration ?? 0, assertCurrent,
  });
}

async function persistUserBestEffort(user: User, assertCurrent: () => void): Promise<void> {
  try { await authSessionService.persistUser(user, assertCurrent); }
  catch (error) { reportSessionPersistenceFailure("session", error); }
  assertCurrent();
}

export const login = createAsyncThunk<
  AuthResult,
  { usernameOrEmail: string; password: string; reactivate?: boolean },
  { rejectValue: AuthThunkErrorPayload; state: Pick<AppState, "auth"> }
>(
  "auth/login",
  async ({ usernameOrEmail, password, reactivate }, { dispatch, rejectWithValue, getState }) => {
    const assertCurrent = sessionGuard(getState);
    try {
      const result = await authService.login(usernameOrEmail, password, reactivate);
      assertCurrent();
      dispatch(appApi.util.resetApiState());
      await persistSessionBestEffort(
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.user,
      );
      assertCurrent();
      return result;
    } catch (error) {
      return rejectWithValue(serializeAuthError(error));
    }
  },
);

export const register = createAsyncThunk<
  RegistrationResult,
  { username: string; email: string; password: string; firstName: string; lastName: string; termsAcceptance?: import('@/domain/legal/agreement').TermsSelection },
  { rejectValue: AuthThunkErrorPayload }
>(
  "auth/register",
  async ({ username, email, password, firstName, lastName, termsAcceptance }, { rejectWithValue }) => {
    try {
      return await authService.register(username, email, password, firstName, lastName, termsAcceptance);
    } catch (error) {
      return rejectWithValue(serializeAuthError(error));
    }
  },
);

export const socialLogin = createAsyncThunk<
  AuthResult,
  SocialLoginRequest,
  { rejectValue: AuthThunkErrorPayload; state: Pick<AppState, "auth"> }
>("auth/socialLogin", async (request, { dispatch, rejectWithValue, getState }) => {
  const assertCurrent = sessionGuard(getState);
  try {
    const result = await authService.socialLogin(request);
    assertCurrent();
    dispatch(appApi.util.resetApiState());
    await persistSessionBestEffort(
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.user,
    );
    return result;
  } catch (error) {
    return rejectWithValue(serializeAuthError(error));
  }
});

export const clearSession = createAsyncThunk("auth/clearSession", async (_arg, { dispatch, getState }) => {
  sessionRenewalService.forget(getState);
  dispatch(appApi.util.resetApiState());
  await clearPersistedSession();
});

export const syncAuthenticatedUser = createAsyncThunk<User, User, { state: Pick<AppState, "auth"> }>(
  "auth/syncAuthenticatedUser",
  async (user, { getState }) => {
    const assertCurrent = sessionGuard(getState);
    const { accessToken } = getState().auth;
    if (accessToken) {
      await persistUserBestEffort(user, assertCurrent);
    }
    assertCurrent();
    return user;
  },
);

/** Refresh the current account without restarting auth or the mounted navigator. */
export const refreshAuthenticatedUser = createAsyncThunk<
  User, void, { state: Pick<AppState, "auth">; rejectValue: AuthThunkErrorPayload }
>("auth/refreshAuthenticatedUser", async (_arg, { getState, requestId, rejectWithValue }) => {
  const assertCurrent = sessionGuard(getState);
  const assertLatest = () => {
    assertCurrent();
    if (getState().auth.pendingUserRequest !== requestId) throw new Error("Profile operation superseded");
  };
  try {
    if (!getState().auth.accessToken) throw new AuthApiError(AUTH_ERROR_MESSAGES.sessionExpired, 401, true);
    const user = await authService.getCurrentUser();
    assertLatest();
    const { accessToken } = getState().auth;
    if (accessToken) await persistUserBestEffort(user, assertCurrent);
    assertLatest();
    return user;
  } catch (error) {
    return rejectWithValue(serializeAuthError(error));
  }
});

export const logout = createAsyncThunk<void, void, { state: Pick<AppState, "auth"> }>(
  "auth/logout",
  async (_arg, { getState, dispatch }) => {
    const refreshToken = getState().auth.refreshToken ?? undefined;
    const pushToken = (await pushNotificationsService.tokenForLogout()) ?? undefined;
    pushNotificationsService.forgetToken();
    await Promise.all([authService.logout(refreshToken, pushToken), dispatch(clearSession()).unwrap()]);
  },
);

export const initSession = createAsyncThunk<
  { user: User | null; accessToken: string | null; refreshToken: string | null },
  void,
  { state: Pick<AppState, "auth"> }
>("auth/initSession", async (_arg, { dispatch, getState }) => {
  const assertCurrent = sessionGuard(getState);
  const storedSession = await authSessionService.restore();
  assertCurrent();
  const { user: storedUser } = storedSession;
  let accessToken = storedSession.accessToken;
  let refreshToken = storedSession.refreshToken;

  if (!accessToken && !refreshToken) {
    dispatch(appApi.util.resetApiState());
    return { user: null, accessToken: null, refreshToken: null };
  }

  try {
    if (!accessToken && refreshToken) {
      const refreshed = await renewSession(refreshToken, getState, assertCurrent);
      assertCurrent();
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;
    }
    if (!accessToken) {
      throw new AuthApiError(AUTH_ERROR_MESSAGES.sessionExpired, 401, true);
    }

    try {
      const user = await authService.getCurrentUser(accessToken);
      assertCurrent();
      await persistUserBestEffort(user, assertCurrent);
      assertCurrent();
      return { user, accessToken, refreshToken };
    } catch (error) {
      const shouldRefresh =
        error instanceof AuthApiError && error.isSessionExpired && !!refreshToken;
      if (!shouldRefresh) throw error;

      const currentRefreshToken = refreshToken;
      if (!currentRefreshToken) {
        throw new AuthApiError(AUTH_ERROR_MESSAGES.sessionExpired, 401, true);
      }
      const refreshed = await renewSession(currentRefreshToken, getState, assertCurrent);
      assertCurrent();
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;
      const user = await authService.getCurrentUser(accessToken);
      assertCurrent();
      await persistUserBestEffort(user, assertCurrent);
      assertCurrent();
      return { user, accessToken, refreshToken };
    }
  } catch (error) {
    assertCurrent();
    if (canRestoreStoredSession(error) && storedUser && accessToken) {
      return { user: storedUser, accessToken, refreshToken };
    }

    dispatch(appApi.util.resetApiState());
    await clearPersistedSession();
    return { user: null, accessToken: null, refreshToken: null };
  }
});

export const refreshSession = createAsyncThunk<
  { accessToken: string; refreshToken: string } | null,
  void,
  { state: Pick<AppState, "auth"> }
>("auth/refreshSession", async (_arg, { dispatch, getState }) => {
  const assertCurrent = sessionGuard(getState);
  const current = getState().auth.refreshToken;
  if (!current) {
    dispatch(appApi.util.resetApiState());
    await clearPersistedSession();
    return null;
  }
  try {
    const refreshed = await renewSession(current, getState, assertCurrent);
    assertCurrent();
    return {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    };
  } catch (error) {
    assertCurrent();
    if (canRestoreStoredSession(error)) {
      throw error;
    }
    dispatch(appApi.util.resetApiState());
    await clearPersistedSession();
    return null;
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setReturnPath(state, action: PayloadAction<string | null>) {
      state.returnPath = action.payload === null ? null : rememberReturnPathValue(state.returnPath, action.payload);
    },
  },
  extraReducers: (builder) => {
    const beginSession = (state: AuthState, requestId: string) => {
      state.sessionGeneration = (state.sessionGeneration ?? 0) + 1;
      state.pendingSessionRequest = requestId;
      state.pendingRefreshRequest = undefined;
      state.pendingUserRequest = undefined;
    };
    builder
      .addCase(login.pending, (state, action) => beginSession(state, action.meta.requestId))
      .addCase(socialLogin.pending, (state, action) => beginSession(state, action.meta.requestId))
      .addCase(refreshSession.pending, (state, action) => { state.pendingRefreshRequest = action.meta.requestId; })
      .addCase(refreshAuthenticatedUser.pending, (state, action) => { state.pendingUserRequest = action.meta.requestId; })
      .addCase(syncAuthenticatedUser.pending, (state, action) => { state.pendingUserRequest = action.meta.requestId; })
      .addCase(login.fulfilled, (state, action) => {
        if (state.pendingSessionRequest !== action.meta.requestId) return;
        state.user = action.payload.user;
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
        state.isSessionExpired = false;
        state.isInitializing = false;
      })
      .addCase(socialLogin.fulfilled, (state, action) => {
        if (state.pendingSessionRequest !== action.meta.requestId) return;
        state.user = action.payload.user;
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
        state.isSessionExpired = false;
        state.isInitializing = false;
      })
      .addCase(refreshAuthenticatedUser.fulfilled, (state, action) => {
        if (state.pendingUserRequest !== action.meta.requestId) return;
        state.user = action.payload;
      })
      .addCase(syncAuthenticatedUser.fulfilled, (state, action) => {
        if (state.pendingUserRequest !== action.meta.requestId) return;
        state.user = action.payload;
      })
      .addCase(clearSession.pending, (state) => {
        beginSession(state, "");
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isInitializing = false;
        state.isSessionExpired = false;
      })
      .addCase(initSession.pending, (state, action) => {
        beginSession(state, action.meta.requestId);
        state.isInitializing = true;
      })
      .addCase(initSession.fulfilled, (state, action) => {
        if (state.pendingSessionRequest !== action.meta.requestId) return;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isInitializing = false;
        state.isSessionExpired = false;
      })
      .addCase(initSession.rejected, (state, action) => {
        if (state.pendingSessionRequest !== action.meta.requestId) return;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isInitializing = false;
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        if (state.pendingRefreshRequest !== action.meta.requestId) return;
        if (action.payload) {
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken;
          state.isSessionExpired = false;
          return;
        }
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isSessionExpired = true;
      });
  },
});

export default authSlice.reducer;
export const { setReturnPath } = authSlice.actions;

export const selectAuthState = (state: Pick<AppState, "auth">) => state.auth;
export const selectAuthUser = (state: Pick<AppState, "auth">) => state.auth.user;
export const selectAccessToken = (state: Pick<AppState, "auth">) => state.auth.accessToken;
export const selectRefreshToken = (state: Pick<AppState, "auth">) => state.auth.refreshToken;
export const selectIsInitializing = (state: Pick<AppState, "auth">) => state.auth.isInitializing;
export const selectIsAuthenticated = (state: Pick<AppState, "auth">) =>
  !!state.auth.user && !!state.auth.accessToken;
