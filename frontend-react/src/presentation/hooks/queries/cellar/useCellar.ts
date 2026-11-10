/**
 * useCellar — fetches all cellar entries for the current user
 *
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { cellarService } from '@services/cellar.service'
import type { CellarWine } from '@domain/cellar/cellar.types'

export function useCellar(options?: { enabled?: boolean }) {
  return useQuery<CellarWine[]>({
    queryKey: queryKeys.cellar.lists(),
    queryFn: () => cellarService.fetchCellar(),
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
  })
}

