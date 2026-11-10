import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useLegalAgreement } from "@/presentation/hooks/useLegalAgreement";
import { TermsReview } from "./TermsReview";
import { PublicHeader } from "./PublicHeader";
import { Button } from "@/presentation/components/ui/Button";
import { IllustratedState } from "@/presentation/components/ui/IllustratedState";
import { lightTokens, editorial } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export function TermsGate({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isInitializing, logout } = useAuth();
  const agreement = useLegalAgreement("account", user?.id, isAuthenticated && !isInitializing);
  const [exitFailed, setExitFailed] = useState(false);
  if (!isAuthenticated || isInitializing) return <>{children}</>;
  const en = agreement.locale === "en";
  if (agreement.loading) return <View style={styles.waiting} accessibilityState={{ busy: true }}>
    <Text accessibilityLiveRegion="polite" style={styles.body}>{en ? "Checking your account…" : "Verificando tu cuenta…"}</Text>
  </View>;
  if (!agreement.required && !agreement.error) return <>{children}</>;
  const requiresConsent = agreement.required && !!agreement.document;
  const signOut = <Button variant="ghost" disabled={agreement.sending} onPress={() => { void logout().catch(() => setExitFailed(true)); }}>{en ? "Not now · sign out" : "Ahora no · cerrar sesión"}</Button>;
  const exitError = exitFailed && <Text accessibilityRole="alert" style={styles.body}>{en ? "Please try signing out again." : "Volvé a intentar cerrar sesión."}</Text>;
  // Without a connection the agreement cannot be checked; say so plainly instead of blaming the agreement.
  if (agreement.offline) return <View style={styles.screen}>
    <ScrollView contentContainerStyle={[styles.content, styles.centered]}>
      <IllustratedState kind="offline">
        <Button onPress={agreement.retry}>{en ? "Try again" : "Reintentar"}</Button>
        {signOut}
        {exitError}
      </IllustratedState>
    </ScrollView>
  </View>;
  return <View style={styles.screen}>
    <PublicHeader title={en ? "Your agreement" : "Tu acuerdo"} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>{requiresConsent
        ? (en ? "Before we continue" : "Antes de continuar")
        : (en ? "We couldn't verify your agreement" : "No pudimos verificar tu acuerdo")}</Text>
      {requiresConsent && <Text style={styles.body}>{en ? "Review the current terms. Your choice is saved to your account, across devices." : "Revisá los términos vigentes. Tu decisión se guarda en tu cuenta, para todos tus dispositivos."}</Text>}
      <TermsReview agreement={requiresConsent ? agreement : { ...agreement, document: undefined }} />
      {requiresConsent && <Button disabled={!agreement.selection || agreement.error} loading={agreement.sending} onPress={() => void agreement.accept()}>{en ? "Accept and continue" : "Aceptar y continuar"}</Button>}
      {signOut}
      {exitError}
      <Link href="/legal" style={styles.link}>{en ? "Legal information" : "Información legal"}</Link>
      <Link href="/contact" style={styles.link}>{en ? "Contact and privacy requests" : "Contacto y solicitudes de privacidad"}</Link>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  waiting: { flex: 1, backgroundColor: lightTokens.bgBase, alignItems: "center", justifyContent: "center", padding: 20 },
  content: { padding: 20, paddingBottom: 50, gap: 22, maxWidth: 760, width: "100%", alignSelf: "center" },
  centered: { flexGrow: 1, justifyContent: "center" },
  title: { ...textStyles.headingLarge, color: lightTokens.textPrimary },
  body: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  link: { ...textStyles.bodySmall, color: editorial.brand, paddingVertical: 10 },
});
