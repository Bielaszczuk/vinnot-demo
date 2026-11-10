import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/presentation/providers/ToastProvider";
import { usePushSettings, useSetPushTypeEnabled } from "@/presentation/hooks/queries/admin";
import { sendsPushes, type PushTypeSetting } from "@/domain/admin/pushAdministration";
import { notificationErrorKey } from "./notificationErrorKey";

/**
 * "Ajustes de push" of the mobile admin notifications section (#327, #490): the switch of each push type and the
 * server provider. The metrics live in "Historial y métricas".
 */
export function usePushControlsViewModel() {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [pendingOff, setPendingOff] = useState<PushTypeSetting | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  // One switch at a time, also through the reauthentication prompt and its automatic retry.
  const busy = useRef(false);
  const settings = usePushSettings();
  const switchMutation = useSetPushTypeEnabled();
  const { mutateAsync } = switchMutation;

  const typeLabel = useCallback(
    (type: string) => t(`admin.notifications.pushTypes.${type}`, { defaultValue: type }),
    [t],
  );

  const change = useCallback(
    async (setting: PushTypeSetting, enabled: boolean) => {
      if (busy.current) return;
      busy.current = true;
      setSwitching(setting.type);
      try {
        await mutateAsync({ type: setting.type, enabled });
        showSuccess(
          t(enabled ? "admin.notifications.push.turnedOn" : "admin.notifications.push.turnedOff", {
            type: typeLabel(setting.type),
          }),
        );
        setPendingOff(null);
      } catch (error) {
        showError(t(notificationErrorKey(error)));
      } finally {
        busy.current = false;
        setSwitching(null);
      }
    },
    [mutateAsync, showError, showSuccess, t, typeLabel],
  );

  /** Turning a transactional type off asks first: those pushes carry tickets, payments and changes to events. */
  const toggle = useCallback(
    async (setting: PushTypeSetting) => {
      if (setting.enabled && setting.transactional) {
        setPendingOff(setting);
        return;
      }
      await change(setting, !setting.enabled);
    },
    [change],
  );

  return {
    t,
    settings,
    typeLabel,
    sending: settings.data ? sendsPushes(settings.data.provider) : true,
    switching,
    toggle,
    pendingOff,
    cancelOff: () => setPendingOff(null),
    confirmOff: () => (pendingOff ? change(pendingOff, false) : Promise.resolve()),
  };
}
