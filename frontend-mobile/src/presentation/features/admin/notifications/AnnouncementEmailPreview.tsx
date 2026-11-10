import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { AnnouncementKind, AnnouncementLanguage } from "@/domain/admin/announcement";
import type { AnnouncementBlock } from "@/domain/admin/announcementBody";
import { editorial, lightTokens, radii } from "@/shared/theme/tokens";
import { fontFamilies, textStyles } from "@/shared/theme/typography";

const LOCALES: Record<AnnouncementLanguage, string> = { es: "es-AR", en: "en-US" };

/**
 * The branded email drawn with native views (#490), laid out like the backend's `branded-message.html`: brand,
 * banner, the subject as title, the greeting, the body blocks, and the footer of its kind. Its copy follows the
 * previewed language, not the app's. Links are shown, never followed: this is a preview.
 */
export function AnnouncementEmailPreview({
  kind,
  language,
  subject,
  greeting,
  blocks,
}: {
  kind: AnnouncementKind;
  language: AnnouncementLanguage;
  subject: string;
  greeting: string;
  blocks: AnnouncementBlock[];
}) {
  const { t } = useTranslation();
  const lng = LOCALES[language];
  const copy = (key: string) => t(`admin.notifications.email.${key}`, { lng });
  return (
    <View accessibilityLabel={t("admin.notifications.preview.emailRendered")} style={styles.email}>
      <View style={styles.brand}>
        <Text style={styles.wordmark}>Vinnot</Text>
      </View>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>{copy("banner")}</Text>
      </View>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          {subject}
        </Text>
        {!!greeting && <Text style={styles.paragraph}>{greeting}</Text>}
        {blocks.map((block, index) => {
          if (block.type === "heading") {
            return (
              <Text key={index} accessibilityRole="header" style={styles.heading}>
                {block.text}
              </Text>
            );
          }
          if (block.type === "button") {
            return (
              <View key={index} style={styles.action}>
                <View style={styles.button}>
                  <Text style={styles.buttonText}>{block.label}</Text>
                </View>
                <Text style={styles.fallback}>{copy("buttonFallback")}</Text>
                <Text style={styles.fallbackUrl}>{block.url}</Text>
              </View>
            );
          }
          return (
            <Text key={index} style={styles.paragraph}>
              {block.spans.map((span, spanIndex) =>
                span.type === "link" ? (
                  <Text key={spanIndex} style={styles.link}>
                    {span.text}
                  </Text>
                ) : span.bold ? (
                  <Text key={spanIndex} style={styles.bold}>
                    {span.text}
                  </Text>
                ) : (
                  span.text
                ),
              )}
            </Text>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerLinks}>
          {[copy("visit"), copy("contact"), copy("privacy")].join("  ·  ")}
        </Text>
        <Text style={styles.footerText}>{copy(kind === "NEWS" ? "promotionalFooter" : "serviceFooter")}</Text>
        {kind === "NEWS" && <Text style={[styles.footerText, styles.link]}>{copy("unsubscribe")}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  email: {
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: lightTokens.surfacePaper,
  },
  brand: { alignItems: "center", paddingVertical: 14 },
  wordmark: { ...textStyles.titleLarge, fontFamily: fontFamilies.bold, color: editorial.brand },
  banner: { backgroundColor: editorial.brandDeep, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center" },
  bannerText: { ...textStyles.overline, color: lightTokens.textInverted, letterSpacing: 3, textAlign: "center" },
  body: { backgroundColor: lightTokens.surfaceDefault, padding: 18, gap: 14 },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  heading: { ...textStyles.titleLarge, color: lightTokens.textPrimary },
  paragraph: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  bold: { fontFamily: fontFamilies.semibold, color: lightTokens.textPrimary },
  link: { color: lightTokens.textBrand, textDecorationLine: "underline" },
  action: { gap: 6, marginVertical: 4 },
  button: {
    alignSelf: "flex-start",
    backgroundColor: lightTokens.brandPrimary,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonText: { ...textStyles.button, color: lightTokens.textInverted },
  fallback: { ...textStyles.caption, color: lightTokens.textSecondary },
  fallbackUrl: { ...textStyles.caption, color: lightTokens.textBrand },
  footer: { padding: 16, gap: 6, alignItems: "center" },
  footerLinks: { ...textStyles.caption, color: lightTokens.textBrand, textAlign: "center" },
  footerText: { ...textStyles.caption, color: lightTokens.textTertiary, textAlign: "center" },
});
