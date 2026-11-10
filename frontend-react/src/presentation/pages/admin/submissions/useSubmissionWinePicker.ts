import { useState } from 'react'
import type { AdminWine } from '@domain/admin/admin.types'
import { useAdminWines } from '@hooks/queries/admin/useAdminWines'
import { useDebounce } from '@hooks/useDebounce'

const MIN_QUERY_LENGTH = 2
const RESULT_LIMIT = 10

/**
 * Debounced catalog wine search for the merge target. Nothing is searched
 * until two characters are typed; `loading` covers the debounce so no empty
 * state flashes while the admin is still typing.
 */
export function useSubmissionWinePicker() {
  const [query, setQuery] = useState('')
  const typed = query.trim()
  const debounced = useDebounce(typed, 300).trim()
  const searchable = debounced.length >= MIN_QUERY_LENGTH
  const { data, isFetching } = useAdminWines(0, RESULT_LIMIT, searchable ? debounced : undefined)
  const results: AdminWine[] = searchable ? data?.items ?? [] : []
  const loading = typed.length >= MIN_QUERY_LENGTH && (typed !== debounced || isFetching)
  return { query, setQuery, results, loading, minQueryLength: MIN_QUERY_LENGTH }
}
