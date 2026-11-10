/**
 * View model of the social posts settings (#510): the content pillars with their performance and their Active and
 * Auto-approve switches, and the connection state of each network (read-only on mobile: connecting happens in the
 * web admin, where the OAuth callback returns).
 */
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  canSwitchAutoApprove,
  localizedName,
  toSocialPostLanguage,
  type AdminContentPillar,
  type PillarSwitch,
} from "@/domain/admin/socialPost";
import { isLastRotatingPillarError } from "@/application/services/adminSocialPosts.service";
import { useAdminSocialPillars, useSwitchSocialPillar } from "@/presentation/hooks/queries/admin";
import { useAdminSocialAccounts } from "@/presentation/hooks/queries/admin/useAdminSocialAccounts";
import { useToast } from "@/presentation/providers/ToastProvider";

export function useSocialPostSettingsViewModel() {
  const { t, i18n } = useTranslation();
  const { showError, showSuccess } = useToast();
  const locale = i18n.language;
  const language = toSocialPostLanguage(locale);
  const pillars = useAdminSocialPillars();
  const accounts = useAdminSocialAccounts();
  const switchMutation = useSwitchSocialPillar();
  const { mutateAsync: switchPillar } = switchMutation;
  const [switchingPillar, setSwitchingPillar] = useState<string | null>(null);

  /** Flips one switch of a pillar; auto-approval only moves while the pillar is active. */
  const togglePillar = useCallback(
    async (pillar: AdminContentPillar, which: PillarSwitch) => {
      if (which === "autoApprove" && !canSwitchAutoApprove(pillar)) return;
      const enabled = !pillar[which];
      setSwitchingPillar(pillar.code);
      try {
        await switchPillar({ code: pillar.code, which, enabled });
        showSuccess(
          t(`admin.socialPosts.pillars.switched.${which}.${enabled ? "on" : "off"}`, {
            name: localizedName(pillar, language),
          }),
        );
      } catch (error) {
        showError(
          t(isLastRotatingPillarError(error) ? "admin.socialPosts.pillars.lastRotating" : "admin.socialPosts.pillars.switchError"),
        );
      } finally {
        setSwitchingPillar(null);
      }
    },
    [language, showError, showSuccess, switchPillar, t],
  );

  const formatNumber = useCallback((value: number) => value.toLocaleString(locale), [locale]);
  const formatDate = useCallback(
    (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  return {
    t,
    language,
    pillars: pillars.data ?? [],
    pillarsLoading: pillars.isLoading,
    pillarsError: pillars.isError,
    refetchPillars: () => void pillars.refetch(),
    switchingPillar,
    togglePillar,
    accounts: accounts.data ?? [],
    accountsLoading: accounts.isLoading,
    accountsError: accounts.isError,
    refetchAccounts: () => void accounts.refetch(),
    formatNumber,
    formatDate,
  };
}
