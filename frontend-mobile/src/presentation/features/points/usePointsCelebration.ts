import { useCallback, useState } from "react";
import type { BadgeTier } from "@/domain/points/badgeTiers";
import type { PointsSummary } from "@/domain/points/points.types";
import { useDismissPointsWelcome, useMarkTierCelebrated, usePointsSummary } from "@/presentation/hooks/queries/user";

export interface PointsCelebrationState {
  summary: PointsSummary | undefined;
  /** Tier to celebrate now, shown once per pending tier. */
  celebrating: BadgeTier | null;
  finishCelebration: () => void;
  /** One-time welcome card after the initial points load. */
  welcome: { points: number; tier: BadgeTier } | null;
  dismissWelcome: () => void;
}

/**
 * Decides when the tier-up celebration and the welcome card appear. Each pending tier is
 * shown once per session even before the server confirms it, then marked celebrated so
 * other devices do not show it again.
 */
export function usePointsCelebration(enabled: boolean): PointsCelebrationState {
  const { data: summary } = usePointsSummary(enabled);
  const markCelebrated = useMarkTierCelebrated();
  const dismiss = useDismissPointsWelcome();
  const [shown, setShown] = useState<readonly BadgeTier[]>([]);
  const [welcomeClosed, setWelcomeClosed] = useState(false);

  const pending = summary?.pendingCelebration ?? null;
  const celebrating = pending && !shown.includes(pending) ? pending : null;

  const finishCelebration = useCallback(() => {
    if (!celebrating) return;
    setShown((current) => [...current, celebrating]);
    markCelebrated.mutate(celebrating);
  }, [celebrating, markCelebrated]);

  const dismissWelcome = useCallback(() => {
    setWelcomeClosed(true);
    dismiss.mutate();
  }, [dismiss]);

  const welcome = summary?.showWelcome && !welcomeClosed && !celebrating
    ? { points: summary.points, tier: summary.tier }
    : null;

  return { summary, celebrating, finishCelebration, welcome, dismissWelcome };
}
