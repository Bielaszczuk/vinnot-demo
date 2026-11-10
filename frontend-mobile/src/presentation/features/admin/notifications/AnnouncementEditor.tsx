import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Bold, Heading2, Link2, MousePointerClick, type LucideIcon } from "lucide-react-native";
import { TextField } from "@/presentation/components/ui/TextField";
import {
  ANNOUNCEMENT_LANGUAGES,
  MAX_ANNOUNCEMENT_BODY_LENGTH,
  MAX_ANNOUNCEMENT_TITLE_LENGTH,
  type AnnouncementLanguage,
  type AnnouncementVersion,
} from "@/domain/admin/announcement";
import { ANNOUNCEMENT_FORMATS, type AnnouncementFormat } from "@/domain/admin/announcementFormat";
import { lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { NotificationSegmented } from "./NotificationSegmented";
import { notificationStyles } from "./notificationStyles";
import type { TextSelection } from "./useAnnouncementComposerViewModel";

const FORMAT_ICONS: Record<AnnouncementFormat, LucideIcon> = {
  heading: Heading2,
  bold: Bold,
  link: Link2,
  button: MousePointerClick,
};

/** Title and formatted body of one language, with a toolbar that writes the format for the author. */
export function AnnouncementEditor({
  language,
  written,
  version,
  disabled,
  bodySelection,
  onLanguageChange,
  onTitleChange,
  onBodyChange,
  onBodySelectionChange,
  onFormat,
}: {
  language: AnnouncementLanguage;
  written: AnnouncementLanguage[];
  version: AnnouncementVersion;
  disabled: boolean;
  bodySelection: TextSelection | undefined;
  onLanguageChange: (language: AnnouncementLanguage) => void;
  onTitleChange: (title: string) => void;
  onBodyChange: (body: string) => void;
  onBodySelectionChange: (selection: TextSelection) => void;
  onFormat: (format: AnnouncementFormat) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={notificationStyles.card}>
      <Text style={notificationStyles.heading}>{t("admin.notifications.composer.contentLabel")}</Text>
      <NotificationSegmented
        accessibilityLabel={t("admin.notifications.composer.languageLabel")}
        value={language}
        onChange={onLanguageChange}
        options={ANNOUNCEMENT_LANGUAGES.map((code) => ({
          value: code,
          label: t(`admin.notifications.languages.${code}`),
          marked: written.includes(code),
          markedLabel: t("admin.notifications.composer.written"),
        }))}
      />
      <Text style={notificationStyles.help}>{t("admin.notifications.composer.languageHelp")}</Text>

      <TextField
        label={t("admin.notifications.composer.title")}
        value={version.title}
        maxLength={MAX_ANNOUNCEMENT_TITLE_LENGTH}
        editable={!disabled}
        onChangeText={onTitleChange}
        placeholder={t("admin.notifications.composer.titlePlaceholder")}
        hint={`${version.title.length}/${MAX_ANNOUNCEMENT_TITLE_LENGTH}`}
      />

      <View style={notificationStyles.field}>
        <Text style={notificationStyles.label}>{t("admin.notifications.composer.body")}</Text>
        <View accessibilityRole="toolbar" accessibilityLabel={t("admin.notifications.composer.toolbar")} style={styles.toolbar}>
          {ANNOUNCEMENT_FORMATS.map((format) => {
            const Icon = FORMAT_ICONS[format];
            const label = t(`admin.notifications.composer.formats.${format}`);
            return (
              <Pressable
                key={format}
                accessibilityRole="button"
                accessibilityLabel={label}
                disabled={disabled}
                onPress={() => onFormat(format)}
                style={[styles.tool, disabled && styles.disabled]}
              >
                <Icon size={16} color={wine[700]} />
                <Text style={styles.toolText}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextField
          accessibilityLabel={t("admin.notifications.composer.body")}
          value={version.body}
          maxLength={MAX_ANNOUNCEMENT_BODY_LENGTH}
          editable={!disabled}
          multiline
          textAlignVertical="top"
          selection={bodySelection}
          onSelectionChange={(event) => onBodySelectionChange(event.nativeEvent.selection)}
          onChangeText={onBodyChange}
          placeholder={t("admin.notifications.composer.bodyPlaceholder")}
          style={styles.body}
          hint={`${t("admin.notifications.composer.formatHelp")} · ${version.body.length}/${MAX_ANNOUNCEMENT_BODY_LENGTH}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tool: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  toolText: { ...textStyles.labelSmall, color: lightTokens.textPrimary },
  disabled: { opacity: 0.6 },
  body: { minHeight: 180, paddingTop: 12 },
});
