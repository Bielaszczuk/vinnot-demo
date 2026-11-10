import { useCallback, useRef, type RefObject } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";

type PresentableSheet = { present: () => void };

/**
 * Keeps a form sheet from losing work: it cannot be dismissed while saving, and with
 * unsaved changes a swipe, backdrop tap, Cancel or Android back asks before discarding.
 * Gorhom reports a swipe/backdrop/back only after the sheet closed, so "keep editing"
 * presents it again; the form state lives in the caller and is not lost.
 */
export function useSheetDismissGuard({
  sheetRef,
  visible,
  dirty,
  busy,
  onClose,
}: {
  sheetRef: RefObject<PresentableSheet | null>;
  visible: boolean;
  dirty: boolean;
  busy: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const asking = useRef(false);

  const confirmDiscard = useCallback(
    (keepEditing?: () => void) => {
      if (asking.current) return;
      asking.current = true;
      Alert.alert(
        t("common.unsavedChanges.title"),
        t("common.unsavedChanges.message"),
        [
          {
            text: t("common.unsavedChanges.keepEditing"),
            style: "cancel",
            onPress: () => {
              asking.current = false;
              keepEditing?.();
            },
          },
          {
            text: t("common.unsavedChanges.discard"),
            style: "destructive",
            onPress: () => {
              asking.current = false;
              onClose();
            },
          },
        ],
        { cancelable: false },
      );
    },
    [onClose, t],
  );

  /** The sheet's own Cancel button. */
  const requestClose = useCallback(() => {
    if (busy) return;
    if (dirty) confirmDiscard();
    else onClose();
  }, [busy, confirmDiscard, dirty, onClose]);

  // The sheet may report a dismissal through a callback from an earlier render (for example
  // one taken while saving), so the handler reads the latest state instead of its closure.
  const latest = useRef({ visible, busy, dirty });
  latest.current = { visible, busy, dirty };

  /** `onDismiss`: the sheet already closed by swipe, backdrop or Android back. */
  const handleDismiss = useCallback(() => {
    const current = latest.current;
    if (!current.visible) return;
    const reopen = () => sheetRef.current?.present();
    if (current.busy) reopen();
    else if (current.dirty) confirmDiscard(reopen);
    else onClose();
  }, [confirmDiscard, onClose, sheetRef]);

  return {
    requestClose,
    handleDismiss,
    enablePanDownToClose: !busy,
    backdropPressBehavior: busy ? ("none" as const) : ("close" as const),
  };
}
