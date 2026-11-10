/**
 * Shows the tier-up celebration and the one-time welcome card anywhere in the signed-in
 * app. It also keeps the points summary subscribed, so awarding actions refresh it.
 */
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@/presentation/hooks/useAuth";
import { POINTS_ROUTE } from "@/presentation/navigation/discoveryNavigation";
import { PointsWelcomeCard } from "./PointsWelcomeCard";
import { TierCelebration } from "./TierCelebration";
import { usePointsCelebration } from "./usePointsCelebration";

export function PointsHost() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const enabled = isAuthenticated && user?.onboardingCompleted !== false;
  const { celebrating, finishCelebration, welcome, dismissWelcome } = usePointsCelebration(enabled);

  if (celebrating) {
    return (
      <TierCelebration tier={celebrating} onClose={finishCelebration} onOpenPoints={() => {
        finishCelebration();
        router.push(POINTS_ROUTE as Href);
      }} />
    );
  }
  if (welcome) {
    return (
      <PointsWelcomeCard points={welcome.points} tier={welcome.tier} onDismiss={dismissWelcome} onOpenPoints={() => {
        dismissWelcome();
        router.push(POINTS_ROUTE as Href);
      }} />
    );
  }
  return null;
}
