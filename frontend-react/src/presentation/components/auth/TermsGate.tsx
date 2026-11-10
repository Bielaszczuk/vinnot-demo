import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useLegalAgreement } from "@/presentation/hooks/useLegalAgreement";
import { TermsReview } from "./TermsReview";
import { Button } from "@components/ui/Button";
import { LinkButton } from "@components/ui/LinkButton";
import { PageLoader } from "@components/ui/PageLoader";

export function TermsGate({ children, exempt = false }: { children: ReactNode; exempt?: boolean }) {
  const { t } = useTranslation();
  const { user, isAuthenticated, isInitializing, logout } = useAuth();
  const agreement = useLegalAgreement("account", user?.id, !exempt && isAuthenticated && !isInitializing);
  const [exitFailed, setExitFailed] = useState(false);
  if (exempt || !isAuthenticated || isInitializing) return <>{children}</>;
  // TermsGate renders inside the app shell, which owns the page's only <main>.
  if (agreement.loading) return <div aria-busy="true"><PageLoader label={t("legalAgreement.checking")} /></div>;
  if (!agreement.required && !agreement.error) return <>{children}</>;
  const requiresConsent = agreement.required && !!agreement.document;
  return <section aria-labelledby="terms-gate-title" className="mx-auto max-w-3xl space-y-7 px-5 py-10">
    <header className="border-b border-border pb-7">
      <p className="text-xs font-semibold uppercase tracking-[.22em] text-wine-700">Vinnot · {t("legalAgreement.eyebrow")}</p>
      <h1 id="terms-gate-title" className="mt-4 text-3xl font-semibold text-ink">{requiresConsent
        ? t("legalAgreement.beforeContinue")
        : t("legalAgreement.verifyFailed")}</h1>
      {requiresConsent && <p className="mt-3 leading-7 text-gray-600">{t("legalAgreement.reviewIntro")}</p>}
    </header>
    <TermsReview agreement={requiresConsent ? agreement : { ...agreement, document: undefined }} />
    {requiresConsent && <Button disabled={!agreement.selection || agreement.error} isLoading={agreement.sending} onClick={() => void agreement.accept()}>{t("legalAgreement.acceptContinue")}</Button>}
    <Button variant="link" className="ml-5" disabled={agreement.sending} onClick={() => { void logout().catch(() => setExitFailed(true)); }}>{t("legalAgreement.signOut")}</Button>
    {exitFailed && <p role="alert">{t("legalAgreement.signOutFailed")}</p>}
    <p className="text-sm text-gray-500">{t("legalAgreement.stillAccess")}
      <LinkButton variant="link" to="/legal">{t("legalAgreement.legalInfo")}</LinkButton>{" · "}
      <LinkButton variant="link" to="/contact">{t("legalAgreement.contactRequests")}</LinkButton>
    </p>
  </section>;
}
