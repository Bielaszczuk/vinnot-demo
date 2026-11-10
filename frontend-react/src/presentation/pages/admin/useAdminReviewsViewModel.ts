import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@hooks/useAuth'
import { useAdminReviews } from '@hooks/queries/admin/useAdminReviews'
import { useDeleteAdminReview } from '@hooks/queries/admin/useAdminReviewMutations'
import { ROLES } from '@config/roles'

const PAGE_SIZE = 20

export function useAdminReviewsViewModel() {
  const { t } = useTranslation()
  const { hasRole } = useAuth()
  const canDelete = hasRole(ROLES.ADMIN) || hasRole(ROLES.MODERATOR)

  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useAdminReviews(
    page,
    PAGE_SIZE,
    activeSearch || undefined,
  )
  const deleteMutation = useDeleteAdminReview()

  const reviews = data?.items ?? []
  const totalItems = data?.totalItems ?? 0
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)

  const handleSearch = useCallback(() => {
    setPage(0)
    setActiveSearch(search)
  }, [search])

  const openDeleteConfirm = useCallback((reviewId: string) => {
    setConfirmDeleteId(reviewId)
  }, [])

  const closeDeleteConfirm = useCallback(() => {
    setConfirmDeleteId(null)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!confirmDeleteId) return
    await deleteMutation.mutateAsync(confirmDeleteId)
    closeDeleteConfirm()
  }, [closeDeleteConfirm, confirmDeleteId, deleteMutation])

  return {
    t,
    canDelete,
    page,
    setPage,
    search,
    setSearch,
    isLoading,
    isError,
    refetch,
    reviews,
    totalItems,
    totalPages,
    confirmDeleteId,
    handleSearch,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
  }
}
