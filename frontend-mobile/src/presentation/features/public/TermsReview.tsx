import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Check } from "lucide-react-native";
import type { useLegalAgreement } from "@/presentation/hooks/useLegalAgreement";
import { Button } from "@/presentation/components/ui/Button";
import { iconStrokes, lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles, fontFamilies } from "@/shared/theme/typography";

export function TermsReview({ agreement, expanded = false }: {
  agreement: ReturnType<typeof useLegalAgreement>; expanded?: boolean;
}) {
  const [open, setOpen] = useState(expanded);
  const { document, locale, checked, setChecked, error, loading, retry, sending } = agreement;
  const en = locale === "en";
  return <View style={styles.card}>
    {loading && <Text accessibilityLiveRegion="polite" style={styles.body}>{en ? "Loading the current terms…" : "Cargando los términos vigentes…"}</Text>}
    {error && <View style={styles.group}>
      <Text accessibilityRole="alert" style={styles.body}>{en ? "We couldn't confirm the agreement. Reload it before accepting. Your other information is preserved." : "No pudimos confirmar el acuerdo. Volvé a cargarlo antes de aceptar. El resto de tus datos se conserva."}</Text>
      <Button onPress={retry}>{en ? "Reload terms" : "Volver a cargar términos"}</Button>
    </View>}
    {document && <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.disclosure}>
        <Text style={styles.title}>{document.title} · {document.version}</Text>
        <Text style={styles.link}>{open ? (en ? "Hide text" : "Ocultar texto") : (en ? "Read the full text" : "Leer el texto completo")}</Text>
      </Pressable>
      {open && <View style={styles.group}>
        <Text style={styles.body}>{document.summary}</Text>
        {document.sections.map(section => <View key={section.id} style={styles.section}>
          <Text accessibilityRole="header" style={styles.title}>{section.title}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>)}
      </View>}
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled: sending || error }} disabled={sending || error}
        onPress={() => setChecked(!checked)} style={styles.choice}>
        <View style={[styles.box, checked && styles.checked]}>{checked && <Check size={16} color={lightTokens.textInverted} strokeWidth={iconStrokes.heavy} />}</View>
        <Text style={[styles.body, { flex: 1 }]}>{en ? "I accept the Vinnot Terms of Use, version " : "Acepto los Términos de Uso de Vinnot, versión "}{document.version}.</Text>
      </Pressable>
    </>}
    <Text style={styles.note}>{en ? "Consult our Privacy Policy to learn how we handle your data. Accepting terms does not enable optional cookies or marketing." : "Consultá la Política de Privacidad para conocer el tratamiento de tus datos. Aceptar los términos no activa cookies opcionales ni comunicaciones promocionales."}</Text>
    <Link href="/privacy" style={styles.link}>{en ? "Privacy policy" : "Política de privacidad"}</Link>
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: radii["2xl"], borderWidth: 1, borderColor: lightTokens.borderSoft, backgroundColor: lightTokens.surfaceDefault, gap: 18 },
  group: { gap: 20 },
  disclosure: { gap: 10, minHeight: 44 },
  section: { borderTopWidth: 1, borderTopColor: lightTokens.borderDefault, paddingTop: 18, gap: 10 },
  title: { ...textStyles.bodyMedium, color: lightTokens.textPrimary, fontFamily: fontFamilies.semibold },
  body: { ...textStyles.bodySmall, color: lightTokens.textSecondary, lineHeight: 24 },
  note: { ...textStyles.caption, color: lightTokens.textSecondary, lineHeight: 21 },
  link: { ...textStyles.bodySmall, color: lightTokens.brandPrimary, paddingVertical: 8 },
  choice: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderTopWidth: 1, borderTopColor: lightTokens.borderDefault, paddingTop: 18, minHeight: 48 },
  box: { borderWidth: 1, borderColor: lightTokens.brandPrimary, borderRadius: radii.sm, width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  checked: { backgroundColor: lightTokens.brandPrimary },
});
