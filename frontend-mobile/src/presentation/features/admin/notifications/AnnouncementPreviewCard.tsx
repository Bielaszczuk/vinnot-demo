import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/presentation/components/ui/Feedback";
import type { AnnouncementKind, AnnouncementLanguage, AnnouncementPreview } from "@/domain/admin/announcement";
import { emailGreeting, parseAnnouncementBody } from "@/domain/admin/announcementBody";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles, fontFamilies } from "@/shared/theme/typography";
import { AnnouncementEmailPreview } from "./AnnouncementEmailPreview";
import { notificationStyles } from "./notificationStyles";

/**
 * The push as a phone shows it and the email drawn natively from the body (#490), with the backend's subject and
 * greeting; the plain-text part of the email stays one tap away. The app has no web view for the HTML email.
 */
export function AnnouncementPreviewCard({
  kind,
  language,
  body,
  preview,
  loading,
  failed,
  ready,
}: {
  kind: AnnouncementKind;
  language: AnnouncementLanguage;
  /** The body the preview was rendered from. */
  body: string;
  preview: AnnouncementPreview | undefined;
  loading: boolean;
  failed: boolean;
  /** False until the current language has a valid title and body. */
  ready: boolean;
}) {
  const { t } = useTranslation();
  const [plainText, setPlainText] = useState(false);
  const parsed = useMemo(() => parseAnnouncementBody(body), [body]);
  const showFailure = failed && ready && !loading;
  return (
    <View style={notificationStyles.card}>
      <View style={styles.header}>
        <Text style={notificationStyles.heading}>
          {t("admin.notifications.preview.titleFor", { language: t(`admin.notifications.languages.${language}`) })}
        </Text>
        {loading && ready && !!preview && <Spinner size="sm" />}
      </View>
      {!ready || !preview || showFailure ? (
        <View style={styles.empty}>
          {loading ? (
            <Spinner />
          ) : (
            <Text style={styles.emptyText}>
              {t(showFailure ? "admin.notifications.preview.failed" : "admin.notifications.preview.empty")}
            </Text>
          )}
        </View>
      ) : (
        <>
          <Text style={styles.section}>{t("admin.notifications.preview.push")}</Text>
          <View style={styles.push}>
            <Text style={styles.pushApp}>Vinnot</Text>
            <Text numberOfLines={1} style={styles.pushTitle}>
              {preview.pushTitle}
            </Text>
            <Text numberOfLines={2} style={styles.pushBody}>
              {preview.pushBody}
            </Text>
          </View>
          <Text style={styles.section}>{t("admin.notifications.preview.email")}</Text>
          <Text style={styles.subject}>
            <Text style={styles.subjectLabel}>{t("admin.notifications.preview.subject")}: </Text>
            {preview.subject}
          </Text>
          {parsed.ok && (
            <AnnouncementEmailPreview
              kind={kind}
              language={language}
              subject={preview.subject}
              greeting={emailGreeting(preview.text)}
              blocks={parsed.blocks}
            />
          )}
          {parsed.ok && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: plainText }}
              onPress={() => setPlainText((open) => !open)}
              style={styles.toggle}
            >
              <Text style={styles.toggleText}>
                {t(plainText ? "admin.notifications.preview.hidePlainText" : "admin.notifications.preview.showPlainText")}
              </Text>
              {plainText ? (
                <ChevronUp size={16} color={lightTokens.textBrand} />
              ) : (
                <ChevronDown size={16} color={lightTokens.textBrand} />
              )}
            </Pressable>
          )}
          {(plainText || !parsed.ok) && (
            <View style={styles.email} accessibilityLabel={t("admin.notifications.preview.emailText")}>
              <Text selectable style={styles.emailText}>
                {preview.text}
              </Text>
            </View>
          )}
          <Text style={notificationStyles.help}>{t("admin.notifications.preview.renderedNote")}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  empty: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: lightTokens.borderStrong,
    borderRadius: radii.lg,
    padding: 16,
  },
  emptyText: { ...textStyles.bodySmall, color: lightTokens.textTertiary, textAlign: "center" },
  section: { ...textStyles.overline, color: lightTokens.textTertiary },
  push: { backgroundColor: lightTokens.bgInverted, borderRadius: radii.xl, padding: 14, gap: 2 },
  pushApp: { ...textStyles.caption, color: lightTokens.textInverted, opacity: 0.6 },
  pushTitle: { ...textStyles.titleSmall, color: lightTokens.textInverted },
  pushBody: { ...textStyles.bodySmall, color: lightTokens.textInverted, opacity: 0.8 },
  subject: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
  subjectLabel: { fontFamily: fontFamilies.semibold, color: lightTokens.textPrimary },
  toggle: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, minHeight: 44 },
  toggleText: { ...textStyles.labelMedium, color: lightTokens.textBrand },
  email: {
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.lg,
    padding: 14,
    backgroundColor: lightTokens.bgSubtle,
  },
  emailText: { ...textStyles.bodySmall, color: lightTokens.textPrimary },
});
