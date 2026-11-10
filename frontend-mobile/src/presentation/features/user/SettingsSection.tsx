/**
 * SettingsSection — grouped profile actions.
 */
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { lightTokens, radii, wine, iconStrokes } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export interface SettingsAction {
  key: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  danger?: boolean;
  onPress: () => void;
}

interface SettingsSectionProps {
  title?: string;
  actions: SettingsAction[];
}

export function SettingsSection({ title, actions }: SettingsSectionProps) {
  return (
    <View style={styles.wrap}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.card}>
        {actions.map((action, index) => (
          <MotionPressable
            key={action.key}
            accessibilityRole="button"
            onPress={action.onPress}
            style={[styles.item, index === actions.length - 1 && styles.lastItem]}
          >
            {!!action.icon && <View style={styles.icon}>{action.icon}</View>}
            <View style={styles.text}>
              <Text style={[styles.label, action.danger && styles.danger]}>{action.label}</Text>
              {!!action.description && <Text style={styles.description}>{action.description}</Text>}
            </View>
            <View style={styles.chevron}>
              <ChevronRight size={17} color={wine[700]} strokeWidth={iconStrokes.strong} />
            </View>
          </MotionPressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { ...textStyles.overline, color: lightTokens.textTertiary },
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.lg,
    backgroundColor: lightTokens.surfaceDefault,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: lightTokens.borderDefault,
  },
  lastItem: { borderBottomWidth: 0 },
  icon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: wine[50],
    borderWidth: 1,
    borderColor: wine[100],
  },
  text: { flex: 1 },
  label: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  danger: { color: lightTokens.danger },
  description: { ...textStyles.caption, color: lightTokens.textTertiary, marginTop: 2 },
  chevron: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    backgroundColor: wine[50],
  },
});
