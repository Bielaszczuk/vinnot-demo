import {
  BottleWine,
  ClipboardPenLine,
  Eye,
  ScanFace,
  Wine,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useProgressiveStep } from "@/presentation/hooks/useProgressiveStep";
import {
  WineProcessJourney,
  type WineProcessStep,
} from "@/presentation/features/wine/WineProcessJourney";
import { AI_PROFILE_STAGE_INTERVAL_MS } from "@/presentation/features/wine/wineProcessTiming";
import { wineSceneLooks } from "@/presentation/features/wine/wineSceneLook";
import type { WineType } from "@/domain/wine/wine.types";

/** `wineType` sets the glass, wine and bottle drawn; a red wine until it is known. */
export function AiProfileLoadingSteps({ wineType }: { wineType?: WineType | null } = {}) {
  const { t } = useTranslation();
  const steps: WineProcessStep[] = [
    {
      key: "uncork",
      label: t("wineDetails.aiLoading.uncork", "Preparando la botella"),
      icon: BottleWine,
      scene: "uncork",
    },
    {
      key: "visual",
      label: t("wineDetails.aiLoading.visual", "Analizando color y claridad"),
      icon: Eye,
      scene: "visual",
    },
    {
      key: "bouquet",
      label: t("wineDetails.aiLoading.bouquet", "Interpretando el perfil aromático"),
      icon: ScanFace,
      scene: "bouquet",
    },
    {
      key: "taste",
      label: t("wineDetails.aiLoading.taste", "Modelando la estructura sensorial"),
      icon: Wine,
      scene: "taste",
    },
    {
      key: "report",
      label: t("wineDetails.aiLoading.report", "Redactando el informe profesional"),
      icon: ClipboardPenLine,
      scene: "report",
    },
  ];
  const activeStep = useProgressiveStep({
    stepCount: steps.length,
    intervalMs: AI_PROFILE_STAGE_INTERVAL_MS,
  });

  return (
    <WineProcessJourney
      eyebrow={t("wineDetails.aiSommelier", "Sommelier Vinnot")}
      title={t("wineDetails.aiLoading.title", "Analizando tu vino")}
      subtitle={t(
        "wineDetails.aiLoading.subtitle",
        "Estamos interpretando la etiqueta, el perfil sensorial y las mejores formas de disfrutarlo.",
      )}
      steps={steps}
      activeStep={activeStep}
      looks={wineSceneLooks(wineType)}
    />
  );
}
