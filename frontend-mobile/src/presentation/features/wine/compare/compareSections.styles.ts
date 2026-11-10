import { StyleSheet } from "react-native";
import { profileTagColors, radii } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";

/** Each wine keeps one tint across every section, like the AI profile tags. */
export const WINE_TINTS = {
  A: profileTagColors.rose,
  B: profileTagColors.amber,
  shared: profileTagColors.emerald,
} as const;

export const sectionStyles = StyleSheet.create({
  stack: { gap: 12 },
  card: {
    gap: 14,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    backgroundColor: vinnotColors.surface,
  },
  callout: {
    gap: 8,
    borderWidth: 1,
    borderColor: vinnotColors.brandTint,
    backgroundColor: vinnotColors.brandSoft,
  },
  eyebrow: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    letterSpacing: 0,
    textTransform: "uppercase",
    color: vinnotColors.brand,
  },
  calloutText: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.ui,
    lineHeight: 23,
    color: vinnotColors.ink,
  },
  sectionTitle: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.lg,
    lineHeight: 24,
    color: vinnotColors.ink,
  },
  bodyText: {
    flexShrink: 1,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    color: vinnotColors.muted,
  },
  group: { gap: 8 },
  segmented: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: radii.full,
    backgroundColor: vinnotColors.canvas,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: radii.full,
  },
  segmentActive: {
    backgroundColor: vinnotColors.surface,
    shadowColor: vinnotColors.brandDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  segmentText: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: vinnotColors.muted,
  },
  segmentTextActive: {
    fontFamily: vinnotFonts.semibold,
    color: vinnotColors.ink,
  },
  identity: {
    borderLeftWidth: 3,
    borderLeftColor: vinnotColors.brand,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: vinnotColors.brandSoft,
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    color: vinnotColors.ink,
  },
  noteRow: {
    gap: 3,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: vinnotColors.borderSoft,
  },
  fieldLabel: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes["2xs"],
    lineHeight: 15,
    letterSpacing: 0,
    textTransform: "uppercase",
    color: vinnotColors.muted,
  },
  fieldValue: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: vinnotColors.ink,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.meta,
    lineHeight: 16,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  tagText: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.meta,
    lineHeight: 16,
  },
  item: {
    gap: 3,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: vinnotColors.canvas,
  },
  itemSharedBorder: {
    borderColor: profileTagColors.emerald.border,
    backgroundColor: profileTagColors.emerald.bg,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoCell: {
    flex: 1,
    minWidth: "44%",
    gap: 3,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: vinnotColors.canvas,
  },
});
