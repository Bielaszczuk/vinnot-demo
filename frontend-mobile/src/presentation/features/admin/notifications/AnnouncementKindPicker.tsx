import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ANNOUNCEMENT_KINDS, type AnnouncementKind } from "@/domain/admin/announcement";
import { editorial, lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { notificationStyles } from "./notificationStyles";

/** One tap picks news (promotional, consent only) or a service notice (every active account). */
export function AnnouncementKindPicker({
  value,
  disabled,
  onChange,
}: {
  value: AnnouncementKind;
  disabled: boolean;
  onChange: (kind: AnnouncementKind) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={notificationStyles.card} accessibilityRole="radiogroup">
      <Text style={notificationStyles.heading}>{t("admin.notifications.composer.kindLabel")}</Text>
      {ANNOUNCEMENT_KINDS.map((kind) => {
        const selected = value === kind;
        return (
          <Pressable
            key={kind}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(kind)}
            style={[styles.option, selected && styles.selected, disabled && styles.disabled]}
          >
            <Text style={styles.title}>{t(`admin.notifications.kinds.${kind}.title`)}</Text>
            <Text style={styles.description}>{t(`admin.notifications.kinds.${kind}.description`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.lg,
    padding: 14,
    gap: 4,
  },
  selected: { borderColor: editorial.brand, backgroundColor: wine[50] },
  disabled: { opacity: 0.6 },
  title: { ...textStyles.titleSmall, color: lightTokens.textPrimary },
  description: { ...textStyles.caption, color: lightTokens.textSecondary },
});
