import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/presentation/components/ui/Feedback";
import type { PushSettings, PushTypeSetting } from "@/domain/admin/pushAdministration";
import { lightTokens, radii, systemColors } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { notificationStyles } from "./notificationStyles";
import { Switch } from "@/presentation/components/ui/Switch";

/** One switch per push type; the change applies to the next delivery, with no deploy. */
export function PushTypeSwitches({
  settings,
  sending,
  switching,
  typeLabel,
  onToggle,
}: {
  settings: PushSettings;
  sending: boolean;
  switching: string | null;
  typeLabel: (type: string) => string;
  onToggle: (setting: PushTypeSetting) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  return (
    <View style={styles.content}>
      <View accessibilityRole="summary" style={[styles.provider, sending ? styles.providerOn : styles.providerOff]}>
        <Text style={[styles.providerTitle, { color: sending ? systemColors.successText : systemColors.warningText }]}>
          {t("admin.notifications.push.provider", { provider: settings.provider })}
        </Text>
        <Text style={[notificationStyles.help, { color: sending ? systemColors.successText : systemColors.warningText }]}>
          {t(sending ? "admin.notifications.push.providerOn" : "admin.notifications.push.providerOff")}
        </Text>
      </View>
      <View style={styles.list}>
        {settings.types.map((setting, index) => {
          const label = typeLabel(setting.type);
          return (
            <View key={setting.type} style={[styles.row, index > 0 && styles.divider]}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{label}</Text>
                <Text style={notificationStyles.help}>
                  {t(setting.transactional ? "admin.notifications.push.transactional" : "admin.notifications.push.optional")}
                </Text>
              </View>
              {switching === setting.type && <Spinner size="sm" />}
              <Switch
                accessibilityLabel={label}
                value={setting.enabled}
                disabled={switching !== null}
                onValueChange={() => onToggle(setting)}
              />
            </View>
          );
        })}
      </View>
      {settings.recentChanges.length > 0 && (
        <View style={styles.changes}>
          <Text style={styles.changesTitle}>{t("admin.notifications.push.recentChanges")}</Text>
          {settings.recentChanges.map((change) => (
            <Text key={`${change.type}-${change.changedAt}`} style={notificationStyles.help}>
              {t(change.enabled ? "admin.notifications.push.changeOn" : "admin.notifications.push.changeOff", {
                type: typeLabel(change.type),
                by: change.changedBy,
                date: new Date(change.changedAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }),
              })}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  provider: { borderRadius: radii.lg, padding: 14, gap: 4 },
  providerOn: { backgroundColor: systemColors.successLight },
  providerOff: { backgroundColor: systemColors.warningLight },
  providerTitle: { ...textStyles.titleSmall },
  list: { borderWidth: 1, borderColor: lightTokens.borderDefault, borderRadius: radii.lg },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: lightTokens.borderDefault },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...textStyles.labelMedium, color: lightTokens.textPrimary },
  changes: { gap: 6 },
  changesTitle: { ...textStyles.overline, color: lightTokens.textTertiary },
});
