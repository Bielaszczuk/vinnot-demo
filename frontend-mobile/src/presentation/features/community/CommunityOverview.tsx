import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import {
  useCommunityOverview,
  useReviewPublications,
} from "@/presentation/hooks/queries/community/useCommunity";
import { ChevronRight, FileCheck2, Flag } from "lucide-react-native";
import { lightTokens, wine, systemColors, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import type { ReportStatus } from "@/domain/community/community.types";

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const { t } = useTranslation();
  const pending = status === "OPEN" || status === "IN_REVIEW";
  return (
    <View style={[styles.badge, pending ? styles.waiting : styles.closed]}>
      <Text
        style={[
          styles.badgeText,
          { color: pending ? systemColors.warningText : lightTokens.textSecondary },
        ]}
      >
        {t(`community.statuses.${status}`)}
      </Text>
    </View>
  );
}

function Metric({ label, value, pending }: { label: string; value?: number; pending?: boolean }) {
  return (
    <View style={[styles.metric, pending && styles.pendingMetric]}>
      <Text style={styles.value}>{value ?? "—"}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function CommunityOverviewPanel({ moderation = false }: { moderation?: boolean }) {
  const { t } = useTranslation();
  const query = useCommunityOverview(moderation);
  const counts = query.data && ("reports" in query.data ? query.data.reports : query.data);
  const blocks = query.data && "blockedUsers" in query.data ? query.data.blockedUsers : undefined;
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>
        {t(moderation ? "community.moderationOverview" : "community.overviewTitle")}
      </Text>
      <Text style={styles.help}>
        {t(moderation ? "community.moderationOverviewHelp" : "community.overviewHelp")}
      </Text>
      {query.isPending ? (
        <Text accessibilityRole="text">{t("common.loading")}</Text>
      ) : query.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void query.refetch();
          }}
          style={styles.retry}
        >
          <Text style={styles.link}>
            {t("community.statusUnavailable")} · {t("common.retry")}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.metrics}>
          <Metric
            label={t("community.waitingReports")}
            value={counts ? counts.open + counts.inReview : undefined}
            pending
          />
          <Metric
            label={t("community.closedReports")}
            value={counts ? counts.resolved + counts.dismissed : undefined}
          />
          {!moderation && <Metric label={t("community.blockedUsers")} value={blocks} />}
        </View>
      )}
    </View>
  );
}

export function ModerationShortcuts() {
  const { t } = useTranslation();
  const router = useRouter();
  const { publications } = useReviewPublications(0);
  return (
    <View style={{ gap: 12 }}>
      <CommunityOverviewPanel moderation />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/(app)/admin/community")}
        style={styles.shortcut}
      >
        <Flag size={20} color={wine[700]} />
        <Text style={[styles.link, { flex: 1 }]}>{t("community.viewReports")}</Text>
        <ChevronRight size={18} color={wine[700]} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/(app)/admin/publications")}
        style={styles.shortcut}
      >
        <FileCheck2 size={20} color={wine[700]} />
        <Text style={[styles.link, { flex: 1 }]}>
          {publications.data && !publications.isError
            ? t("community.reviewQueueCount", { count: publications.data.totalItems })
            : t("community.publications")}
        </Text>
        <ChevronRight size={18} color={wine[700]} />
      </Pressable>
    </View>
  );
}

export function useCommunityActivityLabel() {
  const { t } = useTranslation();
  const query = useCommunityOverview();
  const data = query.data && "reports" in query.data ? query.data : undefined;
  if (query.isPending) return t("common.loading");
  if (query.isError || !data) return t("community.statusUnavailable");
  const pending = data.reports.open + data.reports.inReview;
  return `${pending ? t("community.waitingCount", { count: pending }) : t("community.clearActivity")} · ${t("community.blockedCount", { count: data.blockedUsers })}`;
}

const styles = StyleSheet.create({
  panel: { padding: 16, borderRadius: radii.xl, backgroundColor: lightTokens.bgSubtle, gap: 12 },
  heading: { ...textStyles.titleMedium, color: lightTokens.textPrimary },
  help: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    flex: 1,
    minWidth: 84,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: lightTokens.surfaceDefault,
    gap: 4,
  },
  pendingMetric: { backgroundColor: wine[50], borderWidth: 1, borderColor: wine[200] },
  value: { ...textStyles.titleLarge, color: wine[800] },
  label: { ...textStyles.caption, color: lightTokens.textSecondary },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii["2xl"] },
  badgeText: { ...textStyles.labelSmall },
  waiting: { backgroundColor: systemColors.warningLight },
  closed: { backgroundColor: lightTokens.bgSubtle },
  retry: { minHeight: 44, justifyContent: "center" },
  shortcut: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: lightTokens.surfaceDefault,
  },
  link: { ...textStyles.labelMedium, color: wine[700] },
});
