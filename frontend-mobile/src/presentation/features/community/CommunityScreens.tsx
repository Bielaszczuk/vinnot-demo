import { ADMIN_ROUTE, PROFILE_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import {
  CommunityOverviewPanel,
  ModerationShortcuts,
  ReportStatusBadge,
} from "./CommunityOverview";
import { useAuth } from "@/presentation/hooks/useAuth";
import { textStyles } from "@/shared/theme/typography";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Check, Copy } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  useCommunityActions,
  useMyCommunity,
} from "@/presentation/hooks/queries/community/useCommunity";
import { AppHeader } from "@/presentation/components/layout";
import { RoleGuard } from "@/presentation/navigation/guards";
import { ROLES } from "@/shared/config/roles";
import { iconStrokes, layout, lightTokens, radii } from "@/shared/theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminDetailSheet } from "../admin/AdminDetailSheet";
import { AdminPaginationBar } from "../admin/AdminPaginationBar";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { Chip } from "@/presentation/components/ui/Chip";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import type { ReportReceipt, ReportStatus } from "@/domain/community/community.types";
import {
  MAX_REPORT_DECISION_LENGTH,
  REPORT_OUTCOME_REASONS,
  type ReportOutcome,
  type ReportReasonCode,
} from "@/domain/admin/moderationReasons";
import { ChoiceChips, ReasonPicker } from "@/presentation/components/forms";

const REPORT_OUTCOMES: readonly ReportOutcome[] = ["RESOLVED", "DISMISSED", "REMOVE"];
const OUTCOME_BUTTON: Record<ReportOutcome, string> = {
  RESOLVED: "community.resolve",
  DISMISSED: "community.dismiss",
  REMOVE: "community.removeContent",
};
import { useCaseIdCopy } from "./useCaseIdCopy";
import {
  DetailField,
  ModerationEmpty,
  ModerationRow,
  ModerationTabs,
  adminCommunityStyles as adminStyles,
} from "./AdminCommunityParts";
import { useModerationViewModel } from "./useAdminCommunityViewModels";

function SectionError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.errorBox}>
      <Text accessibilityRole="alert" style={styles.errorText}>
        {t("community.error")}
      </Text>
      <Button variant="outline" size="sm" onPress={onRetry}>
        {t("common.retry")}
      </Button>
    </View>
  );
}

function SectionLoading({ testID }: { testID: string }) {
  return (
    <View testID={testID} style={styles.loading}>
      <Skeleton height={88} radius={radii.lg} />
      <Skeleton height={88} radius={radii.lg} />
    </View>
  );
}

function Pagination({ page, total, change }: { page: number; total: number; change: (page: number) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.pagination}>
      <Button variant="ghost" size="sm" disabled={page === 0} onPress={() => change(page - 1)}>
        {t("community.previous")}
      </Button>
      <Text style={styles.pageNumber}>{page + 1}</Text>
      <Button variant="ghost" size="sm" disabled={page + 1 >= total} onPress={() => change(page + 1)}>
        {t("community.next")}
      </Button>
    </View>
  );
}

function SectionHeading({ title, count, help }: { title: string; count?: number; help: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.sectionHeading}>
      <Text accessibilityRole="header" style={styles.heading}>
        {count === undefined ? title : t("community.sectionCount", { title, count })}
      </Text>
      <Text style={styles.help}>{help}</Text>
    </View>
  );
}

