/**
 * useWines — paginated wine list query
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { winesService, type WinesResult } from '@services/wines.service'
import type { WineFilter } from '@domain/wine/wine.types'

export function useWines(filter?: WineFilter, page = 0, pageSize = 20) {
  return useQuery<WinesResult>({
    queryKey: queryKeys.wines.list({ ...filter, page, pageSize }),
    queryFn: () => winesService.getWines(filter, page, pageSize),
    placeholderData: keepPreviousData,
  })
}

