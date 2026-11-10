import { useSupportReference } from "@/presentation/hooks/useSupportReference";
import { useAuth } from "@/presentation/hooks/useAuth";
import { PublicHero } from "./PublicHero";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSupportForm } from "@/presentation/hooks/useSupportForm";
import { Button } from "@components/ui/Button";
import { LinkButton } from "@components/ui/LinkButton";
import { Select } from "@components/ui/Select";
import { fieldClassName, fieldLabelClassName } from "@components/ui/fieldStyles";
import { publicContact } from "@/domain/public/public-content";

export function ContactPage() {
  const { user } = useAuth();
  return <ContactForm key={user?.id ?? "guest"} identity={user ? { email: user.email, name: user.name } : undefined} />;
}
function ContactForm({ identity }: { identity?: { email: string; name: string } }) {
  const { i18n } = useTranslation();
  const en = i18n.language.startsWith("en");
  const { form, setForm, sending, receipt, error, retryBlocked, submit } = useSupportForm(identity, en ? "en" : "es");
  const { reference, copy, copyState } = useSupportReference(receipt);
  const labels = en ? ["Name", "Email", "Topic", "Message"] : ["Nombre", "Correo", "Tema", "Mensaje"];
  const categories = en ? ["Support", "Privacy", "Report content", "Review a decision", "Partnership", "General enquiry"] : ["Soporte", "Privacidad", "Reportar contenido", "Revisar una decisión", "Colaboración", "Consulta general"];
  return <div className="mx-auto max-w-6xl space-y-10 pb-14">
    <PublicHero eyebrow={en ? "Here for your next discovery" : "Cerca de tu próxima experiencia"} title={en ? "Let's talk" : "Hablemos"} summary={en ? "A question, an idea or something we can do better. This is your direct line to Vinnot." : "Una consulta, una idea o algo que podemos hacer mejor. Este es tu espacio para conversar con Vinnot."} image="winery" />
    <div className="grid items-start gap-8 lg:grid-cols-[.75fr_1.25fr]">
    <header className="space-y-5 border-t border-border pt-7 lg:sticky lg:top-24"><p className="text-xs font-semibold uppercase tracking-[.18em] text-wine-700">{en ? "A conversation starts here" : "Una conversación empieza acá"}</p>
      <h2 className="text-2xl font-semibold text-ink">{en ? "How can we help?" : "¿Cómo podemos ayudarte?"}</h2>
      <p className="mt-4 text-lg leading-relaxed text-gray-600">{en ? "Tell us how we can help. Never include passwords, payment card details or verification codes." : "Contanos cómo podemos ayudarte. No incluyas contraseñas, datos de tarjetas ni códigos de verificación."}</p>
      <div className="flex flex-col items-start gap-3">
        <LinkButton variant="link" to="/help">{en ? "Browse frequently asked questions" : "Consultar preguntas frecuentes"}</LinkButton>
        <LinkButton variant="link" href={`mailto:${publicContact.email}`}>{publicContact.email}</LinkButton>
      </div>
    </header>
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      {(["name", "email"] as const).map((key, index) => <label key={key} className={`block ${fieldLabelClassName}`}>{labels[index]}
        <input required maxLength={key === "name" ? 100 : 254} type={key === "email" ? "email" : "text"} autoComplete={key} readOnly={key === "email" && !!identity} disabled={sending} value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} className={fieldClassName({ className: "mt-2 block" })} />
      </label>)}
      {identity && <p className="text-xs leading-6 text-gray-500">{en ? "We'll reply to the email linked to your account." : "Te responderemos al correo asociado a tu cuenta."}</p>}
      <Select id="support-subject" label={labels[2]} disabled={sending} value={form.subject} onChange={event => setForm(current => ({ ...current, subject: event.target.value }))}
        options={["support", "privacy", "report", "appeal", "partnership", "general"].map((value, index) => ({ value, label: categories[index]! }))} />
      <div>
        <label htmlFor="support-message" className={`block ${fieldLabelClassName}`}>{labels[3]}</label>
        <textarea id="support-message" required maxLength={4000} rows={7} disabled={sending} value={form.message} onChange={event => setForm(current => ({ ...current, message: event.target.value }))} className={fieldClassName({ className: "mt-2 block leading-relaxed" })} />
      </div>
      <p className="text-sm text-gray-500">{en ? "Your contact details and message are used to handle this request." : "Tus datos de contacto y mensaje se utilizan para atender esta consulta."} <Link className="text-wine-700 underline underline-offset-4" to="/privacy">{en ? "Privacy" : "Privacidad"}</Link></p>
      {error && <p role="alert" className="rounded-xl border border-wine-200 bg-wine-50 p-4 text-wine-800">{error === "invalid" ? (en ? "Check the required fields and email address." : "Revisá los campos obligatorios y el correo.") : (en ? "We couldn't confirm receipt. Your message is still here; you can retry." : "No pudimos confirmar la recepción. Conservamos tu mensaje para que puedas reintentar.")}</p>}
      {retryBlocked && <p role="status" className="text-sm text-wine-700">{en ? "Please wait before retrying, as requested by the service." : "Esperá antes de reintentar, según el plazo indicado por el servicio."}</p>}
      {receipt && <div className="space-y-3 rounded-xl bg-wine-50 p-4 text-wine-800">
        <p role="status">{en ? "Request received. Reference:" : "Consulta recibida. Referencia:"} <strong className="block select-text">{reference}</strong></p>
        <Button variant="link" className="min-h-11" onClick={() => void copy()}>{copyState === "copied" ? (en ? "Copied" : "Copiado") : (en ? "Copy reference" : "Copiar referencia")}</Button>
        {copyState === "failed" && <p role="alert">{en ? "Couldn't copy. Select the reference to copy it manually." : "No pudimos copiar. Seleccioná la referencia para copiarla manualmente."}</p>}
      </div>}
      <Button type="submit" disabled={retryBlocked} isLoading={sending} size="lg">{en ? "Send enquiry" : "Enviar consulta"}</Button>
    </form>
    </div>
  </div>;
}
