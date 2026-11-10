import { useCallback, useState } from "react";
import { pushNotificationsService } from "@/application/services/pushNotifications.service";
import { useUiStore } from "@/presentation/store/ui.store";
import { usePushChannels } from "./usePushChannels";

export interface PushPermissionPrompt {
  visible: boolean;
  busy: boolean;
  /** Shows the explanation when the system can still ask and no sheet showed in this launch. */
  offer: () => void;
  allow: () => void;
  dismiss: () => void;
}

/**
 * A second chance to ask for push permission, after something the member cares about (a confirmed ticket), for
 * a device that skipped the launch sheet. The app explains the value first; only "allow" shows the system
 * prompt, and the answer registers the device or removes it from the account.
 */
export function usePushPermissionPrompt(): PushPermissionPrompt {
  const language = useUiStore((state) => state.language);
  const channels = usePushChannels();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const offer = useCallback(() => {
    pushNotificationsService
      .offerAfterEvent()
      .then((should) => {
        if (should) setVisible(true);
      })
      .catch(() => {
        // Never block the flow that offered it.
      });
  }, []);

  const allow = useCallback(() => {
    setBusy(true);
    pushNotificationsService
      .allowFromPrompt(language, channels, true)
      .catch(() => false)
      .finally(() => {
        setBusy(false);
        setVisible(false);
      });
  }, [language, channels]);

  const dismiss = useCallback(() => setVisible(false), []);

  return { visible, busy, offer, allow, dismiss };
}
