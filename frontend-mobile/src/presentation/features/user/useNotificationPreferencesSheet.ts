import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useNotificationPreferences,
  useSetMarketingConsent,
  useSetNotificationChannel,
} from "@/presentation/hooks/queries/user";
import { useToast } from "@/presentation/providers/ToastProvider";
import { useDevicePush } from "@/presentation/features/notifications/useDevicePush";
import {
  canChange,
  isMarketingConsentChange,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPreference,
  type NotificationPreferences,
} from "@/domain/notification/notificationPreferences";

type PendingChange =
  | { type: "channel"; category: NotificationCategory; channel: NotificationChannel; enabled: boolean }
  | { type: "consent"; granted: boolean };

export interface NotificationPreferenceRow extends NotificationPreference {
  changeable: boolean;
}

function withPending(preferences: NotificationPreferences, pending: PendingChange | null): NotificationPreferences {
  if (!pending) return preferences;
  if (pending.type === "consent")
    return { ...preferences, marketingConsent: { ...preferences.marketingConsent, granted: pending.granted } };
  return {
    ...preferences,
    categories: preferences.categories.map((item) =>
      item.category === pending.category ? { ...item, [pending.channel]: pending.enabled } : item,
    ),
  };
}

/** The last saved result wins over the cached query until the sheet closes; a pending change shows right away. */
export function useNotificationPreferencesSheet(visible: boolean) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const query = useNotificationPreferences(visible);
  const setChannelMutation = useSetNotificationChannel();
  const setConsentMutation = useSetMarketingConsent();
  const [saved, setSaved] = useState<NotificationPreferences | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const devicePush = useDevicePush(visible);

  const source = saved ?? query.data;
  const preferences = source ? withPending(source, pending) : undefined;
  const consentGranted = preferences?.marketingConsent.granted ?? false;
  const busy = pending !== null;

  const callbacks = {
    onSuccess: (result: NotificationPreferences) => {
      setSaved(result);
      setPending(null);
    },
    onError: () => {
      setPending(null);
      showError(t("notificationPreferences.saveError"));
    },
  };

  const setChannel = (category: NotificationCategory, channel: NotificationChannel, enabled: boolean) => {
    const row = preferences?.categories.find((item) => item.category === category);
    if (busy || !row || !canChange(row, consentGranted)) return;
    setPending({ type: "channel", category, channel, enabled });
    setChannelMutation.mutate({ category, channel, enabled }, callbacks);
    // A push switch means nothing until the system lets this phone show pushes.
    if (channel === "push" && enabled && devicePush.status === "undetermined") devicePush.enable();
  };

  const setMarketingConsent = (granted: boolean) => {
    if (busy || !isMarketingConsentChange(consentGranted, granted)) return;
    setPending({ type: "consent", granted });
    setConsentMutation.mutate(granted, callbacks);
  };

  const reset = () => {
    setSaved(null);
    setPending(null);
  };

  const rows: NotificationPreferenceRow[] = (preferences?.categories ?? []).map((item) => ({
    ...item,
    changeable: canChange(item, consentGranted),
  }));

  return {
    t,
    isLoading: query.isLoading,
    error: query.error,
    retry: query.refetch,
    busy,
    consentGranted,
    rows,
    setChannel,
    setMarketingConsent,
    reset,
    devicePush,
  };
}
