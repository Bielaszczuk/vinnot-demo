import { useCallback, useEffect, useState } from "react";
import { pushNotificationsService } from "@/application/services/pushNotifications.service";
import type { LaunchPushPrompt } from "@/domain/notification/pushPermissionPrompt";
import { useAuthStore } from "@/presentation/store/auth.store";
import { useUiHydrating, useUiStore } from "@/presentation/store/ui.store";
import { usePushChannels } from "./usePushChannels";

export interface LaunchPushPromptState {
  visible: boolean;
  /** The last sheet shown, kept while it closes so its copy does not change mid-animation. */
  prompt: LaunchPushPrompt | null;
  busy: boolean;
  allow: () => void;
  dismiss: () => void;
}

/**
 * The permission sheet of a cold start: on the first launch it explains notifications before the system prompt;
 * afterwards, while they are off, it reminds a signed-in member once per launch (never on a return from the
 * background). "Activar" closes the sheet and shows the system prompt, or opens Vinnot's notification settings
 * once the system stopped asking.
 */
export function useLaunchPushPrompt(): LaunchPushPromptState {
  const signedIn = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const initializing = useAuthStore((state) => state.isInitializing);
  const language = useUiStore((state) => state.language);
  const isHydrating = useUiHydrating();
  const channels = usePushChannels();
  const [prompt, setPrompt] = useState<LaunchPushPrompt | null>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const show = useCallback((next: LaunchPushPrompt | null) => {
    if (!next) return;
    setPrompt(next);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (isHydrating || initializing) return;
    pushNotificationsService
      .launchPrompt(signedIn)
      .then(show)
      .catch(() => {
        // An unreadable permission simply shows nothing; the preferences can still turn notifications on.
      });
  }, [isHydrating, initializing, signedIn, show]);

  const dismiss = useCallback(() => setVisible(false), []);

  const allow = useCallback(() => {
    // Close first, so the system prompt or the settings never open on top of the sheet.
    setVisible(false);
    if (prompt === "settings") {
      void pushNotificationsService.openNotificationSettings().catch(() => undefined);
      return;
    }
    setBusy(true);
    pushNotificationsService
      .allowFromPrompt(language, channels, signedIn)
      .catch(() => false)
      .finally(() => setBusy(false));
  }, [prompt, language, channels, signedIn]);

  return { visible, prompt, busy, allow, dismiss };
}
