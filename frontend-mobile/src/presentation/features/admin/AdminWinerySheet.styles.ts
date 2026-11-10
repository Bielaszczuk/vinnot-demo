import { StyleSheet } from "react-native";
import { lightTokens, radii, spacing } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

/** A four-digit year needs no full-width field. */
const YEAR_FIELD_WIDTH = 132;

export const styles = StyleSheet.create({
  fields: { gap: spacing[3.5] },
  block: { gap: spacing[2] },
  twoCols: { flexDirection: "row", gap: spacing[3] },
  col: { flex: 1 },
  yearField: { width: YEAR_FIELD_WIDTH },
  textArea: { minHeight: 120, paddingTop: spacing[3], textAlignVertical: "top" },
  label: { ...textStyles.labelLarge, color: lightTokens.textPrimary },
  hint: { ...textStyles.caption, color: lightTokens.textTertiary, lineHeight: 17 },
  locationSearchRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing[2.5] },
  locationSearchInput: { flex: 1 },
  locationSearchButton: { minWidth: 104 },
  advanced: {
    gap: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: lightTokens.borderDefault,
  },
  advancedToggle: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderRadius: radii.md,
  },
  advancedCopy: { flex: 1, gap: spacing[0.5] },
  advancedTitle: { ...textStyles.labelLarge, color: lightTokens.textSecondary },
  chevronOpen: { transform: [{ rotate: "180deg" }] },
});
