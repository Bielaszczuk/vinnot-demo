import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { neutral, systemColors, radii } from "@/shared/theme/tokens";
import { authColors, authFonts } from "./authTheme";
import { fontSizes } from "@/shared/theme/typography";

type Props = {
  value: string;
};

export function PasswordStrengthBar({ value }: Props) {
  const { t } = useTranslation();
  const { score, labelKey, color } = useMemo(() => {
    if (!value) return { score: 0, labelKey: "", color: neutral[200] };
    let s = 0;
    if (value.length >= 8) s++;
    if (value.length >= 12) s++;
    if (/[A-Z]/.test(value)) s++;
    if (/[a-z]/.test(value)) s++;
    if (/[0-9]/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    if (s <= 2) {
      return {
        score: s,
        labelKey: "auth.passwordStrength.weak",
        color: systemColors.danger,
      };
    }
    if (s <= 4) {
      return {
        score: s,
        labelKey: "auth.passwordStrength.medium",
        color: systemColors.warning,
      };
    }
    return {
      score: s,
      labelKey: "auth.passwordStrength.strong",
      color: systemColors.success,
    };
  }, [value]);

  if (!value) return null;
  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${(score / 6) * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.label}>{t(labelKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: -7,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: authColors.border,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  bar: { height: "100%", borderRadius: radii.full },
  label: {
    color: authColors.muted,
    fontFamily: authFonts.medium,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    letterSpacing: 0,
  },
});
