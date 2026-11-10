import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export type UrlFilterChanges<K extends string> = Partial<Record<K | 'page', string | number | null | undefined>>

/**
 * Search text, filters and page kept in the URL query, so they survive Back,
 * reloads and shared links (the wine search pattern). Empty values and page 0
 * are left out of the URL. Changing any filter without passing `page` returns
 * to the first page. Updates replace the current history entry.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [searchParams, setSearchParams] = useSearchParams()
  const values = Object.fromEntries(keys.map((key) => [key, searchParams.get(key) ?? ''])) as Record<K, string>
  const requestedPage = Number(searchParams.get('page'))
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 0

  const update = useCallback((changes: UrlFilterChanges<K>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (!('page' in changes)) next.delete('page')
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === '' || (key === 'page' && value === 0)) next.delete(key)
        else next.set(key, String(value))
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  return { values, page, update }
}
