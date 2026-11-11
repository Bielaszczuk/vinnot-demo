import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessageKey } from "@/shared/i18n/localizeMessage";
import { useRouter } from "expo-router";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useAccountActions } from "@/presentation/hooks/useAccountActions";
import { useDeleteAccount } from "@/presentation/hooks/queries/user";
import { useToast } from "@/presentation/providers/ToastProvider";

/** Keeps confirmation, Apple reauthorization and deletion out of the route shell. */
export function usePermanentAccountDeletion(onDeleted: () => void) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, clearSession } = useAuth();
  const { acquireAppleAccountDeletionCredential } = useAccountActions();
  const deletion = useDeleteAccount();
  const { showError } = useToast();
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const phrase = t("profile.deleteAccountPhrase");
  const matches = text.trim() === phrase;

  const open = () => {
    if (inFlight.current || !user) return;
    setText("");
    setVisible(true);
  };
  const close = () => {
    if (inFlight.current) return;
    setVisible(false);
    setText("");
  };
  const submit = async () => {
    if (!visible || !matches || inFlight.current || !user) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const credential = user.socialProviders.includes("APPLE")
        ? await acquireAppleAccountDeletionCredential()
        : {};
      await deletion.mutateAsync(credential);
      setVisible(false);
      setText("");
      onDeleted();
      await clearSession();
      router.replace("/(auth)/login");
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      showError(code === "ORGANIZER_HAS_UPCOMING_PAID_EVENTS"
        ? t("profile.toastDeleteBlockedByPaidEvents")
        : t(errorMessageKey(error, "profile.toastAccountDeletionError")));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return { visible, text, setText, busy, phrase, matches, open, close, submit };
}
