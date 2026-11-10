import { LinkButton } from "@components/ui/LinkButton";
import { useTranslation } from "react-i18next";
import { findPublicPage, publicLocale } from "@/domain/public/public-content";
import { PublicHero } from "./PublicHero";

export function AboutPage() {
  const { i18n } = useTranslation();
  const locale = publicLocale(i18n.language);
  const page = findPublicPage("about")!;
  const en = locale === "en";
  return <article className="mx-auto max-w-6xl space-y-14 pb-14">
    <PublicHero image="winery" eyebrow={en ? "Every bottle opens a conversation" : "Cada botella abre una conversación"} title={page.title[locale]} summary={page.summary[locale]}>
      <LinkButton to="/wines" size="lg" className="mt-7">{en ? "Discover the catalogue" : "Descubrir el catálogo"}</LinkButton>
    </PublicHero>
    <div className="grid gap-8 lg:grid-cols-3">
      {page.sections.map((section, index) => <section key={section.id} className="border-t border-border pt-6">
        <p aria-hidden="true" className="text-sm font-medium tracking-[.2em] text-wine-700">0{index + 1}</p>
        <h2 className="mt-5 text-2xl font-semibold leading-snug text-ink">{section.title[locale]}</h2>
        <p className="mt-5 leading-8 text-gray-600">{section.body[locale]}</p>
      </section>)}
    </div>
    <aside className="flex flex-col justify-between gap-6 rounded-3xl border border-border bg-surface-cream px-8 py-10 sm:flex-row sm:items-center">
      <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-wine-700">{en ? "Beyond the label" : "Más allá de la etiqueta"}</p>
        <h2 className="mt-3 text-2xl font-semibold text-ink">{en ? "Discover places. Share experiences." : "Descubrí lugares. Compartí experiencias."}</h2></div>
      <div className="flex flex-wrap gap-5">
        <LinkButton variant="link" to="/wine-routes">{en ? "Wine routes" : "Rutas del vino"}</LinkButton>
        <LinkButton variant="link" to="/contact">{en ? "Get in touch" : "Hablemos"}</LinkButton>
      </div>
    </aside>
  </article>;
}
