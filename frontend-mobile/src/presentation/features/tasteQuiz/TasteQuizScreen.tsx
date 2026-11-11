/**
 * TasteQuizScreen — /taste-quiz: five illustrated questions that seed the member's taste
 * profile. Only the options are shown; how they shape the profile stays on the server.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react-native";
import { Button } from "@/presentation/components/ui/Button";
import { TASTE_QUIZ_ART } from "@/shared/profileArt";
import { editorial, layout, radii } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";
import { TasteQuizLoadingSteps } from "./TasteQuizLoadingSteps";
import { TasteQuizOptionCard } from "./TasteQuizOptionCard";
import { useTasteQuizFlow } from "./useTasteQuizFlow";

const QUESTION_FADE_MS = 280;

export function TasteQuizScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const flow = useTasteQuizFlow();

  if (flow.phase !== "answering") {
    return (
      <View style={[styles.screen, styles.finishing, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        {flow.phase === "finishing" ? (
          <TasteQuizLoadingSteps picks={flow.picks} />
        ) : (
          <View style={styles.errorCard} accessibilityLiveRegion="polite">
            <Text accessibilityRole="header" style={styles.errorTitle}>
              {t("tasteQuiz.error.title")}
            </Text>
            <Text style={styles.errorBody}>{t("tasteQuiz.error.body")}</Text>
            <Button fullWidth onPress={flow.retry}>
              {t("tasteQuiz.error.retry")}
            </Button>
            <Button variant="ghost" fullWidth onPress={flow.leave}>
              {t("tasteQuiz.error.later")}
            </Button>
          </View>
        )}
      </View>
    );
  }

  const { question } = flow;
  const tall = question.options.length === 2;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <View style={styles.side}>
          {flow.canGoBack ? (
            <Pressable
              onPress={flow.back}
              accessibilityRole="button"
              accessibilityLabel={t("tasteQuiz.back")}
              hitSlop={12}
              testID="taste-quiz-back"
              style={styles.iconButton}
            >
              <ChevronLeft size={22} color={vinnotColors.ink} />
            </Pressable>
          ) : null}
        </View>
        <View
          style={styles.dots}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t("tasteQuiz.progress", { current: flow.step + 1, total: flow.total })}
        >
          {Array.from({ length: flow.total }, (_, index) => (
            <View
              key={index}
              style={[styles.dot, index < flow.step && styles.dotDone, index === flow.step && styles.dotCurrent]}
            />
          ))}
        </View>
        <View style={[styles.side, styles.sideEnd]}>
          <Button variant="ghost" size="sm" onPress={flow.skip}>
            {t("tasteQuiz.skip")}
          </Button>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          key={question.key}
          entering={reduceMotion ? undefined : FadeIn.duration(QUESTION_FADE_MS)}
          style={styles.questionBlock}
        >
          <Text style={styles.eyebrow}>{t("tasteQuiz.eyebrow")}</Text>
          <Text accessibilityRole="header" style={styles.question}>
            {t(`tasteQuiz.questions.${question.key}`)}
          </Text>
          <View style={styles.grid}>
            {question.options.map((option) => (
              <TasteQuizOptionCard
                key={option}
                label={t(`tasteQuiz.options.${option}`)}
                art={TASTE_QUIZ_ART[option]}
                selected={flow.selected === option}
                tall={tall}
                onPress={() => flow.select(option)}
                testID={`taste-quiz-option-${option}`}
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const DOT = 8;
/** Upcoming steps: a warm gray that stays visible on white and cream (the web quiz uses the same). */
const DOT_UPCOMING = "#D6CEC6";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vinnotColors.background },
  finishing: { paddingHorizontal: layout.screenHorizontalPadding, justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layout.screenHorizontalPadding - 8,
    minHeight: 48,
  },
  side: { flex: 1, flexDirection: "row" },
  sideEnd: { justifyContent: "flex-end" },
  iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  dots: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: DOT_UPCOMING },
  dotDone: { backgroundColor: editorial.brandMuted },
  dotCurrent: { width: DOT * 2.5, backgroundColor: vinnotColors.brand },
  content: { paddingHorizontal: layout.screenHorizontalPadding, paddingTop: 20 },
  questionBlock: { gap: 10 },
  eyebrow: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: vinnotColors.brand,
  },
  question: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes["3xl"],
    lineHeight: 36,
    color: vinnotColors.ink,
    marginBottom: 14,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 },
  errorCard: {
    gap: 14,
    padding: 22,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: editorial.creamMuted,
    backgroundColor: editorial.cream,
  },
  errorTitle: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.xl,
    lineHeight: 26,
    color: vinnotColors.ink,
  },
  errorBody: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.ui,
    lineHeight: 21,
    color: vinnotColors.ink,
  },
});
