/**
 * useWineSearch — search wines with debounced query
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { winesService, type WinesResult } from '@services/wines.service'
import type { WineFilter } from '@domain/wine/wine.types'
import { useDebounce } from '@hooks/useDebounce'

export function useWineSearch(
  search: string,
  filter?: Omit<WineFilter, 'search'>,
  page = 0,
  pageSize = 20,
  enabled = true,
) {
  const debouncedSearch = useDebounce(search, 400)
  const trimmedSearch = debouncedSearch.trim()
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined
  const mergedFilter: WineFilter = { ...filter, search: effectiveSearch }

  return useQuery<WinesResult>({
    enabled,
    queryKey: queryKeys.wines.search({ ...mergedFilter, page, pageSize }),
    queryFn: () => winesService.getWines(mergedFilter, page, pageSize),
    placeholderData: keepPreviousData,
  })
}
