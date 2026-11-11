/**
 * Offers the taste quiz once after sign-in. The server decides who should see it
 * (`shouldPrompt`, across sessions); this guard keeps it to one offer per member per app
 * session, so leaving the quiz never brings it back until the next launch.
 */
import { useEffect } from "react";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useTasteQuiz } from "@/presentation/hooks/queries/social";
import { TASTE_QUIZ_ROUTE } from "@/presentation/navigation/discoveryNavigation";

/** Lets Home settle before the quiz slides in. */
export const TASTE_QUIZ_PROMPT_DELAY_MS = 900;

/** Members already offered the quiz in this app session (lives as long as the JS runtime). */
const offeredThisSession = new Set<string>();

export function useTasteQuizPrompt() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  // A member still completing the profile is on the onboarding screen: wait for it.
  const enabled = isAuthenticated && !!userId && user?.onboardingCompleted !== false;
  const { data } = useTasteQuiz(enabled);
  const shouldPrompt = enabled && data?.shouldPrompt === true;

  useEffect(() => {
    if (!shouldPrompt || !userId || offeredThisSession.has(userId)) return;
    const timer = setTimeout(() => {
      offeredThisSession.add(userId);
      router.push(TASTE_QUIZ_ROUTE as Href);
    }, TASTE_QUIZ_PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [router, shouldPrompt, userId]);
}
