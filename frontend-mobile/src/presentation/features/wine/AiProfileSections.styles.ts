import { StyleSheet } from "react-native";
import { profileTagColors, radii } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";

export type TagColor = "violet" | "amber" | "rose" | "emerald" | "green" | "sky";

export const TAG_COLORS: Record<TagColor, { bg: string; text: string; border: string }> = profileTagColors;

export const styles = StyleSheet.create({
  wrapper: { gap: 16 },
  loading: { gap: 14 },
  empty: { minHeight: 220 },

  summaryCard: {
    borderWidth: 1,
    borderColor: vinnotColors.brandTint,
    backgroundColor: vinnotColors.brandSoft,
  },
  sectionEyebrow: {
    marginBottom: 8,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    letterSpacing: 0,
    textTransform: "uppercase",
    color: vinnotColors.brand,
  },
  summary: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.ui,
    lineHeight: 23,
    letterSpacing: 0,
    color: vinnotColors.ink,
  },

  card: {
    gap: 14,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    backgroundColor: vinnotColors.surface,
  },
  sectionTitle: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.lg,
    lineHeight: 24,
    letterSpacing: 0,
    color: vinnotColors.ink,
  },

  sectionHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionHeaderTitle: { flexGrow: 1, flexShrink: 1, flexBasis: 140 },

  visualColor: { gap: 6 },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoCell: {
    flex: 1,
    minWidth: "44%",
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: vinnotColors.canvas,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    gap: 3,
  },
  infoCellWithArt: {
    alignItems: "center",
    paddingVertical: 14,
  },
  centered: { textAlign: "center" },
  artValue: { fontFamily: vinnotFonts.medium, fontSize: fontSizes.xs, lineHeight: 18 },
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
    letterSpacing: 0,
    color: vinnotColors.ink,
  },
  fieldText: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    letterSpacing: 0,
    color: vinnotColors.muted,
  },

  aromaGroup: { gap: 8 },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  tagPill: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  tagText: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    letterSpacing: 0,
  },

  barsGrid: { gap: 13 },
  scoreBarWrap: { gap: 7 },
  scoreBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  scoreBarLabel: {
    flex: 1,
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    letterSpacing: 0,
    color: vinnotColors.ink,
  },
  scoreBarValue: {
    maxWidth: "56%",
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    letterSpacing: 0,
    textAlign: "right",
    color: vinnotColors.muted,
  },
  scoreBarTrack: {
    height: 7,
    borderRadius: radii.full,
    backgroundColor: vinnotColors.borderSoft,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: radii.full,
    transformOrigin: "left",
  },

  palateDetails: {
    marginTop: 3,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: vinnotColors.borderSoft,
  },

  servingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});
