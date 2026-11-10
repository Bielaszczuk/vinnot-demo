import { useCallback, useEffect, useRef, useState } from "react";
import { applicationLifecycleService } from "@/application/services/applicationLifecycle.service";
import {
  pushNotificationsService,
  type PushDeviceStatus,
} from "@/application/services/pushNotifications.service";
import { useUiStore } from "@/presentation/store/ui.store";
import { usePushChannels } from "./usePushChannels";

/**
 * Whether this phone can show pushes, for the notification preferences: read while they are open and again when
 * the app comes back (the member may have changed it in the system settings). `enable` shows the system prompt
 * only if it was never shown, then registers the device.
 */
export function useDevicePush(visible: boolean) {
  const channels = usePushChannels();
  const language = useUiStore((state) => state.language);
  const [status, setStatus] = useState<PushDeviceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const enabling = useRef(false);

  const read = useCallback(() => {
    pushNotificationsService
      .deviceStatus()
      .then(setStatus)
      .catch(() => setStatus("unsupported"));
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    read();
    return applicationLifecycleService.subscribe({ onFocus: read, onFocusLost: () => undefined });
  }, [visible, read]);

  const enable = useCallback(() => {
    if (enabling.current) return;
    enabling.current = true;
    setBusy(true);
    pushNotificationsService
      .enableOnThisDevice(language, channels)
      .then(setStatus)
      .catch(() => {
        // The switch stays saved; returning to the app or turning push on again retries the registration.
      })
      .finally(() => {
        enabling.current = false;
        setBusy(false);
      });
  }, [language, channels]);

  const openSettings = useCallback(() => {
    void pushNotificationsService.openNotificationSettings().catch(() => undefined);
  }, []);

  return { status, busy, enable, openSettings };
}
