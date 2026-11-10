import { StyleSheet } from "react-native";
import { editorial, lightTokens, radii, systemColors, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

/** Shared look of the admin notifications section, matching the other admin cards. */
export const notificationStyles = StyleSheet.create({
  card: {
    backgroundColor: lightTokens.surfaceDefault,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    padding: 16,
    gap: 12,
  },
  heading: { ...textStyles.titleSmall, color: lightTokens.textPrimary },
  label: { ...textStyles.labelMedium, color: lightTokens.textSecondary },
  help: { ...textStyles.caption, color: lightTokens.textTertiary },
  error: { ...textStyles.caption, color: lightTokens.danger },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  field: { gap: 8 },
  segment: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: lightTokens.bgSubtle,
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  segmentFill: { alignSelf: "stretch" },
  segmentItemFill: { flex: 1, paddingHorizontal: 8 },
  segmentItemActive: { backgroundColor: lightTokens.surfaceDefault, borderWidth: 1, borderColor: wine[100] },
  segmentText: { ...textStyles.labelMedium, color: lightTokens.textSecondary },
  segmentTextFill: { textAlign: "center" },
  segmentTextActive: { color: editorial.brand },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: systemColors.success },
  /** A small count with its label, in the metric grids. */
  statValue: { ...textStyles.titleSmall, color: lightTokens.textPrimary },
  statZero: { color: lightTokens.textDisabled },
  statLabel: { ...textStyles.caption, color: lightTokens.textTertiary },
});
