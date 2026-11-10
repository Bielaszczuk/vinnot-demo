import { useMemo } from "react";
import type { Role } from "@/shared/config/roles";
import { AuthApiError, AuthValidationError } from "@/application/services/auth.service";
import type { User } from "@/domain/user/user.types";
import { useAppDispatch, useAppSelector } from "@/presentation/store/hooks";
import {
  type AuthThunkErrorPayload,
  clearSession as clearSessionThunk,
  initSession as initSessionThunk,
  refreshAuthenticatedUser as refreshAuthenticatedUserThunk,
  login as loginThunk,
  logout as logoutThunk,
  refreshSession as refreshSessionThunk,
  register as registerThunk,
  socialLogin as socialLoginThunk,
  syncAuthenticatedUser as syncAuthenticatedUserThunk,
  selectAuthState,
  selectAuthUser as selectAuthUserFromSlice,
  selectIsAuthenticated as selectIsAuthenticatedFromSlice,
  selectIsInitializing as selectIsInitializingFromSlice,
  setReturnPath,
} from "@/presentation/store/authSlice";
import type {
  AuthResult,
  RegistrationResult,
  SocialLoginRequest,
} from "@/application/services/auth.service";
import type { AuthState as SliceAuthState } from "@/presentation/store/state.types";
import { AUTH_ERROR_MESSAGES } from "@/domain/user/auth.messages";

export type AuthState = SliceAuthState;

export interface AuthActions {
  rememberReturnPath: (path: string) => void;
  clearReturnPath: () => void;
  login: (usernameOrEmail: string, password: string, reactivate?: boolean) => Promise<AuthResult>;
  register: (
    username: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    termsAcceptance?: import('@/domain/legal/agreement').TermsSelection,
  ) => Promise<RegistrationResult>;
  socialLogin: (request: SocialLoginRequest) => Promise<AuthResult>;
  logout: () => Promise<void>;
  initSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  clearSession: () => Promise<void>;
  syncUser: (user: User) => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

function rethrowAuthError(error: unknown): never {
  const payload = error as Partial<AuthThunkErrorPayload>;

  if (payload.name === "AuthValidationError") {
    throw new AuthValidationError(
      payload.message ?? AUTH_ERROR_MESSAGES.invalidData,
      "fieldErrors" in payload ? (payload.fieldErrors ?? {}) : {},
    );
  }

  if (payload.name === "AuthApiError") {
    throw new AuthApiError(
      payload.message ?? AUTH_ERROR_MESSAGES.authenticationFailed,
      "statusCode" in payload ? (payload.statusCode ?? 500) : 500,
      "isSessionExpired" in payload ? (payload.isSessionExpired ?? false) : false,
      "code" in payload ? payload.code : undefined,
    );
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error(payload.message ?? AUTH_ERROR_MESSAGES.unexpected);
}

export function useAuthStore<T>(selector: (state: AuthStore) => T): T {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectAuthState);

  const actions = useMemo<AuthActions>(
    () => ({
      rememberReturnPath: (path) => { dispatch(setReturnPath(path)); },
      clearReturnPath: () => { dispatch(setReturnPath(null)); },
      login: async (usernameOrEmail, password, reactivate) =>
        dispatch(loginThunk({ usernameOrEmail, password, reactivate }))
          .unwrap()
          .catch(rethrowAuthError),
      register: async (username, email, password, firstName, lastName, termsAcceptance) =>
        dispatch(registerThunk({ username, email, password, firstName, lastName, termsAcceptance }))
          .unwrap()
          .catch(rethrowAuthError),
      socialLogin: async (request) =>
        dispatch(socialLoginThunk(request)).unwrap().catch(rethrowAuthError),
      logout: async () => {
        dispatch(setReturnPath(null));
        await dispatch(logoutThunk()).unwrap();
      },
      initSession: async () => {
        await dispatch(initSessionThunk()).unwrap();
      },
      refreshUser: async () => {
        await dispatch(refreshAuthenticatedUserThunk()).unwrap().catch(rethrowAuthError);
      },
      refreshSession: async () => {
        const result = await dispatch(refreshSessionThunk()).unwrap();
        return result?.accessToken ?? null;
      },
      clearSession: async () => {
        await dispatch(clearSessionThunk()).unwrap();
      },
      syncUser: async (user) => {
        await dispatch(syncAuthenticatedUserThunk(user)).unwrap();
      },
    }),
    [dispatch],
  );

  const storeShape = useMemo<AuthStore>(() => ({ ...state, ...actions }), [state, actions]);
  return selector(storeShape);
}

export const selectIsAuthenticated = (state: AuthStore): boolean =>
  !!state.user && !!state.accessToken;
export const selectUser = (state: AuthStore) => state.user;
export const selectAccessToken = (state: AuthStore) => state.accessToken;
export const selectRefreshToken = (state: AuthStore) => state.refreshToken;
export const selectIsInitializing = (state: AuthStore) => state.isInitializing;

export function useHasRole(user: User | null, roles: Role | Role[]): boolean {
  if (!user) return false;
  const list = Array.isArray(roles) ? roles : [roles];
  return list.some((role) => user.roles.includes(role));
}

export const selectIsAuthenticatedSlice = selectIsAuthenticatedFromSlice;
export const selectIsInitializingSlice = selectIsInitializingFromSlice;
export const selectUserSlice = selectAuthUserFromSlice;
