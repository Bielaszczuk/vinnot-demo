import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { IllustratedState } from "@components/ui/IllustratedState";
import type { IllustratedStateKind } from "@/presentation/feedback/illustratedState";

export function ServiceStatePage({ kind }: { kind: IllustratedStateKind }) {
  const { t } = useTranslation();
  return (
    <IllustratedState kind={kind}>
      <Link
        className="rounded-xl bg-wine-600 px-6 py-3 font-medium text-white focus-visible:outline focus-visible:outline-wine-700"
        to="/"
      >
        {t("common.goHome")}
      </Link>
      <Link
        className="rounded-xl border border-wine-200 px-6 py-3 font-medium text-wine-700"
        to="/help"
      >
        {t("profile.help", "Ayuda")}
      </Link>
    </IllustratedState>
  );
}
