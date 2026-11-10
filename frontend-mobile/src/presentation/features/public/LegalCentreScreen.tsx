import { PublicHero } from "./PublicHero";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { PublicHeader } from "./PublicHeader";
import {
  publicPages,
  publicContact,
  publicLocale,
  publicPagePath,
} from "@/domain/public/public-content";
import { lightTokens, editorial, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export function LegalCentreScreen() {
  const { i18n } = useTranslation();
  const locale = publicLocale(i18n.language);
  const en = locale === "en";
  const categories = [
    { key: "terms", title: en ? "Using Vinnot" : "Usar Vinnot" },
    { key: "platform", title: en ? "Community and trust" : "Comunidad y confianza" },
    { key: "privacy", title: en ? "Privacy and controls" : "Privacidad y controles" },
  ];
  return (
    <View style={styles.screen}>
      <PublicHeader title={en ? "Legal and privacy" : "Legal y privacidad"} />
      <ScrollView contentContainerStyle={styles.content}>
        <PublicHero eyebrow={en ? "Clear rules, thoughtful choices" : "Reglas claras, decisiones propias"} title={en ? "Legal, privacy and trust" : "Legal, privacidad y confianza"} summary={en ? "Understand the service, your choices and the rules of our community." : "Conocé el servicio, tus opciones y las reglas de nuestra comunidad."} />
        {categories.map(category => <View key={category.key} style={styles.group}>
          <Text accessibilityRole="header" style={styles.heading}>{category.title}</Text>
          {publicPages.filter(page => page.category === category.key).map((page) => (
            <Link key={page.slug} href={publicPagePath(page.slug) as Href} style={styles.card}>
              <Text style={styles.link}>{page.title[locale]}</Text>
              {"\n\n"}
              <Text style={styles.body}>{page.summary[locale]}</Text>
            </Link>
          ))}
        </View>)}
        <View style={styles.card}>
          <Text style={styles.heading}>{en ? "Operator and contact" : "Titular y contacto"}</Text>
          <Text style={styles.body}>
            {publicContact.operator} · {publicContact.country}
          </Text>
          <Link href={`mailto:${publicContact.email}`} style={styles.link}>
            {publicContact.email}
          </Link>
        </View>
        <Link href="/help" style={styles.link}>
          {en ? "Help and FAQs" : "Ayuda y preguntas frecuentes"}
        </Link>
        <Link href="/contact" style={styles.link}>
          {en ? "Contact and reports" : "Contacto y reportes"}
        </Link>
        <Link href="/about" style={styles.link}>
          {en ? "About Vinnot" : "Acerca de Vinnot"}
        </Link>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: {
    padding: 24,
    paddingBottom: 48,
    gap: 20,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  title: { ...textStyles.headingLarge, color: lightTokens.textPrimary },
  heading: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  group: { gap: 16, borderTopWidth: 1, borderTopColor: lightTokens.borderDefault, paddingTop: 24, marginTop: 10 },
  body: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  link: { ...textStyles.bodyMedium, color: editorial.brand },
  card: {
    padding: 22,
    borderRadius: radii["2xl"],
    backgroundColor: lightTokens.surfaceDefault,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
  },
});
