import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWine } from '@hooks/queries/wine/useWine'
import { useWineComparison } from '@hooks/queries/wine/useWineComparison'
import { useWineSearch } from '@hooks/queries/wine/useWineSearch'
import type { WineComparison, WineSummary } from '@domain/wine/wine.types'
import { formatWineDisplayName } from '@utils/wine'

type CompareOriginState = {
  fromWineId?: string
  fromPath?: string
}

const SEARCH_PAGE_SIZE = 20

function buildCompareUrl(wineAId: string, compareWith: string | null): string {
  const base = wineAId ? `/wines/compare/${wineAId}` : '/wines/compare'
  if (!compareWith) return base
  return `${base}?compareWith=${encodeURIComponent(compareWith)}`
}

export function useWineCompareViewModel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { wineAId: routeWineAId } = useParams<{ wineAId?: string }>()
  const [searchParams] = useSearchParams()
  const compareOrigin = location.state as CompareOriginState | null
  const queryCompareWith = searchParams.get('compareWith')

  const wineAId = routeWineAId ?? ''
  const wineBId = queryCompareWith ?? ''

  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<WineSummary[]>([])
  const [searchPage, setSearchPage] = useState(0)
  const [searchHasMore, setSearchHasMore] = useState(false)
  const [selectingFor, setSelectingFor] = useState<'A' | 'B'>('B')
  const searchListRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const { data: wineA } = useWine(wineAId || undefined)
  const { data: wineB } = useWine(wineBId || undefined)

  // A wine is never compared with itself (the API rejects it with DISTINCT_COMPARISON_WINES).
  const distinctWineBId = wineBId && wineBId !== wineAId ? wineBId : undefined
  const { data: comparison, isFetching: loadingComparison, isError: comparisonError, refetch } = useWineComparison(
    wineAId || undefined,
    distinctWineBId,
  )

  useEffect(() => {
    if (!searchModalOpen) return
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 100)
    return () => window.clearTimeout(timer)
  }, [searchModalOpen])

  const {
    data: searchData,
    isLoading: searchingFirstPage,
    isFetching: searching,
  } = useWineSearch(searchQuery.length >= 2 ? searchQuery : '', {}, searchPage, SEARCH_PAGE_SIZE)

  const updateSearchQuery = useCallback((value: string) => {
    setSearchQuery(value)
    setSearchPage(0)
    if (value.length < 2) {
      setSearchResults([])
      setSearchHasMore(false)
    }
  }, [])

  useEffect(() => {
    if (!searchModalOpen) return

    if (searchQuery.length < 2) return

    const pageWines = searchData?.wines ?? []
    const hasNext = searchData?.pagination?.hasNext ?? false
    const frame = window.requestAnimationFrame(() => {
      if (searchPage === 0) {
        setSearchResults(pageWines)
      } else {
        setSearchResults((prev) => {
          const existingIds = new Set(prev.map((wine) => wine.id))
          const merged = [...prev]
          for (const wine of pageWines) {
            if (!existingIds.has(wine.id)) {
              merged.push(wine)
            }
          }
          return merged
        })
      }

      setSearchHasMore(hasNext)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [searchData, searchModalOpen, searchPage, searchQuery])

  const openSearchModal = useCallback((forWine: 'A' | 'B') => {
    setSelectingFor(forWine)
    updateSearchQuery('')
    setSearchModalOpen(true)
  }, [updateSearchQuery])

  const loadMoreSearchResults = useCallback(() => {
    if (searching || !searchHasMore) return
    setSearchPage((prev) => prev + 1)
  }, [searchHasMore, searching])

  const onSearchScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget
    const threshold = 100
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
      loadMoreSearchResults()
    }
  }, [loadMoreSearchResults])

  const otherSlotWineId = selectingFor === 'A' ? wineBId : (wineAId || routeWineAId || '')
  const selectableResults = useMemo(
    () => searchResults.filter((wine) => wine.id !== otherSlotWineId),
    [otherSlotWineId, searchResults],
  )

  const selectWine = useCallback((wine: WineSummary) => {
    if (wine.id === otherSlotWineId) return
    setSearchModalOpen(false)
    updateSearchQuery('')

    if (selectingFor === 'A') {
      const compareWith = wineBId || queryCompareWith
      navigate(buildCompareUrl(wine.id, compareWith), { replace: true, state: compareOrigin })
      return
    }

    const effectiveWineAId = wineAId || routeWineAId || ''
    navigate(buildCompareUrl(effectiveWineAId, wine.id), { replace: true, state: compareOrigin })
  }, [compareOrigin, navigate, otherSlotWineId, queryCompareWith, routeWineAId, selectingFor, updateSearchQuery, wineAId, wineBId])

  const clearAll = useCallback(() => {
    updateSearchQuery('')
    navigate('/wines/compare', { replace: true, state: compareOrigin })
  }, [compareOrigin, navigate, updateSearchQuery])

  const goToWineDetails = useCallback((id: string) => {
    navigate(`/wines/${id}`)
  }, [navigate])

  const backToOrigin = useCallback(() => {
    if (!compareOrigin?.fromPath) return
    navigate(compareOrigin.fromPath)
  }, [compareOrigin, navigate])

  const isCached = comparison?.fromCache ?? false
  const keyDifferences = useMemo(
    () => comparison?.keyDifferences ?? comparison?.differences ?? [],
    [comparison],
  )

  const wineALabel = formatWineDisplayName(wineA?.name ?? '', wineA?.grapeVarieties)
  const wineBLabel = formatWineDisplayName(wineB?.name ?? '', wineB?.grapeVarieties)
  const richSections = useMemo(() => buildRichSections(comparison), [comparison])

  const barWidth = useCallback((score: number | undefined): string => {
    return `${score || 0}%`
  }, [])

  return {
    t,
    compareOrigin,
    wineA,
    wineB,
    loadingComparison,
    comparisonError,
    retryComparison: () => { if (!loadingComparison) void refetch() },
    comparison,
    isCached,
    keyDifferences,
    searchModalOpen,
    setSearchModalOpen,
    searchInputRef,
    searchListRef,
    searchQuery,
    updateSearchQuery,
    searchPage,
    setSearchPage,
    searchingFirstPage,
    searching,
    searchResults: selectableResults,
    openSearchModal,
    onSearchScroll,
    selectWine,
    clearAll,
    goToWineDetails,
    backToOrigin,
    barWidth,
    wineALabel,
    wineBLabel,
    ...richSections,
  }
}

/**
 * Derives what the richer comparison (#491) shows. Legacy cached content has none of the new
 * fields, so `hasRichContent` stays false and the page renders exactly as before: no summary
 * intro and no verdict label (the verdict tile keeps falling back to the summary).
 */
function buildRichSections(comparison: WineComparison | undefined) {
  const chooseIf = comparison?.chooseIf ?? []
  const hasRichContent = Boolean(
    comparison?.tastingNotes || chooseIf.length > 0 || comparison?.pairings
      || comparison?.serving || comparison?.aging || comparison?.value,
  )
  return {
    hasRichContent,
    summaryIntro: hasRichContent && comparison?.recommendation ? comparison.summary : undefined,
    verdict: comparison?.recommendation || comparison?.summary || undefined,
    chooseIfByWine: chooseIf.length > 0
      ? { wineA: chooseIf.filter((item) => item.pick === 'A'), wineB: chooseIf.filter((item) => item.pick === 'B') }
      : undefined,
  }
}
