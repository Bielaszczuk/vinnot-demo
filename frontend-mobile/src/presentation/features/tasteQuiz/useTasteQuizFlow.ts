/**
 * View model of the taste quiz: one question at a time, a short beat after each choice,
 * Back keeps the answers, «Saltear» leaves (recording the skip unless it is a retake), and
 * the last answer saves the quiz while the taste profile animation plays.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { hapticsService } from "@/application/services/haptics.service";
import { completeTasteQuizAnswers, tasteQuizPicks } from "@/domain/tasteQuiz/tasteQuiz.rules";
import {
  TASTE_QUIZ_QUESTIONS,
  type TasteQuizAnswers,
  type TasteQuizOptionKey,
  type TasteQuizSelection,
} from "@/domain/tasteQuiz/tasteQuiz.types";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useTasteQuiz, useTasteQuizMutations } from "@/presentation/hooks/queries/social";
import { createUserProfileRoute, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { HOME_ROUTE } from "@/presentation/navigation/wineNavigation";

/** Pause between a choice and the next question, so the selection is seen. */
export const TASTE_QUIZ_ADVANCE_MS = 450;
/** The «Definiendo tu perfil de gustos» animation stays at least this long. */
export const TASTE_QUIZ_FINISH_MIN_MS = 12800;

export type TasteQuizPhase = "answering" | "finishing" | "error";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useTasteQuizFlow() {
  const router = useRouter();
  const { user } = useAuth();
  const quiz = useTasteQuiz(true);
  const { complete, skip: skipMutation } = useTasteQuizMutations();
  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<TasteQuizSelection>({});
  const [phase, setPhase] = useState<TasteQuizPhase>("answering");
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const question = TASTE_QUIZ_QUESTIONS[step]!;
  // The finish animation draws what the member picked.
  const picks = useMemo(() => tasteQuizPicks(selection), [selection]);
  const isRetake = quiz.data?.status === "COMPLETED";
  const ownId = user?.id;

  const submit = useCallback(
    async (answers: TasteQuizAnswers) => {
      setPhase("finishing");
      try {
        await Promise.all([complete.mutateAsync(answers), wait(TASTE_QUIZ_FINISH_MIN_MS)]);
      } catch {
        if (mounted.current) setPhase("error");
        return;
      }
      if (!mounted.current) return;
      if (ownId) router.replace(createUserProfileRoute(ownId));
      else goBackOr(router, HOME_ROUTE);
    },
    [complete, ownId, router],
  );

  const select = useCallback(
    (option: TasteQuizOptionKey) => {
      if (advanceTimer.current || phase !== "answering") return;
      const next = { ...selection, [question.key]: option } as TasteQuizSelection;
      setSelection(next);
      hapticsService.selection();
      advanceTimer.current = setTimeout(() => {
        advanceTimer.current = null;
        if (!mounted.current) return;
        const answers = completeTasteQuizAnswers(next);
        if (step < TASTE_QUIZ_QUESTIONS.length - 1) setStep(step + 1);
        else if (answers) void submit(answers);
      }, TASTE_QUIZ_ADVANCE_MS);
    },
    [phase, question.key, selection, step, submit],
  );

  const back = useCallback(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setStep((current) => Math.max(0, current - 1));
  }, []);

  const skip = useCallback(() => {
    // A retake leaves the completed quiz as it was; otherwise the server stops prompting.
    if (!isRetake) skipMutation.mutate();
    goBackOr(router, HOME_ROUTE);
  }, [isRetake, router, skipMutation]);

  /** Leaves without recording anything: after a failed save the quiz is offered again later. */
  const leave = useCallback(() => goBackOr(router, HOME_ROUTE), [router]);

  const retry = useCallback(() => {
    const answers = completeTasteQuizAnswers(selection);
    if (answers) void submit(answers);
  }, [selection, submit]);

  return {
    step,
    total: TASTE_QUIZ_QUESTIONS.length,
    question,
    selected: selection[question.key] as TasteQuizOptionKey | undefined,
    picks,
    phase,
    canGoBack: step > 0,
    select,
    back,
    skip,
    leave,
    retry,
  };
}