function ReportReceiptCard({ item }: { item: ReportReceipt }) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const { copy, shortId, statusFor } = useCaseIdCopy();
  const status = statusFor(item.id);
  const waiting = item.status === "OPEN" || item.status === "IN_REVIEW";
  return (
    <Card radius={radii.lg} elevation="none" style={styles.card}>
      <View style={styles.reportHeader}>
        <Text style={styles.cardTitle}>{t(`community.targets.${item.target.type}`)}</Text>
        <ReportStatusBadge status={item.status} />
      </View>
      <Text style={styles.meta}>{t("community.reportDate", { date: formatDate(item.createdAt) })}</Text>
      <Text style={styles.help}>{t(waiting ? "community.waitingHelp" : "community.closedHelp")}</Text>
      <View style={styles.caseRow}>
        <Text style={styles.caseId}>{`${t("community.caseId")} · ${shortId(item.id)}`}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("community.copyCaseId")}
          hitSlop={8}
          onPress={() => void copy(item.id)}
          style={styles.copyButton}
        >
          {status === "copied" ? (
            <Check size={16} color={lightTokens.brandPrimary} strokeWidth={iconStrokes.strong} />
          ) : (
            <Copy size={16} color={lightTokens.brandPrimary} strokeWidth={iconStrokes.regular} />
          )}
        </Pressable>
      </View>
      {!!status && (
        <Text accessibilityLiveRegion="polite" style={status === "copied" ? styles.copied : styles.errorText}>
          {t(status === "copied" ? "community.caseCopied" : "community.copyFailed")}
        </Text>
      )}
    </Card>
  );
}

