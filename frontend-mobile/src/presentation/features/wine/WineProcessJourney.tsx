import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Check } from "lucide-react-native";
import { WineProcessSceneVisual } from "./WineProcessScene";
import { wineSceneLooks, type WineSceneLooks } from "./wineSceneLook";
import type { TasteScenePicks } from "./TasteProfileSceneArt";
import { radii, iconStrokes } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";

/** Scenes of the AI wine profile and the comparison. */
export type WineScene =
  | "uncork"
  | "visual"
  | "bouquet"
  | "taste"
  | "report"
  | "compare"
  | "structure"
  | "contrast"
  | "recommendation";

/** Scenes of the taste quiz finish: the member's own picks become a taste profile. */
export type TasteProfileScene = "quizPicks" | "quizGlass" | "quizBlend" | "quizWheel";

export type WineProcessScene = WineScene | TasteProfileScene;

export interface WineProcessStep {
  key: string;
  label: string;
  icon: LucideIcon;
  scene: WineProcessScene;
}

interface WineProcessJourneyProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  steps: WineProcessStep[];
  activeStep: number;
  /** How the scenes draw the wines; a red wine when not given. */
  looks?: WineSceneLooks;
  /** The quiz options the taste profile scenes draw; none when not given. */
  picks?: TasteScenePicks;
}

const DEFAULT_LOOKS = wineSceneLooks();
const NO_PICKS: TasteScenePicks = [];

export function WineProcessJourney({
  eyebrow,
  title,
  subtitle,
  steps,
  activeStep,
  looks = DEFAULT_LOOKS,
  picks = NO_PICKS,
}: WineProcessJourneyProps) {
  const safeActiveStep = Math.min(activeStep, Math.max(steps.length - 1, 0));
  const currentStep = steps[safeActiveStep];

  return (
    <View
      style={styles.card}
      accessibilityRole="progressbar"
      accessibilityLabel={`${title}. ${currentStep?.label ?? ""}`.trim()}
      accessibilityValue={{
        min: 1,
        max: Math.max(steps.length, 1),
        now: Math.min(safeActiveStep + 1, Math.max(steps.length, 1)),
      }}
    >
      <View style={styles.heading}>
        <View style={styles.eyebrowPill}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {currentStep ? (
        <WineProcessSceneVisual
          scene={currentStep.scene}
          step={safeActiveStep}
          total={steps.length}
          looks={looks}
          picks={picks}
        />
      ) : null}

      <View style={styles.currentStage}>
        <Text style={styles.stageCounter}>
          {String(safeActiveStep + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
        </Text>
        <Text style={styles.currentLabel}>{currentStep?.label}</Text>
        <ActivityIndicator size="small" color={vinnotColors.brand} />
      </View>

      <View style={styles.steps}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          const complete = index < safeActiveStep;
          const active = index === safeActiveStep;

          return (
            <View
              key={step.key}
              style={[
                styles.step,
                complete && styles.stepComplete,
                active && styles.stepActive,
              ]}
            >
              <View
                style={[
                  styles.stepIcon,
                  complete && styles.stepIconComplete,
                  active && styles.stepIconActive,
                ]}
              >
                {complete ? (
                  <Check size={15} color={vinnotColors.white} strokeWidth={iconStrokes.strong} />
                ) : (
                  <Icon
                    size={17}
                    color={active ? vinnotColors.brand : vinnotColors.placeholder}
                    strokeWidth={active ? 2 : 1.65}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.stepText,
                  complete && styles.stepTextComplete,
                  active && styles.stepTextActive,
                ]}
              >
                {step.label}
              </Text>
              <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>
                {String(index + 1).padStart(2, "0")}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    gap: 17,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    borderRadius: radii["3xl"],
    backgroundColor: vinnotColors.surface,
    paddingHorizontal: 18,
    paddingVertical: 24,
    shadowColor: vinnotColors.brandDeep,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 26,
    elevation: 4,
  },
  heading: { alignItems: "center", gap: 7 },
  eyebrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: vinnotColors.brandTint,
    borderRadius: radii.full,
    backgroundColor: vinnotColors.brandSoft,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  eyebrowDot: { width: 6, height: 6, borderRadius: radii.full, backgroundColor: vinnotColors.brand },
  eyebrow: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.meta,
    lineHeight: 15,
    color: vinnotColors.brandDeep,
  },
  title: {
    textAlign: "center",
    fontFamily: vinnotFonts.bold,
    fontSize: fontSizes["2xl"],
    lineHeight: 30,
    color: vinnotColors.ink,
  },
  subtitle: {
    maxWidth: 290,
    textAlign: "center",
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: vinnotColors.muted,
  },
  currentStage: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: vinnotColors.brandTint,
    borderRadius: radii.xl,
    backgroundColor: vinnotColors.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  stageCounter: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes["2xs"],
    lineHeight: 14,
    color: vinnotColors.brand,
  },
  currentLabel: {
    flex: 1,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: vinnotColors.ink,
  },
  steps: { gap: 4 },
  step: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radii.lg,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  stepComplete: { opacity: 0.82 },
  stepActive: { backgroundColor: vinnotColors.canvas },
  stepIcon: {
    width: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: vinnotColors.border,
    borderRadius: 15,
    backgroundColor: vinnotColors.surface,
  },
  stepIconComplete: { borderColor: vinnotColors.brand, backgroundColor: vinnotColors.brand },
  stepIconActive: { borderColor: vinnotColors.brandTint, backgroundColor: vinnotColors.brandSoft },
  stepText: {
    flex: 1,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    color: vinnotColors.placeholder,
  },
  stepTextComplete: { color: vinnotColors.muted },
  stepTextActive: { fontFamily: vinnotFonts.medium, color: vinnotColors.ink },
  stepNumber: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes["2xs"],
    lineHeight: 13,
    color: vinnotColors.borderStrong,
  },
  stepNumberActive: { color: vinnotColors.brand },
});
