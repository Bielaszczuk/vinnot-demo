import { useSupportReference } from "@/presentation/hooks/useSupportReference";
import { useAuth } from "@/presentation/hooks/useAuth";
import { PublicHero } from "./PublicHero";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSupportForm } from "@/presentation/hooks/useSupportForm";
import { PublicHeader } from "./PublicHeader";
import { TextField } from "@/presentation/components/ui/TextField";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";
import { Button } from "@/presentation/components/ui/Button";
import { lightTokens, editorial, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { publicContact } from "@/domain/public/public-content";

export function ContactScreen() {
  const { user } = useAuth();
  return (
    <ContactForm
      key={user?.id ?? "guest"}
      identity={user ? { email: user.email, name: user.name } : undefined}
    />
  );
}
function ContactForm({ identity }: { identity?: { email: string; name: string } }) {
  const { i18n } = useTranslation();
  const en = i18n.language.startsWith("en");
  const { form, setForm, sending, receipt, error, retryBlocked, submit } = useSupportForm(identity, en ? "en" : "es");
  const { reference, copy, copyState } = useSupportReference(receipt);
  const topics = ["support", "privacy", "report", "appeal", "partnership", "general"];
  const labels = en
    ? ["Support", "Privacy", "Report", "Review a decision", "Partnership", "General"]
    : ["Soporte", "Privacidad", "Reportar", "Revisar una decisión", "Colaboración", "General"];
  return (
    <View style={styles.screen}>
      <PublicHeader title={en ? "Contact" : "Contacto"} />
      <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <PublicHero
          image="winery"
          eyebrow={en ? "A direct line to Vinnot" : "Tu espacio en Vinnot"}
          title={en ? "Let's talk" : "Hablemos"}
          summary={
            en
              ? "A question, an idea or something we can do better. We're here to listen."
              : "Una consulta, una idea o algo que podemos hacer mejor. Queremos escucharte."
          }
        />
        <Text style={styles.body}>
          {en
            ? "Tell us how we can help. Never include passwords, payment details or verification codes."
            : "Contanos cómo podemos ayudarte. No incluyas contraseñas, datos de pagos ni códigos de verificación."}
        </Text>
        <Link href="/help" style={styles.link}>
          {en ? "Frequently asked questions" : "Preguntas frecuentes"}
        </Link>
        <Link href={`mailto:${publicContact.email}`} style={styles.link}>
          {publicContact.email}
        </Link>
        <TextField
          label={en ? "Name" : "Nombre"}
          value={form.name}
          maxLength={100}
          editable={!sending}
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
        />
        <TextField
          label={en ? "Email" : "Correo"}
          value={form.email}
          maxLength={254}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!sending && !identity}
          onChangeText={(email) => setForm((current) => ({ ...current, email }))}
        />
        {identity && (
          <Text style={styles.body}>
            {en
              ? "We'll reply to the email linked to your account."
              : "Te responderemos al correo asociado a tu cuenta."}
          </Text>
        )}
        <View style={styles.rule} />
        <Text style={styles.label}>{en ? "Topic" : "Tema"}</Text>
        <View style={styles.topics}>
          {topics.map((subject, index) => (
            <Pressable
              key={subject}
              accessibilityRole="radio"
              accessibilityState={{ checked: form.subject === subject, disabled: sending }}
              disabled={sending}
              onPress={() => setForm((current) => ({ ...current, subject }))}
              style={[styles.topic, form.subject === subject && styles.selected]}
            >
              <Text style={styles.link}>{labels[index]}</Text>
            </Pressable>
          ))}
        </View>
        <TextField
          label={en ? "Message" : "Mensaje"}
          multiline
          numberOfLines={6}
          style={{ minHeight: 144, textAlignVertical: "top" }}
          maxLength={4000}
          value={form.message}
          editable={!sending}
          onChangeText={(message) => setForm((current) => ({ ...current, message }))}
        />
        <Text style={styles.body}>
          {en
            ? "Your contact details and message are used to handle this request."
            : "Tus datos de contacto y mensaje se utilizan para atender esta consulta."}
        </Text>
        <Link href="/privacy" style={styles.link}>
          {en ? "Privacy policy" : "Política de privacidad"}
        </Link>
        {error && (
          <Text accessibilityRole="alert" style={styles.notice}>
            {error === "invalid"
              ? en
                ? "Check the required fields and email."
                : "Revisá los campos obligatorios y el correo."
              : en
                ? "We couldn't confirm receipt. Your message is still here; you can retry."
                : "No pudimos confirmar la recepción. Conservamos tu mensaje para que puedas reintentar."}
          </Text>
        )}
        {retryBlocked && (
          <Text accessibilityLiveRegion="polite" style={styles.notice}>
            {en
              ? "Please wait before retrying, as requested by the service."
              : "Esperá antes de reintentar, según el plazo indicado por el servicio."}
          </Text>
        )}
        {receipt && (
          <View style={styles.notice}>
            <Text accessibilityLiveRegion="polite" style={styles.body}>
              {en ? "Request received. Reference:" : "Consulta recibida. Referencia:"}
            </Text>
            <Text selectable style={styles.reference}>
              {reference}
            </Text>
            <Button variant="ghost" onPress={() => void copy()}>
              {copyState === "copied"
                ? en
                  ? "Copied"
                  : "Copiado"
                : en
                  ? "Copy reference"
                  : "Copiar referencia"}
            </Button>
            {copyState === "failed" && (
              <Text accessibilityRole="alert" style={styles.body}>
                {en
                  ? "Couldn't copy. Select the reference to copy it manually."
                  : "No pudimos copiar. Seleccioná la referencia para copiarla manualmente."}
              </Text>
            )}
          </View>
        )}
        <Button disabled={retryBlocked} loading={sending} onPress={() => void submit()}>
          {en ? "Send enquiry" : "Enviar consulta"}
        </Button>
      </KeyboardAwareScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  rule: { height: 1, backgroundColor: lightTokens.borderDefault, marginVertical: 6 },
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: {
    padding: 24,
    paddingBottom: 48,
    gap: 20,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
  },
  title: { ...textStyles.headingLarge, color: lightTokens.textPrimary },
  body: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  label: { ...textStyles.bodySmall, color: lightTokens.textPrimary },
  link: { ...textStyles.bodySmall, color: editorial.brand },
  topics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topic: {
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii["2xl"],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selected: { backgroundColor: lightTokens.brandTint, borderColor: lightTokens.brandPrimary },
  reference: { ...textStyles.labelMedium, color: editorial.brand, marginVertical: 12 },
  notice: {
    ...textStyles.bodySmall,
    color: editorial.brand,
    backgroundColor: lightTokens.bgMuted,
    padding: 16,
    borderRadius: radii.xl,
  },
});
