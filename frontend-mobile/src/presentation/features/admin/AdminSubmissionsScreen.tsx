import { ADMIN_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { ScrollView, Text, View, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/presentation/components/layout";
import { Button } from "@/presentation/components/ui/Button";
import { TextField } from "@/presentation/components/ui/TextField";
import { Spinner, EmptyState } from "@/presentation/components/ui/Feedback";
import { AdminPaginationBar } from "./AdminPaginationBar";
import { AdminPageHero } from "./AdminPageHero";
import { AdminDetailSheet } from "./AdminDetailSheet";
import { AdminQueryError } from "./AdminQueryError";
import {
  DetailField,
  ModerationRow,
  adminCommunityStyles as styles,
} from "../community/AdminCommunityParts";
import { useAdminSubmissionsViewModel } from "./useAdminSubmissionsViewModel";
import { wineTypeLabel } from "../wine/wineTypeLabel";
import { submissionReasonText } from "../wine/submissionReason";
import type { AdminWineSubmissionStatus } from "@/domain/admin/admin.types";
import { SubmissionDecisionPanel } from "./submissions/SubmissionDecisionPanel";
import { ShieldAlert } from "lucide-react-native";

const STATUSES: AdminWineSubmissionStatus[] = [
  "NEEDS_REVIEW",
  "PENDING",
  "CHANGES_REQUESTED",
  "APPROVED",
  "DUPLICATE",
  "REJECTED",
];
export function AdminSubmissionsScreen() {
  const vm = useAdminSubmissionsViewModel();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const item = vm.detail.currentData;
  const terminal = item && ["APPROVED", "DUPLICATE", "REJECTED"].includes(item.status);
  return (
    <View style={styles.screen}>
      <AppHeader title={vm.t("admin.submissions.shortTitle")} showBack onBack={() => goBackOr(router, ADMIN_ROUTE)} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      >
        <AdminPageHero
          title={vm.t("admin.submissions.title")}
          subtitle={vm.t("admin.submissions.subtitle")}
          icon={ShieldAlert}
        />
        <View style={styles.evidence}>
          <TextField
            value={vm.search}
            onChangeText={vm.setSearch}
            placeholder={vm.t("admin.submissions.searchPlaceholder")}
          />
          <Button size="sm" variant="outline" onPress={vm.applySearch}>
            {vm.t("common.search")}
          </Button>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {STATUSES.map((status) => (
            <Pressable
              key={status}
              accessibilityRole="radio"
              accessibilityLabel={vm.t(`admin.submissions.status.${status}`)}
              accessibilityState={{ checked: vm.status === status }}
              onPress={() => vm.changeStatus(status)}
              style={[styles.chip, vm.status === status && styles.chipSelected]}
            >
              <Text style={styles.help}>{vm.t(`admin.submissions.status.${status}`)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {vm.list.isError ? (
          <AdminQueryError retry={vm.list.refetch} />
        ) : vm.list.isFetching && !vm.list.currentData ? (
          <Spinner />
        ) : vm.list.currentData?.items.length ? (
          <>
            {vm.list.currentData.items.map((submission) => (
              <ModerationRow
                key={submission.id}
                title={submission.wineName}
                subtitle={submission.wineryName}
                preview={`${vm.t(`admin.submissions.status.${submission.status}`)} · ${vm.t("admin.submissions.submittedBy")}: ${submission.submittedByUsername ? `@${submission.submittedByUsername}` : vm.t("admin.submissions.unknownAuthor")}`}
                onPress={() => vm.select(submission.id)}
              />
            ))}
            <AdminPaginationBar
              page={vm.page}
              onPageChange={vm.setPage}
              totalPages={vm.totalPages}
              totalItems={vm.list.currentData.totalItems}
            />
          </>
        ) : (
          <EmptyState
            title={vm.t("common.noResults")}
            description={vm.t("admin.submissions.emptyHelp")}
          />
        )}
      </ScrollView>
      <AdminDetailSheet
        visible={!!vm.selectedId}
        title={item?.wineName ?? vm.t("admin.submissions.title")}
        subtitle={item?.wineryName}
        busy={vm.working}
        onClose={vm.close}
      >
        {vm.detail.isError ? (
          <AdminQueryError retry={vm.detail.refetch} />
        ) : !item ? (
          <Spinner />
        ) : (
          <>
            <View style={styles.evidence}>
              <Text style={styles.rowTitle}>{vm.t(`admin.submissions.status.${item.status}`)}</Text>
              <DetailField label={vm.t("admin.submissions.submittedBy")}>
                {item.submittedByUsername ? `@${item.submittedByUsername}` : vm.t("admin.submissions.unknownAuthor")}
              </DetailField>
              <Text style={styles.help}>
                {[item.wineType ? wineTypeLabel(vm.t, item.wineType) : null, item.vintage].filter(Boolean).join(" · ")}
              </Text>
              <DetailField label={vm.t("admin.submissions.catalog.title")}>
                {vm.catalogValues
                  .map(
                    ({ field, value, proposed }) =>
                      `${vm.t(`admin.submissions.catalog.${field}`)}: ${value} (${vm.t(
                        proposed ? "admin.submissions.catalog.proposed" : "admin.submissions.catalog.existing",
                      )})`,
                  )
                  .join("\n")}
              </DetailField>
              {!!item.notes && (
                <Text selectable style={styles.preview}>
                  {item.notes}
                </Text>
              )}
              {!!submissionReasonText(vm.t, item) && (
                <DetailField label={vm.t("admin.submissions.reasonPlaceholder")}>
                  {submissionReasonText(vm.t, item)}
                </DetailField>
              )}
            </View>
            {vm.image.isError ? (
              <AdminQueryError retry={vm.image.refetch} />
            ) : vm.image.isLoading ? (
              <Spinner />
            ) : vm.image.currentData ? (
              <Image
                source={{ uri: vm.image.currentData }}
                style={{ height: 220, width: "100%", borderRadius: 16 }}
                resizeMode="contain"
              />
            ) : null}
            {!terminal && (
              <SubmissionDecisionPanel key={item.id} form={vm.decisionForm} submission={item} />
            )}
            <Button variant="ghost" disabled={vm.working} onPress={vm.close}>
              {vm.t("common.close")}
            </Button>
          </>
        )}
      </AdminDetailSheet>
    </View>
  );
}
