import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { vinnotColors as colors, vinnotFonts as fonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";
import { radii } from "@/shared/theme/tokens";
export function FormSection({
  title,
  summary,
  open,
  onToggle,
  children,
  invalid = false,
  disabled = false,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={[styles.card, invalid && styles.invalid]}>
      <Pressable
        onPress={onToggle}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled }}
        style={styles.header}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>{title}</Text>
          {!!summary && <Text style={styles.summary}>{summary}</Text>}
        </View>
        <Chevron size={20} color={colors.brand} />
      </Pressable>
      {open && <View style={styles.content}>{children}</View>}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  invalid: { borderColor: colors.danger },
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  heading: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.semibold, color: colors.ink, fontSize: fontSizes.md },
  summary: { fontFamily: fonts.regular, color: colors.muted, fontSize: fontSizes.xs, lineHeight: 18 },
  content: { padding: 16, paddingTop: 0, gap: 14 },
});
