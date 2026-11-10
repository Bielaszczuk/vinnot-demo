/**
 * AuthProvider — boot session restore + HTTP auth dependency injection.
 *
 * Responsibilities:
 *   1. Inject auth handlers into the http client (breaks the circular dep
 *      between http.ts and Redux slices).
 *   2. Restore the session at boot via `initSession()`.
 *
 * Must be a child of ReduxProvider.
 */
import { useEffect, useRef } from "react";
import { configureHttpAuth } from "@/infrastructure/api/http";
import { appStore } from "@/presentation/store";
import { initSession, refreshSession } from "@/presentation/store/authSlice";
import { hydrateUiState } from "@/presentation/store/uiSlice";
import i18n from "@/shared/i18n";
import { resolveSupportedLocale } from "@/shared/i18n/language";
import { reauthenticationService } from "@/application/services/reauthentication.service";
import { ReauthenticationProvider } from "@/presentation/features/auth/ReauthenticationDialog";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = useRef(false);

  useEffect(() => {
    if (configured.current) return;
    configured.current = true;

    // Inject auth handlers into the HTTP adapter without coupling it to Redux.
    configureHttpAuth({
      getAccessToken: () => appStore.getState().auth.accessToken,
      getSessionGeneration: () => appStore.getState().auth.sessionGeneration ?? 0,
      reauthenticate: async () => {
        const refreshed = await appStore.dispatch(refreshSession()).unwrap();
        if (!refreshed) throw new Error("Session expired");
        return reauthenticationService.request();
      },
      refreshToken: async () => {
        const result = await appStore.dispatch(refreshSession()).unwrap();
        if (!result) {
          throw new Error("Session expired");
        }
        return result.accessToken;
      },
    });

    // Restore persisted UI/auth state (fire-and-forget bootstrapping).
    const deviceLanguage = resolveSupportedLocale(i18n.resolvedLanguage ?? i18n.language);
    void appStore.dispatch(hydrateUiState(deviceLanguage));
    if (appStore.getState().auth.isInitializing && !appStore.getState().auth.pendingSessionRequest) {
      void appStore.dispatch(initSession());
    }
  }, []);

  return <ReauthenticationProvider>{children}</ReauthenticationProvider>;
}
