/**
 * useWineComparison — compare two wines via AI
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { winesService } from '@services/wines.service'
import type { WineComparison } from '@domain/wine/wine.types'
import { useTranslation } from 'react-i18next'

export function useWineComparison(wineAId: string | undefined, wineBId: string | undefined) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'es'

  return useQuery<WineComparison>({
    queryKey: queryKeys.wines.comparison(wineAId!, wineBId!, lang),
    queryFn: () => winesService.compareWines(wineAId!, wineBId!, lang),
    enabled: !!wineAId && !!wineBId,
    // This query can generate paid content. Recovery must be an explicit action.
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })
}
