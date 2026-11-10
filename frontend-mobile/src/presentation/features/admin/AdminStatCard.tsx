/**
 * AdminStatCard — colored stat tile for the admin dashboard.
 * Matches web AdminDashboardPage stat cards.
 */
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface AdminStatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accentColor: string;
  onPress?: () => void;
}

export function AdminStatCard({ label, value, icon: Icon, accentColor, onPress }: AdminStatCardProps) {
  const { i18n } = useTranslation();
  return (
    <MotionPressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.card, { borderColor: `${accentColor}24` }]}
      accessibilityRole={onPress ? "button" : undefined}
    >
      <View style={[styles.iconBox, { backgroundColor: accentColor + "18" }]}>
        <Icon size={21} color={accentColor} strokeWidth={2.1} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.value}>
          {typeof value === "number" ? value.toLocaleString(i18n.resolvedLanguage ?? i18n.language) : value}
        </Text>
        <Text numberOfLines={2} style={styles.label}>{label}</Text>
      </View>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "47%",
    backgroundColor: lightTokens.surfaceDefault,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    padding: 14,
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: lightTokens.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.045,
    shadowRadius: 8,
    elevation: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  value: { ...textStyles.headingMedium, color: lightTokens.textPrimary },
  label: { ...textStyles.caption, color: lightTokens.textTertiary },
});
