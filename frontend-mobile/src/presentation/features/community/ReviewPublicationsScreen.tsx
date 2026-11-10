import { ScrollView, Text, View } from "react-native";
import { ADMIN_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/presentation/components/ui/Button";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { AppHeader } from "@/presentation/components/layout";
import { RoleGuard } from "@/presentation/navigation/guards";
import { ROLES } from "@/shared/config/roles";
import {
  MAX_PUBLICATION_NOTE_LENGTH,
  PUBLICATION_REJECTION_REASONS,
  type PublicationRejectionReason,
} from "@/domain/community/community.types";
import { ReasonPicker } from "@/presentation/components/forms";
import { AdminDetailSheet } from "../admin/AdminDetailSheet";
import { RatingGlasses } from "../wine/rating/RatingGlasses";
import { AdminPageHero } from "../admin/AdminPageHero";
import { AdminPaginationBar } from "../admin/AdminPaginationBar";
import {
  DetailField,
  ModerationEmpty,
  ModerationRow,
  ModerationTabs,
  adminCommunityStyles as styles,
} from "./AdminCommunityParts";
import { usePublicationQueueViewModel } from "./useAdminCommunityViewModels";
import { MessageSquare } from "lucide-react-native";

function Content() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vm = usePublicationQueueViewModel();
  const item = vm.selected;
  const locale = i18n?.resolvedLanguage ?? i18n?.language;
  return (
    <View style={styles.screen}>
      <AppHeader title={t("community.publicationsTab")} showBack onBack={() => goBackOr(router, ADMIN_ROUTE)} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
        <ModerationTabs active="publications" />
        <AdminPageHero
          title={t("community.publications")}
          subtitle={t("community.publicationHelp")}
          icon={MessageSquare}
        />
        {vm.publications.isPending ? (
          <Skeleton height={120} radius={18} />
        ) : vm.publications.isError ? (
          <>
            <Text accessibilityRole="alert" style={styles.error}>
              {t("community.error")}
            </Text>
            <Button variant="outline" onPress={vm.reload}>
              {t("common.retry")}
            </Button>
          </>
        ) : (
          <>
            {!vm.publications.data?.items.length && <ModerationEmpty publications />}
            {vm.publications.data?.items.map((entry) => (
              <ModerationRow
                key={`${entry.id}:${entry.revision}`}
                title={entry.title || t(`community.targets.${entry.type}`)}
                subtitle={`${t(`community.targets.${entry.type}`)}${entry.rating !== null ? ` · ${entry.rating}/5` : ""} · ${entry.createdAt.toLocaleDateString(locale)}`}
                preview={entry.content}
                onPress={() => vm.select(entry)}
              />
            ))}
            {!!vm.publications.data?.items.length && (
              <AdminPaginationBar
                page={vm.page}
                totalPages={vm.publications.data.totalPages}
                totalItems={vm.publications.data.totalItems}
                onPageChange={vm.setPage}
              />
            )}
          </>
        )}
      </ScrollView>
      <AdminDetailSheet
        visible={!!item}
        title={t("community.publicationDetail")}
        subtitle={item ? t(`community.targets.${item.type}`) : undefined}
        busy={vm.busy}
        onClose={vm.close}
      >
        {item && (
          <>
            <View style={styles.evidence}>
              {!!item.title && <Text style={styles.rowTitle}>{item.title}</Text>}
              <Text selectable style={styles.preview}>
                {item.content}
              </Text>
              {item.rating !== null && <RatingGlasses rating={item.rating} size={24} showLabel />}
            </View>
            {!!item.authorUsername && (
              <DetailField label={t("community.authorLabel")}>{item.authorUsername}</DetailField>
            )}
            {!!item.wineName && (
              <DetailField label={t("community.wineLabel")}>{item.wineName}</DetailField>
            )}
            <DetailField label={t("community.reportDateLabel")}>
              {item.createdAt.toLocaleString(locale)}
            </DetailField>
            <View style={styles.actionGroup}>
              <ReasonPicker<PublicationRejectionReason>
                label={t("community.publicationReason")}
                hint={t("community.reasonHelp")}
                reasons={PUBLICATION_REJECTION_REASONS}
                value={vm.reasonCode}
                onChange={vm.chooseReason}
                labelFor={(code) => t(`community.rejectionReasons.${code}`)}
                note={vm.reason}
                onNoteChange={vm.setReason}
                noteLabel={t("community.publicationNote")}
                notePlaceholder={t("community.reasonPlaceholder")}
                maxNoteLength={MAX_PUBLICATION_NOTE_LENGTH}
                disabled={vm.busy}
              />
              {vm.error && (
                <>
                  <Text accessibilityRole="alert" style={styles.error}>
                    {t("community.decisionError")}
                  </Text>
                  <Button variant="outline" onPress={vm.reload}>
                    {t("community.reloadQueue")}
                  </Button>
                </>
              )}
              <Button loading={vm.busy} onPress={() => void vm.submit("APPROVED")}>
                {t("community.approve")}
              </Button>
              <Button
                variant="danger"
                disabled={vm.busy}
                onPress={() => void vm.submit("REJECTED")}
              >
                {t("community.reject")}
              </Button>
              <Button variant="ghost" disabled={vm.busy} onPress={vm.close}>
                {t("common.cancel")}
              </Button>
            </View>
          </>
        )}
      </AdminDetailSheet>
    </View>
  );
}
export function ReviewPublicationsScreen() {
  return (
    <RoleGuard requiredRoles={[ROLES.ADMIN, ROLES.MODERATOR]}>
      <Content />
    </RoleGuard>
  );
}
