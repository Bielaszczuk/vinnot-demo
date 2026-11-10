import { useRouter } from "expo-router";
import { ClipboardList } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { WineSubmission, WineSubmissionStatus } from "@/domain/wine/wine.types";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { EmptyState, Spinner } from "@/presentation/components/ui/Feedback";
import { useMyWineSubmissions } from "@/presentation/hooks/queries/wine/useWines";
import { createWineDetailRoute, WINE_BROWSE_ROUTE } from "@/presentation/navigation/wineNavigation";
import { lightTokens, layout, radii, spacing, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { BackButton } from "@/presentation/components/ui/BackButton";
import { submissionReasonText } from "../submissionReason";

const TERMINAL_STATUSES: WineSubmissionStatus[] = ["APPROVED", "DUPLICATE"];

export function WineSubmissionsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = useMyWineSubmissions();
  const submissions = query.data?.items ?? [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing[3], paddingBottom: spacing[8] },
      ]}
    >
      <BackButton fallback={WINE_BROWSE_ROUTE} />

      <View style={styles.heading}>
        <Text style={styles.title}>{t("scan.mySubmissions")}</Text>
        <Text style={styles.description}>{t("scan.submissionsHistoryDescription")}</Text>
      </View>

      {query.isLoading ? <Spinner size="lg" /> : null}
      {query.isError ? (
        <EmptyState
          title={t("scan.submissionsError")}
          description={t("scan.submissionsErrorDescription")}
          icon={<ClipboardList size={38} color={wine[700]} />}
          action={{ label: t("common.retry"), onPress: query.refetch }}
        />
      ) : null}
      {!query.isLoading && !query.isError && submissions.length === 0 ? (
        <EmptyState
          illustration="noWines"
          title={t("scan.noSubmissions")}
          description={t("scan.noSubmissionsDescription")}
        />
      ) : null}

      {submissions.map((submission) => {
        const wineId = submission.createdWineId ?? submission.matchedWineId;
        return (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            formattedDate={new Intl.DateTimeFormat(i18n.language, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(submission.createdAt)}
            onOpenWine={
              wineId && TERMINAL_STATUSES.includes(submission.status)
                ? () => router.push(createWineDetailRoute(wineId))
                : undefined
            }
          />
        );
      })}
    </ScrollView>
  );
}

function SubmissionCard({
  submission,
  formattedDate,
  onOpenWine,
}: {
  submission: WineSubmission;
  formattedDate: string;
  onOpenWine?: () => void;
}) {
  const { t } = useTranslation();
  const reason = submissionReasonText(t, submission);
  return (
    <Card style={styles.card} radius={radii["2xl"]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardCopy}>
          <Text style={styles.wineName}>{submission.wineName}</Text>
          <Text style={styles.wineryName}>{submission.wineryName}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {t(`scan.submissionStatuses.${submission.status}`)}
          </Text>
        </View>
      </View>
      <Text style={styles.date}>{formattedDate}</Text>
      {reason ? (
        <View style={styles.reason}>
          <Text style={styles.reasonLabel}>{t("scan.reviewReason")}</Text>
          <Text style={styles.reasonText}>{reason}</Text>
        </View>
      ) : null}
      {onOpenWine ? (
        <Button fullWidth variant="outline" onPress={onOpenWine}>
          {t("scan.viewPublishedWine")}
        </Button>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: { paddingHorizontal: layout.screenHorizontalPadding, gap: spacing[4] },
  heading: { gap: spacing[1], marginBottom: spacing[2] },
  title: { ...textStyles.headingLarge, color: lightTokens.textPrimary },
  description: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  card: { gap: spacing[3] },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  cardCopy: { flex: 1, gap: spacing[1] },
  wineName: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  wineryName: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  statusBadge: {
    maxWidth: "45%",
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: wine[50],
  },
  statusText: { ...textStyles.labelSmall, color: wine[800], textAlign: "center" },
  date: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  reason: { gap: spacing[1], padding: spacing[3], borderRadius: radii.lg, backgroundColor: wine[50] },
  reasonLabel: { ...textStyles.labelMedium, color: wine[800] },
  reasonText: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
});