export function MyCommunityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasAnyRole } = useAuth();
  const [reportsPage, setReportsPage] = useState(0);
  const [blocksPage, setBlocksPage] = useState(0);
  const { reports, blocks } = useMyCommunity(reportsPage, blocksPage);
  const { unblock } = useCommunityActions();
  return (
    <View style={styles.screen}>
      <AppHeader title={t("community.title")} showBack backFallback={PROFILE_ROUTE} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <CommunityOverviewPanel />
        {hasAnyRole([ROLES.ADMIN, ROLES.MODERATOR]) && <ModerationShortcuts />}
        <View style={styles.section}>
          <SectionHeading
            title={t("community.myReports")}
            count={reports.data?.totalItems}
            help={t("community.receiptHelp")}
          />
          {reports.isPending ? (
            <SectionLoading testID="community-reports-loading" />
          ) : reports.isError ? (
            <SectionError onRetry={() => void reports.refetch()} />
          ) : (
            <>
              {!reports.data?.items.length && (
                <EmptyState illustration="community" title={t("community.noReports")} style={styles.empty} />
              )}
              {reports.data?.items.map((item) => <ReportReceiptCard key={item.id} item={item} />)}
              {(reports.data?.totalPages ?? 0) > 1 && (
                <Pagination page={reportsPage} total={reports.data?.totalPages ?? 0} change={setReportsPage} />
              )}
            </>
          )}
        </View>
        <View style={styles.section}>
          <SectionHeading
            title={t("community.blockedUsers")}
            count={blocks.data?.totalItems}
            help={t("community.blockHelp")}
          />
          {blocks.isPending ? (
            <SectionLoading testID="community-blocks-loading" />
          ) : blocks.isError ? (
            <SectionError onRetry={() => void blocks.refetch()} />
          ) : (
            <>
              {!blocks.data?.items.length && <Text style={styles.help}>{t("community.noBlocks")}</Text>}
              {blocks.data?.items.map((item) => (
                <View key={item.userId} style={styles.blockRow}>
                  <Text style={styles.cardTitle}>{item.username}</Text>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unblock.isPending}
                    onPress={() => unblock.mutate(item.userId)}
                  >
                    {t("community.unblock")}
                  </Button>
                </View>
              ))}
              {(blocks.data?.totalPages ?? 0) > 1 && (
                <Pagination page={blocksPage} total={blocks.data?.totalPages ?? 0} change={setBlocksPage} />
              )}
            </>
          )}
          {unblock.isError && (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {t("community.error")}
            </Text>
          )}
        </View>
        <Button variant="secondary" fullWidth onPress={() => router.push("/contact")}>
          {t("community.contact")}
        </Button>
      </ScrollView>
    </View>
  );
}
function ModerationContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vm = useModerationViewModel();
  const item = vm.selected;
  const locale = i18n?.resolvedLanguage ?? i18n?.language;
  const destination = {
    REVIEW: "/(app)/admin/reviews",
    COMMENT: "/(app)/admin/reviews",
    USER: "/(app)/admin/users",
    EVENT: "/(app)/admin/events",
    WINE_ROUTE: "/(app)/admin/routes",
  } as const;
  const canRemove = item?.target.type === "REVIEW" || item?.target.type === "COMMENT";
  const removeContent = () =>
    Alert.alert(t("community.removeContent"), t("community.removeConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("community.removeContent"),
        style: "destructive",
        onPress: () => void vm.submit("REMOVE"),
      },
    ]);
  return (
    <View style={adminStyles.screen}>
      <AppHeader title={t("community.reportsTab")} showBack onBack={() => goBackOr(router, ADMIN_ROUTE)} />
      <ScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        contentContainerStyle={[adminStyles.content, { paddingBottom: insets.bottom + 28 }]}
      >
        <ModerationTabs active="reports" />
        <CommunityOverviewPanel moderation />
        <View style={adminStyles.statusFilters}>
          {(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"] as const).map((value) => (
            <Chip
              key={value}
              role="radio"
              label={t(`community.statuses.${value}`)}
              selected={vm.status === value}
              onPress={() => vm.changeStatus(value)}
            />
          ))}
        </View>
        {vm.reports.isPending ? (
          <Skeleton height={120} radius={radii.xl} />
        ) : vm.reports.isError ? (
          <>
            <Text accessibilityRole="alert" style={adminStyles.error}>
              {t("community.error")}
            </Text>
            <Button variant="outline" onPress={vm.reload}>
              {t("common.retry")}
            </Button>
          </>
        ) : (
          <>
            {!vm.reports.data?.items.length && <ModerationEmpty />}
            {vm.reports.data?.items.map((report) => (
              <ModerationRow
                key={report.id}
                title={t(`community.reasons.${report.reason}`)}
                subtitle={`${t(`community.targets.${report.target.type}`)} · ${report.createdAt.toLocaleDateString(locale)}`}
                preview={report.excerpt || report.description}
                badge={<ReportStatusBadge status={report.status} />}
                onPress={() => vm.select(report)}
              />
            ))}
            {!!vm.reports.data?.items.length && (
              <AdminPaginationBar
                page={vm.page}
                totalPages={vm.reports.data.totalPages}
                totalItems={vm.reports.data.totalItems}
                onPageChange={vm.setPage}
              />
            )}
          </>
        )}
      </ScrollView>
      <AdminDetailSheet
        visible={!!item}
        title={t("community.reportDetail")}
        busy={vm.busy}
        onClose={vm.close}
        subtitle={item ? t(`community.targets.${item.target.type}`) : undefined}
      >
        {item && (
          <>
            <ReportStatusBadge status={item.status} />
            <View style={adminStyles.evidence}>
              <Text style={adminStyles.rowTitle}>{t(`community.reasons.${item.reason}`)}</Text>
              {!!item.excerpt && (
                <Text selectable style={adminStyles.preview}>
                  {item.excerpt}
                </Text>
              )}
              {!!item.description && (
                <Text selectable style={adminStyles.help}>
                  {item.description}
                </Text>
              )}
            </View>
            {!!item.authorUsername && (
              <DetailField label={t("community.authorLabel")}>{item.authorUsername}</DetailField>
            )}
            {!!item.targetLabel && (
              <DetailField label={t("community.aboutLabel")}>
                {`${t(`community.targets.${item.target.type}`)} · ${item.targetLabel}`}
              </DetailField>
            )}
            {!!item.reviewerUsername && (
              <DetailField label={t("community.reviewedByLabel")}>
                {item.reviewerUsername}
              </DetailField>
            )}
            <DetailField label={t("community.reportDateLabel")}>
              {item.createdAt.toLocaleString(locale)}
            </DetailField>
            <Text style={adminStyles.help}>{t("community.moderationHelp")}</Text>
            {item.target.type !== "USER" || vm.user?.roles.includes(ROLES.ADMIN) ? (
              <Button
                variant="outline"
                disabled={vm.busy}
                onPress={() => {
                  vm.close();
                  router.push(destination[item.target.type]);
                }}
              >
                {t("community.reviewContent")}
              </Button>
            ) : (
              <Text style={adminStyles.help}>{t("community.adminRequired")}</Text>
            )}
            {vm.final ? (
              <DetailField label={t("community.decision")}>
                {item.decision || t(`community.statuses.${item.status}`)}
              </DetailField>
            ) : (
              <View style={adminStyles.actionGroup}>
                {vm.locked && !vm.busy && (
                  <Text style={adminStyles.help}>{t("community.assignedElsewhere")}</Text>
                )}
                <ChoiceChips<ReportOutcome>
                  label={t("community.outcome")}
                  options={(canRemove ? REPORT_OUTCOMES : REPORT_OUTCOMES.filter((o) => o !== "REMOVE")).map(
                    (value) => ({ value, label: t(`community.outcomes.${value}`) }),
                  )}
                  value={vm.outcome}
                  onChange={vm.chooseOutcome}
                  disabled={vm.locked}
                />
                <ReasonPicker<ReportReasonCode>
                  label={t("community.decision")}
                  reasons={REPORT_OUTCOME_REASONS[vm.outcome]}
                  value={vm.reasonCode}
                  onChange={vm.chooseReason}
                  labelFor={(code) => t(`community.decisionReasons.${code}`)}
                  note={vm.note}
                  onNoteChange={vm.setNote}
                  noteLabel={t("community.decisionDetail")}
                  notePlaceholder={t("community.decisionPlaceholder")}
                  maxNoteLength={MAX_REPORT_DECISION_LENGTH}
                  disabled={vm.locked}
                />
                {vm.error && (
                  <>
                    <Text accessibilityRole="alert" style={adminStyles.error}>
                      {t("community.decisionError")}
                    </Text>
                    <Button variant="outline" onPress={vm.reload}>
                      {t("community.reloadQueue")}
                    </Button>
                  </>
                )}
                <Button
                  variant={vm.outcome === "REMOVE" ? "danger" : "primary"}
                  loading={vm.busy}
                  disabled={vm.locked || !vm.canDecide}
                  onPress={vm.outcome === "REMOVE" ? removeContent : () => void vm.submit(vm.outcome as ReportStatus)}
                >
                  {t(OUTCOME_BUTTON[vm.outcome])}
                </Button>
                {item.status === "OPEN" && (
                  <Button
                    variant="outline"
                    disabled={vm.locked}
                    onPress={() => void vm.submit("IN_REVIEW")}
                  >
                    {t("community.claim")}
                  </Button>
                )}
              </View>
            )}
            <Button variant="ghost" disabled={vm.busy} onPress={vm.close}>
              {t("common.close")}
            </Button>
          </>
        )}
      </AdminDetailSheet>
    </View>
  );
}
export function CommunityModerationScreen() {
  return (
    <RoleGuard requiredRoles={[ROLES.ADMIN, ROLES.MODERATOR]}>
      <ModerationContent />
    </RoleGuard>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgSubtle },
  content: { padding: layout.screenHorizontalPadding, gap: 16 },
  section: {
    padding: 16,
    gap: 12,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: lightTokens.borderSoft,
    backgroundColor: lightTokens.surfaceDefault,
  },
  sectionHeading: { gap: 4 },
  heading: { ...textStyles.titleLarge, color: lightTokens.textPrimary },
  help: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
  meta: { ...textStyles.caption, color: lightTokens.textTertiary },
  loading: { gap: 10 },
  empty: { flex: 0, padding: 8 },
  card: { gap: 8, borderWidth: 1, borderColor: lightTokens.borderSoft, backgroundColor: lightTokens.bgSubtle },
  cardTitle: { ...textStyles.titleSmall, color: lightTokens.textPrimary },
  reportHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  caseRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  caseId: { ...textStyles.labelMedium, color: lightTokens.textSecondary },
  copyButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    backgroundColor: lightTokens.brandSecondary,
  },
  copied: { ...textStyles.caption, color: lightTokens.successText },
  errorBox: { gap: 10, alignItems: "flex-start" },
  errorText: { ...textStyles.bodySmall, color: lightTokens.textDanger },
  blockRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  pageNumber: { ...textStyles.labelLarge, color: lightTokens.textSecondary },
});
