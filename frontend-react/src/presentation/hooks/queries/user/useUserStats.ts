/**
 * useUserStats — query hook for current user's stats
 *
 * Fetches reviews count, cellar size, events attended, average rating.
 * Flow: page → hook → service → client → http
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { usersService } from '@services/users.service'
import type { UserStats } from '@domain/user/user.types'

export function useUserStats(enabled = true) {
  return useQuery<UserStats>({
    queryKey: queryKeys.users.myStats(),
    queryFn: () => usersService.getMyStats(),
    enabled,
  })
}

