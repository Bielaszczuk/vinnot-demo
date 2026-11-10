/**
 * CommunityActionsMenu — a three-dots trigger that gathers report and block
 * actions in a bottom sheet, so content cards stay free of action links.
 */
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ban, Flag, MoreHorizontal, UserX } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import type { useCommunityActions } from "@/presentation/hooks/queries/community/useCommunity";
import { useToast } from "@/presentation/providers/ToastProvider";
import type { ReportTargetType } from "@/domain/community/community.types";
import { lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { communityErrorKey } from "./communityErrorKey";
import { CommunityReportForm, toReportInput, type ReportDraft } from "./CommunityReportForm";

type CommunityActionState = ReturnType<typeof useCommunityActions>;

/** Visible options and the caller's mutations, shared by both action variants. */
export interface CommunityActionOptions {
  targetType: ReportTargetType;
  targetId: string;
  authorId?: string;
  canReportUser: boolean;
  canBlock: boolean;
  report: CommunityActionState["report"];
  block: CommunityActionState["block"];
}

export function CommunityActionsMenu({
  targetType,
  targetId,
  authorId,
  canReportUser,
  canBlock,
  report,
  block,
}: CommunityActionOptions) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [reporting, setReporting] = useState<ReportTargetType | null>(null);
  const snapPoints = useMemo(() => [reporting ? "85%" : "46%"], [reporting]);
  const pending = report.isPending || block.isPending;

  const open = () => {
    report.reset();
    setReporting(null);
    sheetRef.current?.present();
  };
  const dismiss = () => sheetRef.current?.dismiss();
  const startReport = (type: ReportTargetType) => {
    report.reset();
    setReporting(type);
  };
  const submit = async (draft: ReportDraft) => {
    if (!reporting) return;
    try {
      await report.mutateAsync(toReportInput(reporting, targetId, authorId, draft));
      dismiss();
      showSuccess(t("community.sent"));
    } catch {
      /* Keep the sheet and its draft open; the mutation error renders inside the form. */
    }
  };
  const blockUser = () => {
    if (!authorId) return;
    dismiss();
    Alert.alert(t("community.block"), t("community.blockConfirm"), [
      { text: t("community.cancel"), style: "cancel" },
      {
        text: t("community.block"),
        style: "destructive",
        onPress: () =>
          block.mutate(authorId, {
            onSuccess: () => showSuccess(t("community.blocked")),
            onError: (error) => showError(t(communityErrorKey(error))),
          }),
      },
    ]);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("community.moreOptions")}
        disabled={pending}
        hitSlop={4}
        onPress={open}
        style={styles.trigger}
      >
        <MoreHorizontal size={18} color={lightTokens.textTertiary} />
      </Pressable>
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose={!pending}
        onDismiss={() => setReporting(null)}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior={pending ? "none" : "close"}
          />
        )}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {reporting ? (
            <>
              <Text style={styles.title}>
                {t(reporting === "USER" ? "community.reportUser" : "community.report")}
              </Text>
              <CommunityReportForm
                layout="sheet"
                pending={report.isPending}
                error={report.isError ? t(communityErrorKey(report.error)) : undefined}
                onSubmit={(draft) => {
                  void submit(draft);
                }}
                onCancel={() => setReporting(null)}
              />
            </>
          ) : (
            <View style={styles.options}>
              <MenuOption
                icon={<Flag size={18} color={wine[700]} />}
                label={t("community.report")}
                disabled={pending}
                onPress={() => startReport(targetType)}
              />
              {canReportUser && (
                <MenuOption
                  icon={<UserX size={18} color={wine[700]} />}
                  label={t("community.reportUser")}
                  disabled={pending}
                  onPress={() => startReport("USER")}
                />
              )}
              {canBlock && (
                <MenuOption
                  icon={<Ban size={18} color={lightTokens.danger} />}
                  label={t("community.block")}
                  danger
                  disabled={pending}
                  onPress={blockUser}
                />
              )}
              <Pressable
                accessibilityRole="button"
                onPress={dismiss}
                style={[styles.option, styles.cancel]}
              >
                <Text style={styles.cancelText}>{t("community.cancel")}</Text>
              </Pressable>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}

function MenuOption({
  icon,
  label,
  danger = false,
  disabled,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={styles.option}
    >
      {icon}
      <Text style={[styles.optionText, danger && styles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBackground: { backgroundColor: lightTokens.surfaceDefault },
  handle: { backgroundColor: lightTokens.borderStrong },
  content: { gap: 16, paddingHorizontal: 20, paddingBottom: 32 },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  options: { gap: 4 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  optionText: { ...textStyles.labelLarge, color: lightTokens.textPrimary },
  dangerText: { color: lightTokens.danger },
  cancel: { justifyContent: "center", marginTop: 4 },
  cancelText: { ...textStyles.labelLarge, color: lightTokens.textSecondary },
});
