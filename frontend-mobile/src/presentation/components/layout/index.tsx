/**
 * Layout components — ScreenContainer, AppHeader, SectionHeader.
 */
import {
  Pressable,
  ScrollViewProps,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Href } from "expo-router";
import { lightTokens, layout } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { BackButton } from "@/presentation/components/ui/BackButton";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";

// ─── ScreenContainer ──────────────────────────────────────────────────────────
interface ScreenContainerProps extends ScrollViewProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padTop?: boolean;
  padBottom?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function ScreenContainer({
  children,
  scrollable = true,
  padTop = false,
  padBottom = true,
  style,
  contentStyle,
  ...scrollProps
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const contentContainerStyle: ViewStyle = {
    paddingHorizontal: layout.screenHorizontalPadding,
    paddingTop: padTop ? layout.screenVerticalPadding : 0,
    paddingBottom: padBottom ? insets.bottom + 24 : 0,
    flexGrow: 1,
    ...(contentStyle as object),
  };

  if (!scrollable) {
    return (
      <View style={[containerStyles.fill, style]}>
        <View style={contentContainerStyle}>{children}</View>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={[containerStyles.fill, style]}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      {...scrollProps}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

const containerStyles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: lightTokens.bgBase },
});

// ─── AppHeader ────────────────────────────────────────────────────────────────
interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  /** Custom back behaviour; without it Back uses the history or `backFallback`. */
  onBack?: () => void;
  /** Route opened when there is no history. Defaults to Home. */
  backFallback?: Href;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  transparent?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  backFallback,
  rightAction,
  style,
  transparent = false,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        headerStyles.container,
        { paddingTop: insets.top + 8 },
        !transparent && headerStyles.opaque,
        style,
      ]}
    >
      <View style={headerStyles.row}>
        {showBack && <BackButton variant="icon" onPress={onBack} fallback={backFallback} />}
        <View style={headerStyles.titleArea}>
          <Text style={headerStyles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {title}
          </Text>
          {subtitle && (
            <Text style={headerStyles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {rightAction ? <View style={headerStyles.right}>{rightAction}</View> : null}
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  opaque: {
    backgroundColor: lightTokens.bgBase,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightTokens.borderDefault,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.headerHeight,
    gap: 8,
  },
  titleArea: { flex: 1 },
  title: {
    ...textStyles.headingMedium,
    color: lightTokens.textPrimary,
  },
  subtitle: {
    ...textStyles.caption,
    color: lightTokens.textTertiary,
    marginTop: 1,
  },
  right: { alignItems: "flex-end" },
});

// ─── SectionHeader ────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({ title, actionLabel, onAction, style }: SectionHeaderProps) {
  return (
    <View style={[sectionStyles.row, style]}>
      <Text accessibilityRole="header" style={sectionStyles.title}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={12}>
          <Text style={sectionStyles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    ...textStyles.headingSmall,
    color: lightTokens.textPrimary,
  },
  action: {
    ...textStyles.labelMedium,
    color: lightTokens.brandPrimary,
  },
});
