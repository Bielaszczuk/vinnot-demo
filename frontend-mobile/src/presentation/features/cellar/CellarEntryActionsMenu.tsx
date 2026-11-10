/**
 * CellarEntryActionsMenu — a three-dots trigger that gathers the actions of a
 * cellar entry in a bottom sheet: edit notes, view or publish the review, open
 * the wine and delete. Swipe to delete on the row stays available.
 */
import { useRef, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Edit3, MessageSquare, MoreHorizontal, Trash2, Wine } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

const SNAP_POINTS = ["50%"];

interface CellarEntryActionsMenuProps {
  wineName: string;
  hasReview: boolean;
  onEdit: () => void;
  onReview: () => void;
  onOpenWine: () => void;
  onDelete: () => void;
}

export function CellarEntryActionsMenu({
  wineName,
  hasReview,
  onEdit,
  onReview,
  onOpenWine,
  onDelete,
}: CellarEntryActionsMenuProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);
  // Runs after the menu has finished closing: editing and publishing open another
  // sheet, and presenting it while this one is still closing would discard it.
  const pendingAction = useRef<(() => void) | null>(null);
  const dismiss = () => sheetRef.current?.dismiss();
  const run = (action: () => void) => () => {
    pendingAction.current = action;
    dismiss();
  };
  const runPendingAction = () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("cellar.moreOptions", { name: wineName })}
        hitSlop={6}
        onPress={() => sheetRef.current?.present()}
        style={styles.trigger}
      >
        <MoreHorizontal size={20} color={vinnotColors.muted} />
      </Pressable>
      <BottomSheetModal
        ref={sheetRef}
        onDismiss={runPendingAction}
        snapPoints={SNAP_POINTS}
        showBackButton={false}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
        )}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          <Text numberOfLines={1} style={styles.title}>{wineName}</Text>
          <View style={styles.options}>
            <MenuOption
              icon={<Edit3 size={18} color={vinnotColors.brand} />}
              label={t("cellar.editNotes")}
              onPress={run(onEdit)}
            />
            <MenuOption
              icon={<MessageSquare size={18} color={vinnotColors.brand} />}
              label={t(hasReview ? "cellar.viewReview" : "cellar.publishReview")}
              onPress={run(onReview)}
            />
            <MenuOption
              icon={<Wine size={18} color={vinnotColors.brand} />}
              label={t("cellar.openWine")}
              onPress={run(onOpenWine)}
            />
            <MenuOption
              icon={<Trash2 size={18} color={vinnotColors.danger} />}
              label={t("common.delete")}
              danger
              onPress={run(onDelete)}
            />
            <Pressable accessibilityRole="button" onPress={dismiss} style={[styles.option, styles.cancel]}>
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}

function MenuOption({
  icon,
  label,
  danger = false,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.option}>
      {icon}
      <Text style={[styles.optionText, danger && styles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 36,
    height: 36,
    marginTop: -6,
    marginRight: -8,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBackground: { backgroundColor: vinnotColors.surface },
  handle: { backgroundColor: vinnotColors.border },
  content: { gap: 12, paddingHorizontal: 20, paddingBottom: 32 },
  title: { ...textStyles.headingSmall, color: vinnotColors.ink },
  options: { gap: 4 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  optionText: { ...textStyles.labelLarge, color: vinnotColors.ink },
  dangerText: { color: vinnotColors.danger },
  cancel: { justifyContent: "center", marginTop: 4 },
  cancelText: { ...textStyles.labelLarge, color: vinnotColors.muted },
});
