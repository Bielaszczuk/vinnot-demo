import { Stack } from "expo-router";
import {
  selectIsAuthenticated,
  selectIsInitializing,
  useAuthStore,
} from "@/presentation/store/auth.store";
import { ActivitySync } from "./ActivitySync";
import { PushNotificationsSync } from "./PushNotificationsSync";

export function RootNavigator() {
  const authenticated = useAuthStore(selectIsAuthenticated);
  const initializing = useAuthStore(selectIsInitializing);
  return (
    <>
    <PushNotificationsSync />
    <ActivitySync />
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" />
      {/* Remove welcome history at login; retain public recovery and deep-link routes. */}
      <Stack.Protected guard={!authenticated && !initializing}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="403" options={{ presentation: "modal" }} />
      <Stack.Screen name="+not-found" />
    </Stack>
    </>
  );
}
