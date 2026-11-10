import { useAdminEditorSession } from '@hooks/queries/admin/useAdminEditorSession'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import { useAdminWineries } from '@hooks/queries/admin/useAdminWineries'
import {
  useCreateAdminWinery,
  useUpdateAdminWinery,
  useDeleteAdminWinery,
} from '@hooks/queries/admin/useAdminWineryMutations'
import {
  useAdminCountries,
  useAdminRegions,
} from '@hooks/queries/admin/useAdminRegions'
import { useAdminWineryDetailMutation } from '@hooks/queries/admin/useAdminLookupMutations'
import { ROLES } from '@config/roles'
import type { AdminWinery } from '@domain/admin/admin.types'
import { toAdminWineryDraft, type AdminWineryFormValues } from '@domain/admin/adminWineryForm'
import {
  ADMIN_WINERIES_PAGE_SIZE,
  adminWineryRejectedFields,
  adminWinerySaveErrorMessage,
  buildAdminWineryPayload,
  createEmptyWineryDraft,
  type AdminWinerySaveResult,
} from './adminWineriesViewModel.helpers'

/**
 * Page view-model for winery management: list, filters, delete and the save
 * use case. The editor dialog owns the form state, geocoding and map pick.
 */
export function useAdminWineriesViewModel() {
  const { t } = useTranslation()
  const { hasRole } = useAuth()
  const { addToast } = useToast()
  const isAdmin = hasRole(ROLES.ADMIN)

  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [filterCountryId, setFilterCountryId] = useState<string | null>(null)
  const [filterRegionId, setFilterRegionId] = useState<string | null>(null)
  const editorSession = useAdminEditorSession()
  const [editingWinery, setEditingWinery] =
    useState<Partial<AdminWinery> | null>(null)
  // A new key per opened editor, so a reopened dialog always starts from fresh form state.
  const [editorKey, setEditorKey] = useState(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: countries } = useAdminCountries()
  const { data: filterRegions } = useAdminRegions(filterCountryId)

  const selectedFilterCountryName = useMemo(
    () => countries?.find((country) => country.id === filterCountryId)?.name,
    [countries, filterCountryId],
  )
  const selectedFilterRegionName = useMemo(
    () => filterRegions?.find((region) => region.id === filterRegionId)?.name,
    [filterRegions, filterRegionId],
  )

  const { data, isLoading, isError, refetch } = useAdminWineries(
    page,
    ADMIN_WINERIES_PAGE_SIZE,
    activeSearch || undefined,
    selectedFilterCountryName || undefined,
    selectedFilterRegionName || undefined,
  )

  const { mutateAsync: fetchWineryDetail } = useAdminWineryDetailMutation()
  const createMutation = useCreateAdminWinery()
  const updateMutation = useUpdateAdminWinery()
  const deleteMutation = useDeleteAdminWinery()

  const wineries = data?.items ?? []
  const totalItems = data?.totalItems ?? 0
  const totalPages = Math.ceil(totalItems / ADMIN_WINERIES_PAGE_SIZE)
  const saving = createMutation.isPending || updateMutation.isPending

  const handleSearch = useCallback(() => {
    setPage(0)
    setActiveSearch(search)
  }, [search])

  useEffect(() => {
    if (!search || search.trim().length >= 2) {
      const timer = setTimeout(() => {
        setPage(0)
        setActiveSearch(search)
      }, 350)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [search])

  const openCreate = useCallback(() => {
    editorSession.begin()
    setEditorKey((key) => key + 1)
    setEditingWinery(createEmptyWineryDraft())
  }, [editorSession])

  const openEdit = useCallback(
    async (winery: AdminWinery) => {
      const revision = editorSession.begin()
      try {
        const full = await fetchWineryDetail(winery.id)
        if (!editorSession.isCurrent(revision)) return
        setEditorKey((key) => key + 1)
        setEditingWinery(full)
      } catch {
        if (!editorSession.isCurrent(revision)) return
        addToast({ type: 'error', message: t('admin.feedback.loadError') })
      }
    },
    [editorSession, fetchWineryDetail, addToast, t],
  )

  const closeModal = useCallback(() => {
    editorSession.begin()
    setEditingWinery(null)
  }, [editorSession])

  const saveWinery = useCallback(
    async (values: AdminWineryFormValues): Promise<AdminWinerySaveResult> => {
      if (!editingWinery) return { saved: false, rejectedFields: [] }
      const payload = buildAdminWineryPayload(toAdminWineryDraft(values))
      try {
        if (editingWinery.id) {
          await updateMutation.mutateAsync({ id: editingWinery.id, payload })
          addToast({ type: 'success', message: t('admin.wineries.toastUpdated') })
        } else {
          await createMutation.mutateAsync(payload)
          addToast({ type: 'success', message: t('admin.wineries.toastCreated') })
        }
        closeModal()
        return { saved: true }
      } catch (err) {
        addToast({ type: 'error', message: adminWinerySaveErrorMessage(err, t) })
        return { saved: false, rejectedFields: adminWineryRejectedFields(err) }
      }
    },
    [addToast, closeModal, createMutation, editingWinery, t, updateMutation],
  )

  const handleDelete = useCallback(async () => {
    if (!confirmDeleteId) return
    await deleteMutation.mutateAsync(confirmDeleteId)
    setConfirmDeleteId(null)
  }, [confirmDeleteId, deleteMutation])

  const clearFilters = useCallback(() => {
    setPage(0)
    setFilterCountryId(null)
    setFilterRegionId(null)
  }, [])

  const onFilterCountryChange = useCallback((countryId: string | null) => {
    setPage(0)
    setFilterCountryId(countryId)
    setFilterRegionId(null)
  }, [])

  const onFilterRegionChange = useCallback((regionId: string | null) => {
    setPage(0)
    setFilterRegionId(regionId)
  }, [])

  return {
    t,
    isAdmin,
    page,
    setPage,
    search,
    setSearch,
    filterCountryId,
    filterRegionId,
    editingWinery,
    editorKey,
    confirmDeleteId,
    setConfirmDeleteId,
    countries,
    filterRegions,
    wineries,
    totalItems,
    totalPages,
    isLoading,
    isError,
    refetch,
    saving,
    handleSearch,
    openCreate,
    openEdit,
    saveWinery,
    handleDelete,
    clearFilters,
    onFilterCountryChange,
    onFilterRegionChange,
    closeModal,
  }
}
