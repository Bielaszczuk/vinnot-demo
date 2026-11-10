/**
 * BackButton — the one back control of the app: one icon, one colour, one fallback.
 * Without history (deep link, notification) it opens `fallback` instead of doing nothing.
 */
import { useState } from "react";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { HOME_ROUTE } from "@/presentation/navigation/wineNavigation";
import { iconStrokes, lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export interface BackButtonProps {
  /** Route opened when the screen has no history. Defaults to Home. */
  fallback?: Href;
  /** A view model's own back behaviour; replaces the router back and the fallback. */
  onPress?: () => void;
  /** `pill` shows the label next to the arrow; `icon` is a round icon-only control. */
  variant?: "pill" | "icon";
  /** Visible label and accessible name; defaults to "Volver" / "Back". */
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function BackButton({
  fallback = HOME_ROUTE,
  onPress,
  variant = "pill",
  label,
  disabled = false,
  style,
  testID,
}: BackButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const name = label ?? t("common.back");
  const handlePress = onPress ?? (() => goBackOr(router, fallback));
  const iconOnly = variant === "icon";
  // A function style is lost through the NativeWind interop on device (#332), so pressed state lives here.
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      testID={testID}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[iconOnly ? styles.icon : styles.pill, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <ArrowLeft size={18} color={lightTokens.brandPrimary} strokeWidth={iconStrokes.regular} />
      {!iconOnly && <Text style={styles.label}>{name}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: lightTokens.borderSoft,
    backgroundColor: lightTokens.surfaceDefault,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: lightTokens.borderSoft,
    backgroundColor: lightTokens.surfaceDefault,
  },
  pressed: { backgroundColor: lightTokens.brandSecondary },
  disabled: { opacity: 0.45 },
  label: { ...textStyles.labelLarge, color: lightTokens.brandPrimary },
});
