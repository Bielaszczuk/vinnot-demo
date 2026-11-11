/**
 * App layout — authenticated shell with terms and onboarding gates. The hosts below the
 * stack (points celebrations, the one-time taste quiz offer) only run past those gates.
 */
import { Redirect, Stack, useSegments, type Href } from "expo-router";
import { useAuth } from "@/presentation/hooks/useAuth";
import { TermsGate } from "@/presentation/features/public/TermsGate";
import { lightTokens } from "@/shared/theme/tokens";
import { AuthGuard } from "@/presentation/navigation/guards";
import { PointsHost } from "@/presentation/features/points/PointsHost";
import { TasteQuizPromptHost } from "@/presentation/features/tasteQuiz/TasteQuizPromptHost";
import { useStackAnimation } from "@/presentation/components/ui/motion/reducedMotion";

export default function AppLayout() {
  const segments = useSegments();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const animation = useStackAnimation("slide_from_right");
  const quizAnimation = useStackAnimation("slide_from_bottom");
  const isCompletingProfile = segments.some((segment) => String(segment) === "complete-profile");

  if (
    !isInitializing &&
    isAuthenticated &&
    user?.onboardingCompleted === false &&
    !isCompletingProfile
  ) {
    return (
      <TermsGate>
        <Redirect href={"/(app)/complete-profile" as Href} />
      </TermsGate>
    );
  }

  return (
    <AuthGuard>
      <TermsGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: lightTokens.bgBase },
            animation,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="complete-profile" />
          <Stack.Screen name="cellar" />
          <Stack.Screen name="points" />
          <Stack.Screen name="wineries/index" />
          <Stack.Screen name="wineries/[id]" />
          <Stack.Screen name="wine-routes/index" />
          <Stack.Screen name="wine-routes/[id]" />
          <Stack.Screen name="users/[id]" />
          <Stack.Screen name="users/[id]/followers" />
          <Stack.Screen name="users/[id]/following" />
          <Stack.Screen name="feed" />
          <Stack.Screen name="taste-quiz" options={{ animation: quizAnimation, gestureEnabled: false }} />
          <Stack.Screen name="partner" />
          <Stack.Screen name="admin" />
        </Stack>
        <PointsHost />
        <TasteQuizPromptHost />
      </TermsGate>
    </AuthGuard>
  );
}
