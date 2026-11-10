import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PUSH_CHANNELS, type PushChannel } from "@/domain/notification/pushChannels";

/** The Android notification channels, named in the app language (members see them in the system settings). */
export function usePushChannels(): readonly PushChannel[] {
  const { t } = useTranslation();
  return useMemo(
    () =>
      PUSH_CHANNELS.map((channel) => ({
        id: channel.id,
        importance: channel.importance,
        name: t(`pushNotifications.channels.${channel.copyKey}.name`),
        description: t(`pushNotifications.channels.${channel.copyKey}.description`),
      })),
    [t],
  );
}
