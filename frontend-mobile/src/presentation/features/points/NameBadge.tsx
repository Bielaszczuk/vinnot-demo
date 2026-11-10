/** The small seal after a person's name in reviews, comments and admin lists; a tap names the tier. */
import { useTranslation } from "react-i18next";
import type { BadgeTier } from "@/domain/points/badgeTiers";
import { useToast } from "@/presentation/providers/ToastProvider";
import { UserBadge, type BadgeSize } from "./UserBadge";

export function NameBadge({ tier, size = "list" }: { tier: BadgeTier | null | undefined; size?: BadgeSize }) {
  const { t } = useTranslation();
  const toast = useToast();
  if (!tier) return null;
  const label = t("points.badgeLabel", { tier: t(`points.tiers.${tier}`) });
  return <UserBadge tier={tier} size={size} mode="list" accessibilityLabel={label} onPress={() => toast.showInfo?.(label)} />;
}
