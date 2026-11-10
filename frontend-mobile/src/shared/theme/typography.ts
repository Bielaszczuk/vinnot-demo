/**
 * Typography system — Vinnot Mobile
 *
 * Poppins is the single Vinnot type family. Components consume semantic
 * weights so the concrete font files remain centralized here.
 *
 * Scale follows a modular ratio for visual harmony.
 * All sizes in sp (React Native uses density-independent pixels by default).
 */
import { TextStyle } from "react-native";

export const fontFamilies = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
} as const;

export const fontSizes = {
  "2xs": 10,
  /** Eyebrows, meta lines and tab labels. */
  meta: 11,
  xs: 12,
  sm: 13,
  /** Control labels and compact body copy. */
  ui: 14,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  "5xl": 40,
  "6xl": 48,
} as const;

export const lineHeights = {
  tight: 1.15,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

export const letterSpacings = {
  tighter: 0,
  tight: 0,
  normal: 0,
  wide: 0,
  wider: 0,
  widest: 0,
} as const;

// ─── Named text styles ────────────────────────────────────────────────────────
// These are building blocks for ThemeContext and component StyleSheets.

type TypeStyle = Pick<TextStyle, "fontFamily" | "fontSize" | "lineHeight" | "letterSpacing">;

export const textStyles = {
  // ── Display ──
  displayLarge: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes["6xl"],
    lineHeight: fontSizes["6xl"] * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  } satisfies TypeStyle,

  displayMedium: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes["5xl"],
    lineHeight: fontSizes["5xl"] * lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  } satisfies TypeStyle,

  displaySmall: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes["4xl"],
    lineHeight: fontSizes["4xl"] * lineHeights.snug,
    letterSpacing: letterSpacings.tight,
  } satisfies TypeStyle,

  // ── Heading ──
  headingLarge: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes["3xl"],
    lineHeight: fontSizes["3xl"] * lineHeights.snug,
    letterSpacing: letterSpacings.tight,
  } satisfies TypeStyle,

  headingMedium: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes["2xl"],
    lineHeight: fontSizes["2xl"] * lineHeights.snug,
    letterSpacing: letterSpacings.tight,
  } satisfies TypeStyle,

  headingSmall: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  } satisfies TypeStyle,

  // ── Title ──
  titleLarge: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.normal,
    letterSpacing: letterSpacings.tight,
  } satisfies TypeStyle,

  titleMedium: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  } satisfies TypeStyle,

  titleSmall: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  } satisfies TypeStyle,

  // ── Body ──
  bodyLarge: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
  } satisfies TypeStyle,

  bodyMedium: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
  } satisfies TypeStyle,

  bodySmall: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
  } satisfies TypeStyle,

  // ── Label ──
  labelLarge: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  } satisfies TypeStyle,

  labelMedium: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  } satisfies TypeStyle,

  labelSmall: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes["2xs"],
    lineHeight: fontSizes["2xs"] * lineHeights.normal,
    letterSpacing: letterSpacings.widest,
  } satisfies TypeStyle,

  // ── Specialty ──
  wineName: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes["2xl"],
    lineHeight: fontSizes["2xl"] * lineHeights.snug,
    letterSpacing: letterSpacings.tight,
  } satisfies TypeStyle,

  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
  } satisfies TypeStyle,

  overline: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes["2xs"],
    lineHeight: fontSizes["2xs"] * lineHeights.normal,
    letterSpacing: letterSpacings.widest,
  } satisfies TypeStyle,

  button: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  } satisfies TypeStyle,

  buttonSmall: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  } satisfies TypeStyle,
} as const;

export type TextStyleKey = keyof typeof textStyles;
