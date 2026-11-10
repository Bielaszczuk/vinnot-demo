/**
 * The content pillars (#510): localized name, weight, performance over the weighting window (measured posts,
 * views, interactions and the planner's factor) and two switches, Active (planned) and Approve automatically. The
 * auto-approval switch stays disabled while the pillar is inactive.
 */
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Badge } from "@/presentation/components/ui/Badge";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { ToggleRow } from "@/presentation/components/ui/Switch";
import {
  canSwitchAutoApprove,
  formatPillarFactor,
  localizedName,
  type AdminContentPillar,
  type PillarSwitch,
  type SocialPostLanguage,
} from "@/domain/admin/socialPost";
import { AdminQueryError } from "../AdminQueryError";
import { socialPostStyles as styles } from "./socialPostStyles";

/** The planner keeps a pillar neutral until it has this many measured posts. */
const MEASURED_POSTS_FOR_FACTOR = 3;

export interface SocialPillarListProps {
  pillars: AdminContentPillar[];
  language: SocialPostLanguage;
  loading: boolean;
  failed: boolean;
  retry: () => unknown;
  switching: string | null;
  onToggle: (pillar: AdminContentPillar, which: PillarSwitch) => unknown;
  formatNumber: (value: number) => string;
}

export function SocialPillarList({
  pillars,
  language,
  loading,
  failed,
  retry,
  switching,
  onToggle,
  formatNumber,
}: SocialPillarListProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.heading} accessibilityRole="header">
        {t("admin.socialPosts.pillars.heading")}
      </Text>
      <Text style={styles.help}>{t("admin.socialPosts.pillars.help")}</Text>
      {failed ? (
        <AdminQueryError retry={retry} />
      ) : loading ? (
        <Skeleton height={96} />
      ) : pillars.length === 0 ? (
        <Text style={styles.help}>{t("admin.socialPosts.pillars.empty")}</Text>
      ) : (
        pillars.map((pillar) => {
          const name = localizedName(pillar, language);
          const busy = switching !== null;
          const { performance } = pillar;
          return (
            <View key={pillar.code} testID={`social-pillar-${pillar.code}`} style={styles.postRow}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{name}</Text>
                <Badge label={t("admin.socialPosts.pillars.weight", { weight: pillar.weight })} />
              </View>
              <Text style={styles.help}>
                {t("admin.socialPosts.pillars.performance", {
                  posts: formatNumber(performance.measuredPosts),
                  views: formatNumber(performance.views),
                  interactions: formatNumber(performance.interactions),
                })}
              </Text>
              <Text style={styles.label}>
                {t("admin.socialPosts.pillars.factor", { factor: formatPillarFactor(performance.factor) })}
              </Text>
              {performance.measuredPosts < MEASURED_POSTS_FOR_FACTOR && (
                <Text style={styles.help}>{t("admin.socialPosts.pillars.neutral")}</Text>
              )}
              <ToggleRow
                testID={`social-pillar-${pillar.code}-active`}
                label={t("admin.socialPosts.pillars.active")}
                value={pillar.active}
                disabled={busy}
                onValueChange={() => void onToggle(pillar, "active")}
              />
              <ToggleRow
                testID={`social-pillar-${pillar.code}-autoApprove`}
                label={t("admin.socialPosts.pillars.autoApprove")}
                description={
                  canSwitchAutoApprove(pillar) ? undefined : t("admin.socialPosts.pillars.autoApproveInactive")
                }
                value={pillar.autoApprove}
                disabled={busy || !canSwitchAutoApprove(pillar)}
                onValueChange={() => void onToggle(pillar, "autoApprove")}
              />
            </View>
          );
        })
      )}
    </View>
  );
}
