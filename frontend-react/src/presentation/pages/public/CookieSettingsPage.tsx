import { illustrations } from "@shared/illustrations";
import { ImageWithFallback } from "@components/ui/ImageWithFallback";
import { LinkButton } from "@components/ui/LinkButton";
import { PageBanner } from "@components/ui/PageBanner";
import { Cookie } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useExternalMapsPreference } from "@/presentation/hooks/useExternalMapsPreference";

export function CookieSettingsPage() {
  const { t } = useTranslation();
  const { allowed, setAllowed, saved } = useExternalMapsPreference();
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <PageBanner
        eyebrow={t("cookieSettings.eyebrow")}
        title={t("cookieSettings.title")}
        subtitle={t("cookieSettings.summary")}
        icon={Cookie}
      />
      <ImageWithFallback
        fallbackElement={<span />}
        src={illustrations.privacy}
        alt=""
        width={768}
        height={576}
        className="mx-auto max-h-48 w-full object-contain"
      />
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">{t("cookieSettings.essentialTitle")}</h2>
        <p className="leading-7 text-gray-600">{t("cookieSettings.essentialBody")}</p>
      </section>
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">{t("cookieSettings.mapsTitle")}</h2>
        <p className="leading-7 text-gray-600">{t("cookieSettings.mapsBody")}</p>
        <label className="flex min-h-11 items-center gap-3 font-medium text-ink">
          <input
            type="checkbox"
            checked={allowed}
            onChange={(event) => setAllowed(event.target.checked)}
            className="h-5 w-5 accent-wine-700"
          />
          {t("cookieSettings.mapsToggle")}
        </label>
        {saved !== undefined && (
          <p role="status" className="text-sm text-wine-700">
            {t(saved ? "cookieSettings.saved" : "cookieSettings.sessionOnly")}
          </p>
        )}
      </section>
      <LinkButton variant="link" to="/contact">
        {t("cookieSettings.askPrivacy")}
      </LinkButton>
    </div>
  );
}
