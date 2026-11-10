/**
 * useMyPoints — the signed-in user's points, wax-seal tier and history.
 *
 * Flow: page → hook → points service → users client → http
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { pointsService } from '@services/points.service'
import type { PointsSummary } from '@domain/points/points.types'

export function useMyPoints(enabled = true) {
  return useQuery<PointsSummary>({
    queryKey: queryKeys.users.myPoints(),
    queryFn: () => pointsService.getMyPoints(),
    enabled,
  })
}
