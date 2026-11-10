import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { findPublicPage, publicLocale } from "@/domain/public/public-content";
import { PublicHeader } from "./PublicHeader";
import { PublicHero } from "./PublicHero";
import { textStyles } from "@/shared/theme/typography";
import { editorial, lightTokens, radii } from "@/shared/theme/tokens";

export function AboutScreen() {
  const { i18n } = useTranslation();
  const locale = publicLocale(i18n.language);
  const page = findPublicPage("about")!;
  const en = locale === "en";
  return <View style={styles.screen}>
    <PublicHeader title={page.title[locale]} />
    <ScrollView contentContainerStyle={styles.content}>
      <PublicHero image="winery" eyebrow={en ? "Every bottle, a conversation" : "Cada botella, una conversación"} title={page.title[locale]} summary={page.summary[locale]} />
      {page.sections.map((section, index) => <View key={section.id} style={styles.section}>
        <Text style={styles.number}>0{index + 1}</Text>
        <Text accessibilityRole="header" style={styles.title}>{section.title[locale]}</Text>
        <Text style={styles.body}>{section.body[locale]}</Text>
      </View>)}
      <View style={styles.footer}>
        <Text style={styles.title}>{en ? "Beyond the label" : "Más allá de la etiqueta"}</Text>
        <Link style={styles.link} href="/(app)/wine-routes">{en ? "Discover wine routes" : "Descubrir rutas del vino"}</Link>
        <Link style={styles.link} href="/contact">{en ? "Get in touch" : "Hablemos"}</Link>
      </View>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: { padding: 20, paddingBottom: 48, gap: 30, width: "100%", maxWidth: 760, alignSelf: "center" },
  section: { borderTopWidth: 1, borderTopColor: lightTokens.borderDefault, paddingTop: 24, gap: 16 },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  body: { ...textStyles.bodyMedium, color: lightTokens.textSecondary, lineHeight: 28 },
  number: { ...textStyles.caption, color: editorial.brand, letterSpacing: 2 },
  footer: { backgroundColor: lightTokens.surfacePaper, borderRadius: radii["3xl"], padding: 24, gap: 18 },
  link: { ...textStyles.bodyMedium, color: editorial.brand, paddingVertical: 8 },
});
