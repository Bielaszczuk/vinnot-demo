import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { paymentAccountSetupService } from "@/application/services/paymentAccountSetup.service";
import { paymentReturnNavigation } from "@/application/services/paymentReturnNavigation";
import { useAuth } from "./useAuth";
import { useToast } from "@/presentation/providers/ToastProvider";
import { hasAnyRole, ROLES } from "@/shared/config/roles";
import { formatNumber } from "@/shared/i18n/format";

const PAYMENT_ACCOUNT_ROLES = [ROLES.ADMIN, ROLES.PARTNER];

export function usePaymentAccountSetup(active = true) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const path = usePathname();
  const { showError } = useToast();
  const [pending, setPending] = useState(false);
  const [account, setAccount] = useState<{ owner: string; connected: boolean; commissionPercent: number | null } | null>(null);
  const [statusError, setStatusError] = useState(false);
  const inFlight = useRef(false);
  const owner = user?.id;
  const allowed = !!owner && !!user && hasAnyRole(user.roles, PAYMENT_ACCOUNT_ROLES);
  const refreshStatus = useCallback(async (accountOwner: string, isCurrent: () => boolean) => {
    try {
      const result = await paymentAccountSetupService.status();
      if (isCurrent()) {
        setAccount({ owner: accountOwner, connected: result.connected, commissionPercent: result.commissionPercent });
        setStatusError(false);
      }
    } catch {
      if (isCurrent()) setStatusError(true);
    }
  }, []);
  useEffect(() => {
    if (!active || !allowed || !owner) return;
    let mounted = true;
    let revision = 0;
    const refresh = () => {
      const current = ++revision;
      return refreshStatus(owner, () => mounted && current === revision);
    };
    void refresh();
    const unsubscribe = paymentAccountSetupService.onReturn(() => {
      void refresh();
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [active, allowed, owner, refreshStatus]);
  const open = async () => {
    if (!allowed || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    paymentReturnNavigation.remember(path);
    try {
      await paymentAccountSetupService.open();
    } catch {
      showError(t("eventEditor.paymentsConnectError"));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  const percent = account && account.owner === owner ? account.commissionPercent : null;
  return {
    open,
    pending,
    checking: active && allowed && account?.owner !== owner && !statusError,
    connected: account?.owner === owner && !!account?.connected,
    statusError,
    commissionRate: percent === null ? null : formatNumber(percent, i18n?.resolvedLanguage ?? i18n?.language),
  };
}
