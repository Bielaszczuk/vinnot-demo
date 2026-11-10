import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { useLegalAgreement } from "@/presentation/hooks/useLegalAgreement";
import { Button } from "@components/ui/Button";
import { PageLoader } from "@components/ui/PageLoader";

export function TermsReview({ agreement, expanded = false }: {
  agreement: ReturnType<typeof useLegalAgreement>; expanded?: boolean;
}) {
  const { t } = useTranslation();
  const { document, error, loading, checked, setChecked, retry, sending } = agreement;
  return <section aria-label={t("legalAgreement.termsLabel")} className="space-y-5 rounded-2xl border border-border bg-surface-cream p-5 sm:p-7">
    {loading && <PageLoader compact label={t("legalAgreement.loading")} />}
    {error && <div role="alert" className="space-y-3 text-sm text-danger">
      <p>{t("legalAgreement.loadError")}</p>
      <Button type="button" onClick={retry}>{t("legalAgreement.reload")}</Button>
    </div>}
    {document && <>
      <details open={expanded || undefined} className="group">
        <summary className="cursor-pointer font-semibold text-wine-800">{document.title} · {document.version}</summary>
        <div className="mt-5 space-y-5 text-sm leading-7 text-gray-600">
          <p>{document.summary}</p>
          {document.sections.map(section => <section key={section.id} className="border-t border-border pt-4">
            <h3 className="font-semibold text-ink">{section.title}</h3>
            <p className="mt-2 whitespace-pre-line">{section.body}</p>
          </section>)}
        </div>
      </details>
      <label className="flex cursor-pointer items-start gap-3 border-t border-border pt-5 text-sm leading-6 text-gray-800">
        <input type="checkbox" checked={checked} disabled={sending || error} onChange={event => setChecked(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-wine-700" />
        <span>{t("legalAgreement.accept", { version: document.version, interpolation: { escapeValue: false } })}</span>
      </label>
    </>}
    <p className="text-xs leading-6 text-gray-500">{t("legalAgreement.privacyIntro")}
      <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-wine-700 underline">{t("legalAgreement.privacyLink")}</Link>.
      {" "}{t("legalAgreement.privacyNote")}
    </p>
  </section>;
}
