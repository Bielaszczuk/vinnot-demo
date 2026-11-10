/**
 * useAuth — single ergonomic accessor to the auth store.
 *
 * Returns user, role helpers, auth status, and bound action methods.
 * Used by all UI screens — no other place should import the auth store directly.
 */
import { useCallback } from "react";
import {
  useAuthStore,
  selectIsAuthenticated,
  selectIsInitializing,
  selectUser,
} from "@/presentation/store/auth.store";
import type { Role } from "@/shared/config/roles";

export function useAuth() {
  const user = useAuthStore(selectUser);
  const returnPath = useAuthStore((s) => s.returnPath);
  const rememberReturnPath = useAuthStore((s) => s.rememberReturnPath);
  const clearReturnPath = useAuthStore((s) => s.clearReturnPath);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isInitializing = useAuthStore(selectIsInitializing);
  const isSessionExpired = useAuthStore((s) => s.isSessionExpired);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const socialLogin = useAuthStore((s) => s.socialLogin);
  const logout = useAuthStore((s) => s.logout);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const initSession = useAuthStore((s) => s.initSession);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const syncUser = useAuthStore((s) => s.syncUser);

  const hasRole = useCallback(
    (roles: Role | Role[]): boolean => {
      if (!user) return false;
      const list = Array.isArray(roles) ? roles : [roles];
      return list.some((r) => user.roles.includes(r));
    },
    [user]
  );

  const hasAnyRole = useCallback(
    (roles: Role[]): boolean => hasRole(roles),
    [hasRole]
  );

  return {
    returnPath,
    rememberReturnPath,
    clearReturnPath,
    user,
    isAuthenticated,
    isInitializing,
    isSessionExpired,
    hasRole,
    hasAnyRole,
    login,
    register,
    socialLogin,
    logout,
    initSession,
    refreshUser,
    refreshSession,
    clearSession,
    syncUser,
  };
}
