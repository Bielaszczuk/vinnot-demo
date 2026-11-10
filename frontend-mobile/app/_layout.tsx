/**
 * Root Layout — app/_layout.tsx
 *
 * Responsibilities:
 *   1. Restore the session and load fonts concurrently
 *   2. Mount AppProviders (GestureHandler, SafeArea, Query, Auth, Theme, Toast)
 *   3. Load the fonts used by the current Vinnot product surfaces
 *   4. Hide splash screen once ready
 *   5. Gate the whole app behind the minimum supported version (AppUpdateGate)
 *   6. Render the Expo Router <Stack>
 */
import { useEffect } from "react";
import { RootNavigator } from "@/presentation/navigation/RootNavigator";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Poppins_400Regular } from "@expo-google-fonts/poppins/400Regular";
import { Poppins_500Medium } from "@expo-google-fonts/poppins/500Medium";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { Poppins_700Bold } from "@expo-google-fonts/poppins/700Bold";
import { AppProviders } from "@/presentation/providers/AppProviders";
import { AppUpdateGate } from "@/presentation/features/appUpdate/AppUpdateGate";
import "@/shared/styles/global.css";
export { RenderFailureScreen as ErrorBoundary } from "@/presentation/features/public/RenderFailureScreen";

// Keep splash visible until fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  return (
    <AppProviders>
      {fontsLoaded || fontError ? (
        <>
          <StatusBar style="dark" />
          <AppUpdateGate>
            <RootNavigator />
          </AppUpdateGate>
        </>
      ) : null}
    </AppProviders>
  );
}
