import { useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  useAuthStore,
  selectIsAuthenticated,
  selectIsInitializing,
} from "@/presentation/store/auth.store";
import { VinnotLaunchScreen } from "@/presentation/features/auth";

export default function RootIndex() {
  const router = useRouter();
  const isInitializing = useAuthStore(selectIsInitializing);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  useFocusEffect(useCallback(() => {
    if (isInitializing) {
      return undefined;
    }

    router.replace(isAuthenticated ? "/(app)/(tabs)/home" : "/(onboarding)/welcome");
  }, [isAuthenticated, isInitializing, router]));

  return <VinnotLaunchScreen />;
}
