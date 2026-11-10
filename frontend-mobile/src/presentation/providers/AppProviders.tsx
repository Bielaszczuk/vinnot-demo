/**
 * AppProviders — composition root.
 *
 * Provider order (outer → inner):
 *   GestureHandlerRootView       ← must be outermost for react-native-gesture-handler
 *   SafeAreaProvider             ← safe area context
 *   Redux Provider               ← global state + RTK Query cache
 *   AuthProvider                 ← boot session restore + http DI
 *   LanguagePreferenceProvider   ← persisted locale -> i18next
 *   AccountLocaleSync            ← signed-in language/time zone -> backend
 *   ThemeProvider                ← design tokens
 *   I18nProvider                 ← (initialized synchronously before render)
 *   ToastProvider                ← polished imperative toast API
 *   BottomSheetModalProvider     ← global modal context for @gorhom/bottom-sheet
 */
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Provider as ReduxProvider } from "react-redux";
import { AuthProvider } from "./AuthProvider";
import { LanguagePreferenceProvider } from "./LanguagePreferenceProvider";
import { AccountLocaleSync } from "./AccountLocaleSync";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";
import { WineLabelCameraProvider } from "./WineLabelCameraProvider";
import { appStore } from "@/presentation/store";
import "@/shared/i18n"; // side-effect: initializes i18next

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ReduxProvider store={appStore}>
          <AuthProvider>
            <LanguagePreferenceProvider>
              <AccountLocaleSync />
              <ThemeProvider>
                <ToastProvider>
                  <WineLabelCameraProvider>
                    <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
                  </WineLabelCameraProvider>
                </ToastProvider>
              </ThemeProvider>
            </LanguagePreferenceProvider>
          </AuthProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
