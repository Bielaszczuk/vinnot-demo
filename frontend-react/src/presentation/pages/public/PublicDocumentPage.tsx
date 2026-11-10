import { Button } from "@components/ui/Button";
import { fieldClassName } from "@components/ui/fieldStyles";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  publicLocale,
  searchPublicSections,
} from "@/domain/public/public-content";
import { usePublicDocument } from "@/presentation/hooks/usePublicDocument";
import { PublicHero } from "./PublicHero";
import { NotFoundPage } from "./NotFoundPage";

export function PublicDocumentPage({ slug }: { slug: string }) {
  const { t, i18n } = useTranslation();
  const locale = publicLocale(i18n.language);
  const { page, version, termsUnconfirmed, retry } = usePublicDocument(slug);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const previous = document.title;
    if (page) document.title = page.title[locale] + " · Vinnot";
    return () => {
      document.title = previous;
    };
  }, [page, locale]);
  if (!page) return <NotFoundPage />;
  const sections = searchPublicSections(page, query, locale);
  return (
    <article className="mx-auto max-w-5xl space-y-8 pb-12">
      <PublicHero eyebrow={t("publicDocument.eyebrow")} title={page.title[locale]} summary={page.summary[locale]} image={page.image ?? "legal"}>
        <p className="mt-5 text-xs text-gray-500">{t("publicDocument.version", { version })}</p>
      </PublicHero>
      {termsUnconfirmed && <p role="status" className="rounded-xl border border-border bg-surface-cream p-4 text-sm leading-6 text-gray-600">{t("publicDocument.informationalCopy")} <Button variant="link" onClick={retry}>{t("publicDocument.refresh")}</Button></p>}
      {slug === "help" && (
        <label className="block text-sm font-medium text-gray-700">
          {t("publicDocument.searchHelp")}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={fieldClassName({ className: "mt-2 block" })}
          />
        </label>
      )}
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <nav
          aria-label={t("publicDocument.onThisPage")}
          className="self-start rounded-2xl border border-wine-100 bg-wine-50/50 p-5 md:sticky md:top-24"
        >
          <h2 className="mb-3 text-xl font-semibold text-gray-900">
            {t("publicDocument.onThisPage")}
          </h2>
          <ul className="space-y-3">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  className="inline-flex min-h-11 items-center text-sm leading-relaxed text-wine-700 underline underline-offset-4 hover:text-wine-900 focus-visible:outline-wine-500"
                  href={`#${section.id}`}
                >
                  {section.title[locale]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-6">
          {sections.map((section, index) => (
            <section
              id={section.id}
              key={section.id}
              className="scroll-mt-24 border-t border-gray-200 bg-white px-3 py-8 sm:px-6"
            >
              <p aria-hidden="true" className="mb-3 text-xs font-medium tracking-[.2em] text-wine-600">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="text-xl font-semibold text-gray-900">
                {section.title[locale]}
              </h2>
              <p className="mt-4 whitespace-pre-line leading-8 text-gray-600">
                {section.body[locale]}
              </p>
            </section>
          ))}
          {sections.length === 0 && (
            <p role="status">
              {t("publicDocument.noResults")}
            </p>
          )}
          <div className="flex flex-wrap gap-5 border-t border-wine-100 pt-6 text-sm font-medium text-wine-700">
            <Link to="/legal">
              {t("publicDocument.informationCentre")}
            </Link>
            <Link to="/contact">
              {t("publicDocument.contact")}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function LegalDocumentPage() {
  const { slug = "" } = useParams();
  return <PublicDocumentPage key={slug} slug={slug} />;
}
