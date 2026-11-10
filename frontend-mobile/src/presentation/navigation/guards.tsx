/**
 * Navigation guards — AuthGuard and RoleGuard.
 * Used in Expo Router layout files to protect routes.
 */
import { View } from "react-native";
import { useEffect } from "react";
import { Redirect, usePathname } from "expo-router";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useAuthStore, selectIsAuthenticated, selectIsInitializing } from "@/presentation/store/auth.store";
import { hasAnyRole } from "@/shared/config/roles";
import type { Role } from "@/shared/config/roles";
import { Spinner } from "@/presentation/components/ui/Feedback";
import { lightTokens } from "@/shared/theme/tokens";

interface AuthGuardProps {
  children: React.ReactNode;
}

/** Redirects unauthenticated users to /(auth)/login */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isInitializing, rememberReturnPath } = useAuth();
  const pathname = usePathname();
  useEffect(() => {
    if (!isAuthenticated && !isInitializing) rememberReturnPath(pathname);
  }, [isAuthenticated, isInitializing, pathname, rememberReturnPath]);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: lightTokens.bgBase, alignItems: "center", justifyContent: "center" }}>
        <Spinner size="lg" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <>{children}</>;
}

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoles: Role[];
}

/** Redirects users without required roles to /403 */
export function RoleGuard({ children, requiredRoles }: RoleGuardProps) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isInitializing = useAuthStore(selectIsInitializing);
  const user = useAuthStore((s) => s.user);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: lightTokens.bgBase, alignItems: "center", justifyContent: "center" }}>
        <Spinner size="lg" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!user || !hasAnyRole(user.roles, requiredRoles)) {
    return <Redirect href="/403" />;
  }

  return <>{children}</>;
}
