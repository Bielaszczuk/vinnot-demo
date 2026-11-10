import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useCommunityActions } from "@/presentation/hooks/queries/community/useCommunity";
import type { ReportTargetType } from "@/domain/community/community.types";
import { lightTokens, wine } from "@/shared/theme/tokens";
import { communityErrorKey } from "./communityErrorKey";
import { CommunityActionsMenu, type CommunityActionOptions } from "./CommunityActionsMenu";
import { CommunityReportForm, toReportInput, type ReportDraft } from "./CommunityReportForm";

export function CommunityActions({
  targetType,
  targetId,
  authorId,
  ownerId,
  allowBlock = true,
  variant = "links",
}: {
  targetType: ReportTargetType;
  targetId: string;
  authorId?: string;
  /** Owner of a shared item (an event organizer): hides the actions from them only. */
  ownerId?: string;
  allowBlock?: boolean;
  /** "links" renders inline text actions; "menu" gathers them behind a three-dots sheet. */
  variant?: "links" | "menu";
}) {
  const { user, report, block } = useCommunityActions();
  if (!user || user.id === authorId || user.id === ownerId) return null;
  const options: CommunityActionOptions = {
    targetType,
    targetId,
    authorId,
    canReportUser: !!authorId && targetType !== "USER",
    canBlock: !!authorId && allowBlock,
    report,
    block,
  };
  return variant === "menu" ? <CommunityActionsMenu {...options} /> : <CommunityActionLinks {...options} />;
}

function CommunityActionLinks({
  targetType,
  targetId,
  authorId,
  canReportUser,
  canBlock,
  report,
  block,
}: CommunityActionOptions) {
  const { t } = useTranslation();
  const [reporting, setReporting] = useState<ReportTargetType | null>(null);
  const pending = report.isPending || block.isPending;
  const start = (type: ReportTargetType) => {
    report.reset();
    setReporting(type);
  };
  const submit = async (draft: ReportDraft) => {
    if (!reporting) return;
    try {
      await report.mutateAsync(toReportInput(reporting, targetId, authorId, draft));
      setReporting(null);
    } catch {
      /* Preserve draft; render the mutation error below. */
    }
  };
  const blockUser = () => {
    if (!authorId) return;
    Alert.alert(t("community.block"), t("community.blockConfirm"), [
      { text: t("community.cancel"), style: "cancel" },
      { text: t("community.block"), style: "destructive", onPress: () => block.mutate(authorId) },
    ]);
  };
  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={() => start(targetType)}
          style={styles.action}
        >
          <Text style={styles.link}>{t("community.report")}</Text>
        </Pressable>
        {canReportUser && (
          <Pressable
            accessibilityRole="button"
            disabled={pending}
            onPress={() => start("USER")}
            style={styles.action}
          >
            <Text style={styles.link}>{t("community.reportUser")}</Text>
          </Pressable>
        )}
        {canBlock && (
          <Pressable
            accessibilityRole="button"
            disabled={pending}
            onPress={blockUser}
            style={styles.action}
          >
            <Text style={styles.link}>{t("community.block")}</Text>
          </Pressable>
        )}
      </View>
      {reporting && (
        <CommunityReportForm
          pending={pending}
          onSubmit={(draft) => {
            void submit(draft);
          }}
          onCancel={() => setReporting(null)}
        />
      )}
      {report.isSuccess && <Text accessibilityLiveRegion="polite">{t("community.sent")}</Text>}
      {(report.isError || block.isError) && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t(communityErrorKey(report.isError ? report.error : block.error))}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  action: { paddingVertical: 12, paddingHorizontal: 8, minHeight: 44 },
  link: { color: wine[700], textDecorationLine: "underline" },
  error: { color: lightTokens.danger },
});
