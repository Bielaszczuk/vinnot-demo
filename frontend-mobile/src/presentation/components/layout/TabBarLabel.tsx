/** TabBarLabel — bottom tab label that grows with Dynamic Type up to 1.3x, then stops, so it never clips. */
import type { ReactNode } from "react";
import { StyleSheet, Text, type ColorValue } from "react-native";
import { fontFamilies, fontSizes } from "@/shared/theme/typography";

export const TAB_LABEL_MAX_FONT_SCALE = 1.3;

export function TabBarLabel({ color, children }: { color: ColorValue; children: ReactNode }) {
  return (
    <Text numberOfLines={1} maxFontSizeMultiplier={TAB_LABEL_MAX_FONT_SCALE} style={[styles.label, { color }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 5,
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.meta,
    lineHeight: 14,
  },
});
