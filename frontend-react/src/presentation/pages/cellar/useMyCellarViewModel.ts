import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCellar } from '@hooks/queries/cellar/useCellar'
import { useRemoveCellarEntry } from '@hooks/queries/cellar/useRemoveCellarEntry'
import { useToast } from '@hooks/useToast'
import { useConfirm } from '@hooks/useConfirm'
import { formatDecimal } from '@utils/format'
import { summarizeCellar } from '@domain/cellar/cellar.stats'
import type { CellarWine } from '@domain/cellar/cellar.types'

export function useMyCellarViewModel() {
  const { t, i18n } = useTranslation()
  const language = i18n?.language
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { confirm } = useConfirm()

  const { data: cellarWines = [], isLoading, isError, error, refetch } = useCellar()
  const removeMutation = useRemoveCellarEntry()
  const [editingEntry, setEditingEntry] = useState<CellarWine | null>(null)
  const [publishingEntry, setPublishingEntry] = useState<CellarWine | null>(null)

  /** The app's cover figures; the purchase price stays on each wine, never summed. */
  const summary = useMemo(() => summarizeCellar(cellarWines), [cellarWines])
  const averageRating = summary.averageRating ?? 0

  const averageRatingLabel = useMemo(
    () => (averageRating > 0 ? formatDecimal(averageRating, 1, language) : '—'),
    [averageRating, language],
  )

  const handleEdit = useCallback((entry: CellarWine) => {
    setEditingEntry(entry)
  }, [])

  const handlePublishReview = useCallback((entry: CellarWine) => {
    if (entry.reviewId) navigate(`/wines/${entry.wine.id}?review=mine`)
    else setPublishingEntry(entry)
  }, [navigate])

  const closeEditModal = useCallback(() => {
    setEditingEntry(null)
  }, [])

  const handleDelete = useCallback(async (cellarWineId: string) => {
    const confirmed = await confirm({
      title: t('cellar.confirmDelete'),
      message: t('cellar.confirmDeleteDesc'),
      variant: 'danger',
      confirmLabel: t('common.delete'),
    })
    if (!confirmed) return

    removeMutation.mutate(cellarWineId, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('cellar.removeSuccess') })
      },
      onError: () => {
        addToast({ type: 'error', message: t('errors.generic', 'Error') })
      },
    })
  }, [addToast, confirm, removeMutation, t])

  return {
    cellarWines,
    isLoading,
    isError,
    error,
    retry: refetch,
    editingEntry,
    publishingEntry,
    handlePublishReview,
    closeReviewModal: () => setPublishingEntry(null),
    totalWines: summary.wineCount,
    averageRating,
    averageRatingLabel,
    regionCount: summary.regionCount,
    typeMix: summary.typeMix,
    handleEdit,
    closeEditModal,
    handleDelete,
  }
}
