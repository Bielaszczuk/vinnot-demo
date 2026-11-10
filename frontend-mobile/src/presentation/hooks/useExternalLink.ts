import { useCallback } from "react";
import { Linking } from "react-native";
import { useTranslation } from "react-i18next";
import { isSafeExternalUrl } from "@/domain/navigation/externalUrl";
import { useToast } from "@/presentation/providers/ToastProvider";

/**
 * Opens a server-provided link only when its scheme is allowed (https, http,
 * mailto, tel). Unsafe links and system failures show an error toast instead.
 */
export function useExternalLink() {
  const { t } = useTranslation();
  const { showError } = useToast();
  return useCallback(
    async (url: unknown): Promise<boolean> => {
      if (!isSafeExternalUrl(url)) {
        showError(t("common.linkOpenError"));
        return false;
      }
      try {
        await Linking.openURL(url);
        return true;
      } catch {
        showError(t("common.linkOpenError"));
        return false;
      }
    },
    [showError, t],
  );
}
