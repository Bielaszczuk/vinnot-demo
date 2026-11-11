/**
 * The taste quiz finish: «Definiendo tu perfil de gustos» told in four scenes of its own on
 * the AI loading engine. A pen draws the member's picks into a tasting journal, they fill a
 * glass, a brush blends their flavours on a palette and paints the taste wheel around a glass
 * of red wine while the answers save.
 */
import { BookOpen, Brush, Palette, Wine } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useProgressiveStep } from "@/presentation/hooks/useProgressiveStep";
import { WineProcessJourney, type WineProcessStep } from "@/presentation/features/wine/WineProcessJourney";
import type { TasteScenePicks } from "@/presentation/features/wine/TasteProfileSceneArt";

/**
 * Saving the answers is quick, so the four scenes fit in the minimum time on screen, each at a
 * calm pace with a short rest at its end: the last one (the wheel being drawn) starts at 9.6 s,
 * is finished by about 12.5 s and keeps drawing until the save ends.
 */
export const TASTE_QUIZ_STAGE_INTERVAL_MS = 3200;

interface TasteQuizLoadingStepsProps {
  /** The options the member picked, in question order. */
  picks: TasteScenePicks;
}

export function TasteQuizLoadingSteps({ picks }: TasteQuizLoadingStepsProps) {
  const { t } = useTranslation();
  const steps: WineProcessStep[] = [
    { key: "picks", label: t("tasteQuiz.finishing.picks"), icon: BookOpen, scene: "quizPicks" },
    { key: "glass", label: t("tasteQuiz.finishing.glass"), icon: Wine, scene: "quizGlass" },
    { key: "blend", label: t("tasteQuiz.finishing.blend"), icon: Palette, scene: "quizBlend" },
    { key: "profile", label: t("tasteQuiz.finishing.profile"), icon: Brush, scene: "quizWheel" },
  ];
  const activeStep = useProgressiveStep({ stepCount: steps.length, intervalMs: TASTE_QUIZ_STAGE_INTERVAL_MS });

  return (
    <WineProcessJourney
      eyebrow={t("tasteQuiz.eyebrow")}
      title={t("tasteQuiz.finishing.title")}
      subtitle={t("tasteQuiz.finishing.subtitle")}
      steps={steps}
      activeStep={activeStep}
      picks={picks}
    />
  );
}
