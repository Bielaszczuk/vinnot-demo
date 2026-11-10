import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";
import { spacing } from "@/shared/theme/tokens";

interface BrowseScreenHeaderProps {
  title: string;
  /** Result count or a short description under the title. */
  subtitle?: string;
  /** A notice between the heading and the search, such as a location warning. */
  notice?: ReactNode;
  /** Search bar and active-filter chips. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shared top of the browse tabs (wines, events, routes): eyebrow, title,
 * subtitle and search, flat on the canvas so the three tabs read as one app.
 */
export function BrowseScreenHeader({ title, subtitle, notice, children, style }: BrowseScreenHeaderProps) {
  return (
    <Animated.View entering={FadeInDown.duration(420)} style={[styles.header, style]}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>VINNOT</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {notice}
      {children ? <View style={styles.searchBlock}>{children}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing[4],
    paddingBottom: spacing[4],
    backgroundColor: vinnotColors.canvas,
  },
  copy: {
    gap: spacing[0.5],
  },
  eyebrow: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    letterSpacing: 0,
    color: vinnotColors.brand,
  },
  title: {
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes["3xl"],
    lineHeight: 38,
    letterSpacing: 0,
    color: vinnotColors.ink,
  },
  subtitle: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    letterSpacing: 0,
    color: vinnotColors.muted,
  },
  searchBlock: {
    gap: spacing[3],
  },
});
