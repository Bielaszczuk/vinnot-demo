import {
  ClipboardCheck,
  GitCompareArrows,
  Scale,
  Wine,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useProgressiveStep } from "@/presentation/hooks/useProgressiveStep";
import {
  WineProcessJourney,
  type WineProcessStep,
} from "@/presentation/features/wine/WineProcessJourney";
import { WINE_COMPARISON_STAGE_INTERVAL_MS } from "@/presentation/features/wine/wineProcessTiming";
import { wineSceneLooks } from "@/presentation/features/wine/wineSceneLook";
import type { WineType } from "@/domain/wine/wine.types";

interface CompareLoadingStepsProps {
  /** Types of the two wines: each glass and grape bunch follows its own wine. */
  firstType?: WineType | null;
  secondType?: WineType | null;
}

export function CompareLoadingSteps({ firstType, secondType }: CompareLoadingStepsProps = {}) {
  const { t } = useTranslation();
  const steps: WineProcessStep[] = [
    {
      key: "profiles",
      label: t(
        "compare.loading.tasteProfiles",
        "Leyendo identidad y perfil sensorial",
      ),
      icon: Wine,
      scene: "compare",
    },
    {
      key: "structure",
      label: t(
        "compare.loading.structure",
        "Alineando estructura, cuerpo y acidez",
      ),
      icon: Scale,
      scene: "structure",
    },
    {
      key: "differences",
      label: t(
        "compare.loading.differences",
        "Separando afinidades y diferencias",
      ),
      icon: GitCompareArrows,
      scene: "contrast",
    },
    {
      key: "recommendation",
      label: t(
        "compare.loading.recommendation",
        "Preparando la recomendación final",
      ),
      icon: ClipboardCheck,
      scene: "recommendation",
    },
  ];
  const activeStep = useProgressiveStep({
    stepCount: steps.length,
    intervalMs: WINE_COMPARISON_STAGE_INTERVAL_MS,
  });

  return (
    <WineProcessJourney
      eyebrow={t("compare.loading.eyebrow", "Comparación en curso")}
      title={t("compare.loading.title", "Construyendo la comparación")}
      subtitle={t(
        "compare.loading.subtitle",
        "Estamos contrastando ambos vinos para darte una lectura clara y útil.",
      )}
      steps={steps}
      activeStep={activeStep}
      looks={wineSceneLooks(firstType, secondType)}
    />
  );
}
