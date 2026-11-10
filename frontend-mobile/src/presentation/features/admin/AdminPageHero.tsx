/** Compact, reusable header for administrative screens. */
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  Bell,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Plus,
  ShieldAlert,
  Users,
  Wine,
  type LucideIcon,
} from "lucide-react-native";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { adminSectionAccent, lightTokens, radii, wine, type AdminSection } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface AdminPageHeroProps {
  title: string;
  subtitle?: string;
  /** The admin section; picks its documented accent from `adminSectionAccent`. */
  section?: AdminSection;
  /** Hero mark icon; defaults to the section icon, the same one the dashboard uses. */
  icon?: LucideIcon;
  onNew?: () => void;
  newLabel?: string;
}

const sectionIcon: Record<AdminSection, LucideIcon> = {
  dashboard: LayoutDashboard,
  wines: Wine,
  wineries: BookOpen,
  routes: MapPin,
  events: CalendarDays,
  users: Users,
  reviews: MessageSquare,
  community: ShieldAlert,
  notifications: Bell,
  submissions: ShieldAlert,
};

export function AdminPageHero({
  title,
  subtitle,
  section,
  icon,
  onNew,
  newLabel,
}: AdminPageHeroProps) {
  const { t } = useTranslation();
  const accentColor = section ? adminSectionAccent[section] : wine[700];
  const Icon = icon ?? (section ? sectionIcon[section] : LayoutDashboard);

  return (
    <View style={[styles.hero, { borderColor: `${accentColor}24` }]}>
      <View style={[styles.accentLarge, { backgroundColor: `${accentColor}0D` }]} />
      <View style={[styles.accentSmall, { backgroundColor: `${accentColor}12` }]} />
      <View style={[styles.iconMark, { backgroundColor: `${accentColor}16` }]}>
        <Icon size={20} color={accentColor} strokeWidth={2.2} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {onNew && (
        <MotionPressable
          onPress={onNew}
          style={[styles.btn, { backgroundColor: accentColor }]}
          accessibilityRole="button"
          accessibilityLabel={newLabel ?? t("common.new")}
        >
          <Plus size={16} color={lightTokens.textInverted} strokeWidth={2.4} />
          <Text style={styles.btnText}>{newLabel ?? t("common.new")}</Text>
        </MotionPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radii["2xl"],
    padding: 18,
    flexDirection: "row",
    // The action drops to its own line when the title needs the room, instead of breaking a word.
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    backgroundColor: wine[50],
    borderWidth: 1,
  },
  accentLarge: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -62,
    top: -92,
  },
  accentSmall: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    left: -34,
    bottom: -45,
  },
  iconMark: {
    width: 40,
    height: 40,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, minWidth: 180, gap: 3 },
  title: { ...textStyles.headingMedium, color: lightTokens.textPrimary, letterSpacing: 0 },
  subtitle: { ...textStyles.bodySmall, color: lightTokens.textTertiary, lineHeight: 18 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnText: { ...textStyles.labelLarge, color: lightTokens.textInverted },
});
