import { useState, useCallback, useMemo, useRef } from 'react'
import { wineQuickInfo } from '@domain/wine/wine.quick-info'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWine } from '@hooks/queries/wine/useWine'
import { useAiProfileStatus } from '@hooks/queries/wine/useAiProfileStatus'
import { useAuth } from '@hooks/useAuth'
import { useAuthReturnPath } from '@hooks/useAuthReturnPath'
import { useMyReviewStatus } from '@hooks/queries/wine/useMyReviewStatus'
import { useReducedMotion } from '@hooks/useReducedMotion'
import { useCellar } from '@hooks/queries/cellar/useCellar'
import { useCellarQuickAdd } from '@hooks/queries/wine/useCellarQuickAdd'
import { useShareLink } from '@hooks/useShareLink'
import { useToast } from '@hooks/useToast'
import { useBackNavigation } from '@hooks/useBackNavigation'
import { wineTypeLabel } from '@shared/i18n/wineTypeLabel'
import { isNotFoundError } from '@/presentation/feedback/illustratedState'

export function useWineDetailsViewModel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const shareLink = useShareLink()
  const { t, i18n } = useTranslation()
  const { data: catalogWine, isLoading, isError, error, refetch } = useWine(id)
  const loadFailed = isError && !catalogWine && !isNotFoundError(error)
  const wine = useMemo(() => wineQuickInfo(catalogWine, i18n.language), [catalogWine, i18n.language])
  const { data: aiProfileStatus } = useAiProfileStatus(id)
  const { isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const { currentLoginPath } = useAuthReturnPath()
  const reducedMotion = useReducedMotion()

  const { data: cellarWines = [] } = useCellar({ enabled: isAuthenticated })
  const isInCellar = useMemo(
    () => cellarWines.some((cw) => cw.wine?.id === id),
    [cellarWines, id],
  )
  const [showCellarModal, setShowCellarModal] = useState(false)
  const [addingToCellar, setAddingToCellar] = useState(false)
  const [cellarForm, setCellarForm] = useState<{
    rating: number | null
    purchasePrice: number | null
    notes: string
    vintage?: number | null
  }>({ rating: null, purchasePrice: null, notes: '', vintage: null })
  const quickAdd = useCellarQuickAdd()

  const aiProfileExists = aiProfileStatus?.status === 'READY'

  const goBack = useBackNavigation('/wines')
  const goToCellar = useCallback(() => navigate('/cellar'), [navigate])

  const confirmAddToCellar = useCallback(async () => {
    if (!wine) return
    setAddingToCellar(true)
    try {
      await quickAdd.mutateAsync({
        wineId: wine.id,
        rating: cellarForm.rating,
        purchasePrice: cellarForm.purchasePrice,
        notes: cellarForm.notes || null,
        vintage: cellarForm.vintage ?? null,
      })
      setShowCellarModal(false)
      setCellarForm({ rating: null, purchasePrice: null, notes: '', vintage: null })
      addToast({ type: 'success', message: t('cellar.addSuccess') })
    } catch {
      addToast({ type: 'error', message: t('errors.generic', 'Error') })
    } finally {
      setAddingToCellar(false)
    }
  }, [wine, cellarForm, quickAdd, addToast, t])

  const hasTasteScores = [wine?.acidityScore, wine?.tanninScore, wine?.bodyScore, wine?.sweetnessScore]
    .some((score) => score != null)

  const shareWine = useCallback(() => {
    if (wine) return shareLink({ kind: 'wines', id: wine.id, title: wine.name })
  }, [shareLink, wine])

  // Hero "write review" shortcut: the reviews card opens its own form, or pins the reader's review.
  const { data: myReviewStatus } = useMyReviewStatus(id, isAuthenticated)
  const hasOwnReview = isAuthenticated && !!myReviewStatus?.hasReview
  const reviewsSectionRef = useRef<HTMLDivElement>(null)
  const [reviewRequest, setReviewRequest] = useState({ count: 0, ownReview: false })
  const openReviews = useCallback(() => {
    if (!isAuthenticated) {
      navigate(currentLoginPath)
      return
    }
    setReviewRequest((current) => ({ count: current.count + 1, ownReview: hasOwnReview }))
    reviewsSectionRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }, [isAuthenticated, navigate, currentLoginPath, hasOwnReview, reducedMotion])

  return {
    focusOwnReview: searchParams.get('review') === 'mine',
    shareWine,
    hasOwnReview,
    openReviews,
    reviewsSectionRef,
    reviewRequest: reviewRequest.count,
    pinOwnReview: reviewRequest.ownReview,
    t,
    id,
    wine,
    typeLabel: wineTypeLabel(t, wine?.type),
    isLoading,
    loadFailed,
    loadError: error,
    retry: () => void refetch(),
    isAuthenticated,
    isInCellar,
    aiProfileExists,
    showCellarModal,
    setShowCellarModal,
    addingToCellar,
    cellarForm,
    setCellarForm,
    hasTasteScores,
    goBack,
    goToCellar,
    confirmAddToCellar,
  }
}
