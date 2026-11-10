import { PublicHero } from "./PublicHero";
import { Link } from "react-router-dom";
import { LinkButton } from "@components/ui/LinkButton";
import { useTranslation } from "react-i18next";
import {
  publicContact,
  publicPages,
  publicLocale,
  publicPagePath,
} from "@/domain/public/public-content";
export function LegalCentrePage() {
  const { t, i18n } = useTranslation();
  const locale = publicLocale(i18n.language);
  const categories = (["terms", "platform", "privacy"] as const).map((key) => ({
    key,
    title: t(`legalCentre.categories.${key}`),
  }));
  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-12">
      <PublicHero eyebrow={t("legalCentre.eyebrow")} title={t("legalCentre.title")} summary={t("legalCentre.summary")} />
      {categories.map((category) => (
        <section key={category.key} aria-label={category.title}>
          <h2 className="mb-6 border-b border-border pb-5 text-xl font-semibold text-ink">{category.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {publicPages
              .filter((page) => page.category === category.key)
              .map((page) => (
                <Link
                  key={page.slug}
                  to={publicPagePath(page.slug)}
                  className="group rounded-2xl border border-border bg-surface p-7 shadow-sm transition-colors hover:border-wine-300 hover:bg-surface-cream focus-visible:outline-wine-600"
                >
                  <h3 className="font-semibold text-wine-800">
                    {page.title[locale]}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {page.summary[locale]}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      ))}
      <section className="rounded-2xl border border-border bg-surface-cream p-6">
        <h2 className="text-xl font-semibold text-ink">{t("legalCentre.operatorTitle")}</h2>
        <p className="mt-3 text-gray-700">
          {publicContact.operator} · {publicContact.country}
        </p>
        <LinkButton variant="link" className="mt-2" href={`mailto:${publicContact.email}`}>
          {publicContact.email}
        </LinkButton>
        <div className="mt-5 flex flex-wrap gap-5">
          <LinkButton variant="link" to="/contact">{t("legalCentre.contactLink")}</LinkButton>
          <LinkButton variant="link" to="/help">{t("legalCentre.helpLink")}</LinkButton>
          <LinkButton variant="link" to="/about">{t("legalCentre.aboutLink")}</LinkButton>
        </div>
      </section>
    </div>
  );
}
