import { useCallback, useEffect, useState } from 'react'
import type { AdminWinery } from '@domain/admin/admin.types'
import { useAdminWinerySearch } from '@hooks/queries/admin/useAdminLookupMutations'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

/**
 * Debounced winery search for the admin winery pickers (wine and route forms).
 * A newer query supersedes an older one, so a late response never overwrites
 * fresher results; `loading` covers the debounce so no empty state flashes.
 */
export function useAdminWineryPickerSearch() {
  const [query, setQueryState] = useState('')
  const [results, setResults] = useState<AdminWinery[]>([])
  const [loading, setLoading] = useState(false)
  const { mutateAsync: searchWineries } = useAdminWinerySearch()

  useEffect(() => {
    const search = query.trim()
    if (search.length < MIN_QUERY_LENGTH) return
    let stale = false
    const timer = setTimeout(async () => {
      try {
        const response = await searchWineries({ search, page: 0, size: 10 })
        if (!stale) setResults(response.items)
      } catch {
        if (!stale) setResults([])
      } finally {
        if (!stale) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [query, searchWineries])

  const setQuery = useCallback((value: string) => {
    setQueryState(value)
    const searchable = value.trim().length >= MIN_QUERY_LENGTH
    setLoading(searchable)
    if (!searchable) setResults([])
  }, [])

  return { query, setQuery, results, loading, minQueryLength: MIN_QUERY_LENGTH }
}
