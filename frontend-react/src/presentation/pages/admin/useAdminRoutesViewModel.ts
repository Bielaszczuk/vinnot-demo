import { useAdminEditorSession } from '@hooks/queries/admin/useAdminEditorSession'
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import { useAdminRoutes } from '@hooks/queries/admin/useAdminRoutes'
import {
  useCreateAdminRoute,
  useUpdateAdminRoute,
  useDeleteAdminRoute,
} from '@hooks/queries/admin/useAdminRouteMutations'
import { useAdminRouteDetailMutation } from '@hooks/queries/admin/useAdminLookupMutations'
import { useAdminWineryPickerSearch } from '@hooks/queries/admin/useAdminWineryPickerSearch'
import { ROLES } from '@config/roles'
import type { AdminRoute, AdminRouteStop } from '@domain/admin/admin.types'
import { toAdminRouteDraft, type AdminRouteFormValues } from '@domain/admin/adminRouteForm'
import {
  ADMIN_ROUTES_PAGE_SIZE,
  adminRouteRejectedFields,
  adminRouteSaveErrorMessage,
  buildAdminRoutePayload,
  createEmptyRouteDraft,
  type AdminRouteSaveResult,
} from './adminRoutesViewModel.helpers'

/**
 * Page view-model for route management: list, search, delete and the save use
 * case. The editor dialog owns the form state, the stops and their geocoding.
 */
export function useAdminRoutesViewModel() {
  const { t } = useTranslation()
  const { hasRole } = useAuth()
  const { addToast } = useToast()
  const isAdmin = hasRole(ROLES.ADMIN)

  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const { data, isLoading, isError, refetch } = useAdminRoutes(
    page,
    ADMIN_ROUTES_PAGE_SIZE,
    activeSearch || undefined,
  )

  const editorSession = useAdminEditorSession()
  const [editingRoute, setEditingRoute] = useState<Partial<AdminRoute> | null>(null)
  // A new key per opened editor, so a reopened dialog always starts from fresh form state.
  const [editorKey, setEditorKey] = useState(0)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const wineryPicker = useAdminWineryPickerSearch()
  const resetWineryQuery = wineryPicker.setQuery
  const createMutation = useCreateAdminRoute()
  const updateMutation = useUpdateAdminRoute()
  const deleteMutation = useDeleteAdminRoute()
  const { mutateAsync: fetchRouteDetail } = useAdminRouteDetailMutation()

  const routes = data?.items ?? []
  const totalItems = data?.totalItems ?? 0
  const totalPages = Math.ceil(totalItems / ADMIN_ROUTES_PAGE_SIZE)
  const saving = createMutation.isPending || updateMutation.isPending

  const handleSearch = useCallback(() => {
    setPage(0)
    setActiveSearch(search)
  }, [search])

  const startEditor = useCallback((route: Partial<AdminRoute>) => {
    resetWineryQuery('')
    setEditorKey((key) => key + 1)
    setEditingRoute(route)
  }, [resetWineryQuery])

  const openCreate = useCallback(() => {
    editorSession.begin()
    setLoadingDetail(false)
    startEditor(createEmptyRouteDraft())
  }, [editorSession, startEditor])

  const openEdit = useCallback(async (route: AdminRoute) => {
    const revision = editorSession.begin()
    setEditingRoute(null)
    setLoadingDetail(true)
    try {
      const detail = await fetchRouteDetail(route.id)
      if (!editorSession.isCurrent(revision)) return
      startEditor({ ...detail, recommendedWineTypes: detail.recommendedWineTypes || [] })
    } catch {
      if (!editorSession.isCurrent(revision)) return
      addToast({ type: 'error', message: t('admin.feedback.loadError') })
    } finally {
      if (editorSession.isCurrent(revision)) setLoadingDetail(false)
    }
  }, [addToast, editorSession, fetchRouteDetail, startEditor, t])

  const closeEditor = useCallback(() => {
    editorSession.begin()
    setLoadingDetail(false)
    setEditingRoute(null)
  }, [editorSession])

  const saveRoute = useCallback(
    async (values: AdminRouteFormValues, stops: AdminRouteStop[]): Promise<AdminRouteSaveResult> => {
      if (!editingRoute) return { saved: false, rejectedFields: [] }
      const payload = buildAdminRoutePayload({ ...editingRoute, ...toAdminRouteDraft(values, stops) }, stops)
      try {
        if (editingRoute.id) {
          await updateMutation.mutateAsync({ id: editingRoute.id, payload })
          addToast({ type: 'success', message: t('admin.routes.toastUpdated') })
        } else {
          await createMutation.mutateAsync(payload)
          addToast({ type: 'success', message: t('admin.routes.toastCreated') })
        }
        closeEditor()
        return { saved: true }
      } catch (err) {
        addToast({ type: 'error', message: adminRouteSaveErrorMessage(err, t) })
        return { saved: false, rejectedFields: adminRouteRejectedFields(err) }
      }
    },
    [addToast, closeEditor, createMutation, editingRoute, t, updateMutation],
  )

  const handleDelete = useCallback(async () => {
    if (!confirmDeleteId) return
    await deleteMutation.mutateAsync(confirmDeleteId)
    setConfirmDeleteId(null)
  }, [confirmDeleteId, deleteMutation])

  return {
    t,
    isAdmin,
    page,
    setPage,
    search,
    setSearch,
    routes,
    totalItems,
    totalPages,
    isLoading,
    isError,
    refetch,
    editingRoute,
    editorKey,
    loadingDetail,
    wineryPicker,
    confirmDeleteId,
    setConfirmDeleteId,
    saving,
    handleSearch,
    openCreate,
    openEdit,
    closeEditor,
    saveRoute,
    handleDelete,
  }
}
