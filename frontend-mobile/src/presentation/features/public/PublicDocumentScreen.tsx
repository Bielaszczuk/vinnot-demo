import { usePublicDocument } from "@/presentation/hooks/usePublicDocument";
import { PublicHero } from "./PublicHero";
import { useRef, useState } from "react";
import { StyleSheet, Text, View, Pressable, type ScrollViewInstance } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { PublicHeader } from "./PublicHeader";
import { TextField } from "@/presentation/components/ui/TextField";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";
import { publicLocale, searchPublicSections } from "@/domain/public/public-content";
import { ServiceStateScreen } from "./ServiceStateScreen";
import { lightTokens, editorial, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export function PublicDocumentScreen({ slug }: { slug: string }) {
  const { i18n } = useTranslation();
  const locale = publicLocale(i18n.language);
  const { page, version, termsUnconfirmed, retry } = usePublicDocument(slug);
  const [query, setQuery] = useState("");
  const scroll = useRef<ScrollViewInstance>(null);
  const positions = useRef<Record<string, number>>({});
  if (!page) return <ServiceStateScreen kind="notFound" />;
  const sections = searchPublicSections(page, query, locale);
  return (
    <View style={styles.screen}>
      <PublicHeader title={page.title[locale]} />
      <KeyboardAwareScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <PublicHero
          eyebrow={locale === "es" ? "Información y confianza" : "Information and trust"}
          title={page.title[locale]}
          summary={page.summary[locale]}
          image={page.image === "privacy" ? "privacy" : "legal"}
        >
          <Text style={styles.indexTitle}>
            {locale === "es" ? "Versión" : "Version"}: {version}
          </Text>
        </PublicHero>
        {termsUnconfirmed && (
          <View style={styles.index}>
            <Text style={styles.body}>
              {locale === "es"
                ? "Copia informativa. Para aceptar se verifica la versión vigente con el servidor."
                : "Informational copy. Acceptance requires verification of the current version with the server."}
            </Text>
            <Pressable accessibilityRole="button" onPress={retry} style={styles.indexLink}>
              <Text style={styles.link}>{locale === "es" ? "Actualizar" : "Refresh"}</Text>
            </Pressable>
          </View>
        )}
        {slug === "help" && (
          <TextField
            label={locale === "es" ? "Buscar en ayuda" : "Search help"}
            value={query}
            onChangeText={setQuery}
          />
        )}
        <View style={styles.index}>
          <Text accessibilityRole="header" style={styles.contentsTitle}>
            {locale === "es" ? "En esta página" : "On this page"}
          </Text>
          {sections.map((section) => (
            <Pressable
              accessibilityRole="button"
              key={section.id}
              onPress={() =>
                scroll.current?.scrollTo({ y: positions.current[section.id] ?? 0, animated: false })
              }
              style={styles.indexLink}
            >
              <Text style={styles.link}>{section.title[locale]}</Text>
            </Pressable>
          ))}
        </View>
        {sections.map((section, index) => (
          <View
            key={section.id}
            style={styles.section}
            onLayout={(event) => {
              positions.current[section.id] = event.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.indexTitle}>{String(index + 1).padStart(2, "0")}</Text>
            <Text accessibilityRole="header" style={styles.heading}>
              {section.title[locale]}
            </Text>
            <Text style={styles.body}>{section.body[locale]}</Text>
          </View>
        ))}
        {sections.length === 0 && (
          <Text style={styles.body}>
            {locale === "es"
              ? "No encontramos respuestas. Probá otra búsqueda o contactanos."
              : "No answers found. Try another search or contact us."}
          </Text>
        )}
        <Link href="/contact" style={styles.link}>
          {locale === "es" ? "Contactar a Vinnot" : "Contact Vinnot"}
        </Link>
        <Link href="/legal" style={styles.link}>
          {locale === "es" ? "Centro legal" : "Legal centre"}
        </Link>
      </KeyboardAwareScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 20,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  hero: { gap: 14 },
  title: { ...textStyles.headingLarge, color: lightTokens.textPrimary },
  summary: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  index: { padding: 18, borderRadius: radii["2xl"], backgroundColor: lightTokens.bgMuted },
  contentsTitle: { ...textStyles.headingSmall, color: lightTokens.textPrimary, marginBottom: 12 },
  indexTitle: { ...textStyles.caption, color: editorial.brand },
  indexLink: { paddingVertical: 12, minHeight: 48, justifyContent: "center" },
  link: { ...textStyles.bodySmall, color: editorial.brand, textDecorationLine: "underline" },
  section: {
    padding: 22,
    borderTopWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
    gap: 14,
  },
  heading: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  body: { ...textStyles.bodyMedium, color: lightTokens.textSecondary, lineHeight: 27 },
});
