/**
 * usePointsAcknowledgement — records that a tier-up reveal or the welcome card
 * was shown, so each plays only once. The cache is updated first so the
 * overlay never reopens while the request is in flight.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { pointsService } from '@services/points.service'
import type { BadgeTier, PointsSummary } from '@domain/points/points.types'

export type PointsAcknowledgement = { tier: BadgeTier } | { welcome: true }

export function usePointsAcknowledgement() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, PointsAcknowledgement>({
    mutationFn: (ack) => ('tier' in ack ? pointsService.markCelebrated(ack.tier) : pointsService.dismissWelcome()),
    onMutate: (ack) => {
      queryClient.setQueryData<PointsSummary>(queryKeys.users.myPoints(), (current) => {
        if (!current) return current
        return 'tier' in ack ? { ...current, pendingCelebration: null } : { ...current, showWelcome: false }
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.myPoints() })
    },
  })
}
