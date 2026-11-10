import { useEffect, useReducer, useRef } from "react";
import { router, useRootNavigationState, type Href } from "expo-router";
import { applicationLifecycleService } from "@/application/services/applicationLifecycle.service";
import { pushNotificationsService, type PushTap } from "@/application/services/pushNotifications.service";
import { usePushChannels } from "@/presentation/features/notifications/usePushChannels";
import { useAuthStore } from "@/presentation/store/auth.store";
import { useUiHydrating, useUiStore } from "@/presentation/store/ui.store";

const count = (value: number) => value + 1;

/**
 * Keeps this device registered for pushes while an account is signed in: it registers again on every cold start
 * (so the server sees the device is still in use), after a login, a language switch or a token rotation, and on
 * a return to the app while not registered yet (so turning notifications on in the system settings takes effect).
 * It creates the Android channels at startup, before any permission prompt. A tapped notification (also the one
 * that launched the app) is reported as opened and opens its screen once the navigation is ready; while signed
 * out it does not navigate: the screen is kept as the destination after the login.
 */
export function usePushNotificationsSync(): void {
  const channels = usePushChannels();
  const userId = useAuthStore((state) => (state.accessToken ? state.user?.id ?? null : null));
  const initializing = useAuthStore((state) => state.isInitializing);
  const rememberReturnPath = useAuthStore((state) => state.rememberReturnPath);
  const clearReturnPath = useAuthStore((state) => state.clearReturnPath);
  const language = useUiStore((state) => state.language);
  const isHydrating = useUiHydrating();
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const [tokenRotations, rotateToken] = useReducer(count, 0);
  const [foregrounds, returnToApp] = useReducer(count, 0);
  const [taps, receiveTap] = useReducer(count, 0);
  const lastRegistered = useRef<string | null>(null);
  const pendingTap = useRef<PushTap | null>(null);

  useEffect(() => pushNotificationsService.onTokenChange(rotateToken), []);

  useEffect(
    () => applicationLifecycleService.subscribe({ onFocus: returnToApp, onFocusLost: () => undefined }),
    [],
  );

  useEffect(
    () =>
      pushNotificationsService.onOpen((tap) => {
        pendingTap.current = tap;
        receiveTap();
      }),
    [],
  );

  useEffect(() => {
    pushNotificationsService
      .launchTap()
      .then((tap) => {
        if (!tap || pendingTap.current) return;
        pendingTap.current = tap;
        receiveTap();
      })
      .catch(() => {
        // A launch without a readable notification simply opens the app as usual.
      });
  }, []);

  useEffect(() => {
    if (isHydrating) return;
    pushNotificationsService.prepare(channels).catch(() => {
      // Without channels Android still shows pushes on the default one; the registration tries again.
    });
  }, [isHydrating, channels]);

  useEffect(() => {
    const tap = pendingTap.current;
    if (!tap || !navigationReady || initializing) return;
    if (!userId) {
      if (tap.route) {
        // The login opens this screen afterwards; a newer tap replaces an older destination.
        clearReturnPath();
        rememberReturnPath(tap.route);
      }
      pendingTap.current = tap.open ? { route: null, open: tap.open } : null;
      return;
    }
    pendingTap.current = null;
    if (tap.open) pushNotificationsService.reportOpen(tap.open);
    if (tap.route) router.push(tap.route as Href);
  }, [taps, navigationReady, initializing, userId, rememberReturnPath, clearReturnPath]);

  useEffect(() => {
    if (!userId) {
      lastRegistered.current = null;
      pushNotificationsService.forgetToken();
      return;
    }
    if (isHydrating) return;
    const key = `${userId}|${language}|${tokenRotations}`;
    if (lastRegistered.current === key) return;
    lastRegistered.current = key;
    pushNotificationsService
      .register(language, channels)
      .then((token) => {
        if (!token) lastRegistered.current = null;
      })
      .catch(() => {
        // Best effort: returning to the app, a language switch or a token rotation retries.
        lastRegistered.current = null;
      });
  }, [userId, language, isHydrating, tokenRotations, foregrounds, channels]);
}
