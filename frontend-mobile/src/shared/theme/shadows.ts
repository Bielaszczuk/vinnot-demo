/**
 * Shadow tokens — Vinnot Mobile
 *
 * React Native shadows differ between iOS (shadow*) and Android (elevation).
 * We provide cross-platform shadow objects that work with StyleSheet.
 * The wine-tinted shadows give cards a subtle, branded depth.
 */
import { Platform, ViewStyle } from "react-native";
import { shadowColors } from "./tokens";

type ShadowStyle = Pick<
  ViewStyle,
  "shadowColor" | "shadowOffset" | "shadowOpacity" | "shadowRadius" | "elevation"
>;

const createShadow = (
  color: string,
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number,
): ShadowStyle =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
      shadowColor: color,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  }) as ShadowStyle;

// Wine-tinted shadow for branded surfaces
export const shadows = {
  none: createShadow("transparent", 0, 0, 0, 0),

  // Subtle — inputs, chips, small elements
  sm: createShadow(shadowColors.soft, 1, 0.05, 3, 1),

  // Default — cards, list items
  md: createShadow(shadowColors.soft, 2, 0.07, 15, 3),

  // Raised — modal headers, sticky elements
  lg: createShadow(shadowColors.soft, 8, 0.1, 24, 8),

  // Elevated — bottom sheets, floating elements
  xl: createShadow(shadowColors.soft, 12, 0.13, 34, 12),

  // Max — overlays
  "2xl": createShadow(shadowColors.soft, 18, 0.18, 48, 20),
} as const;

export type ShadowKey = keyof typeof shadows;
