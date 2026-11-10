import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useExternalMapsPreference } from "@/presentation/hooks/useExternalMapsPreference";
import { Button } from "./Button";

export function ExternalMapGate({ children }: { children: ReactNode }) {
  const { allowed, setAllowed } = useExternalMapsPreference();
  const { t } = useTranslation();
  if (allowed) return <>{children}</>;
  return (
    <div className="rounded-2xl border border-wine-100 bg-wine-50/50 p-6 text-center">
      <p className="mb-4 text-sm leading-relaxed text-gray-600">
        {t("externalMaps.notice")}
      </p>
      <Button variant="outline" onClick={() => setAllowed(true)}>
        {t("externalMaps.allow")}
      </Button>
    </div>
  );
}
