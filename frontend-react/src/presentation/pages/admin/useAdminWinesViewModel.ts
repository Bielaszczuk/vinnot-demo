import { useAdminEditorSession } from '@hooks/queries/admin/useAdminEditorSession'
import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { useAdminWines } from '@hooks/queries/admin/useAdminWines'
import { useWineTypes } from '@hooks/queries/wine/useWineTypes'
import { wineTypeLabel } from '@shared/i18n/wineTypeLabel'
import {
  useCreateAdminWine,
  useUpdateAdminWine,
  useDeleteAdminWine,
} from '@hooks/queries/admin/useAdminWineMutations'
import { useAdminWineDetailMutation } from '@hooks/queries/admin/useAdminLookupMutations'
import { useAdminWineryPickerSearch } from '@hooks/queries/admin/useAdminWineryPickerSearch'
import type { AdminWine } from '@domain/admin/admin.types'
import { toAdminWineDraft, type AdminWineFormValues } from '@domain/admin/adminWineForm'
import {
  ADMIN_WINES_PAGE_SIZE,
  buildAdminWinePayload,
  createEmptyWineDraft,
} from './adminWinesViewModel.helpers'
import { adminSaveErrorMessage } from '@/presentation/feedback/apiErrorMessage'

type Params = {
  navigate: (to: string) => void
}

export function useAdminWinesViewModel({ navigate }: Params) {
  const { t, i18n } = useTranslation()
  const { data: wineTypes = [] } = useWineTypes()
  const english = i18n?.language?.startsWith('en') === true
  const wineTypeOptions = wineTypes.map((type) => ({
    value: type.code,
    label: wineTypeLabel(t, type.value, english ? type.names.en : type.names.es),
  }))
  const { addToast } = useToast()

  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const { data, isLoading, isError, refetch } = useAdminWines(
    page,
    ADMIN_WINES_PAGE_SIZE,
    activeSearch || undefined,
  )

  const editorSession = useAdminEditorSession()
  const [editingWine, setEditingWine] = useState<Partial<AdminWine> | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmAiWineId, setConfirmAiWineId] = useState<string | null>(null)

  const wineryPicker = useAdminWineryPickerSearch()
  const setWineryQuery = wineryPicker.setQuery

  const createMutation = useCreateAdminWine()
  const updateMutation = useUpdateAdminWine()
  const deleteMutation = useDeleteAdminWine()
  const { mutateAsync: fetchWineDetail } = useAdminWineDetailMutation()

  const wines = data?.items ?? []
  const totalItems = data?.totalItems ?? 0
  const totalPages = Math.ceil(totalItems / ADMIN_WINES_PAGE_SIZE)

  const handleSearch = useCallback(() => {
    setPage(0)
    setActiveSearch(search)
  }, [search])

  useEffect(() => {
    if (!search || search.trim().length >= 2) {
      const timer = setTimeout(() => {
        setPage(0)
        setActiveSearch(search)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [search])

  /** Closes the editor; a detail request still in flight is ignored when it lands. */
  const closeEditor = useCallback(() => {
    editorSession.begin()
    setEditingWine(null)
    setLoadingDetails(false)
  }, [editorSession])

  function openCreate() {
    editorSession.begin()
    setLoadingDetails(false)
    setWineryQuery('')
    setEditingWine(createEmptyWineDraft())
  }

  async function openEdit(w: AdminWine) {
    const revision = editorSession.begin()
    setLoadingDetails(true)
    setEditingWine({ ...w, grapes: w.grapes || [], allergens: w.allergens || [] })
    setWineryQuery(w.wineryName || '')
    try {
      const full = await fetchWineDetail(w.id)
      if (!editorSession.isCurrent(revision)) return
      setEditingWine({ ...full, grapes: full.grapes || [], allergens: full.allergens || [] })
      setWineryQuery(full.wineryName || '')
      setLoadingDetails(false)
    } catch {
      if (!editorSession.isCurrent(revision)) return
      closeEditor()
      addToast({ type: 'error', message: t('admin.feedback.loadError') })
    }
  }

  function onAiProfileAction(wineId: string) {
    setConfirmAiWineId(wineId)
  }

  function confirmGenerateAiProfile() {
    if (!confirmAiWineId) return
    const wineId = confirmAiWineId
    setConfirmAiWineId(null)
    closeEditor()
    navigate(`/wines/${wineId}/ai-profile?generate=1`)
  }

  function openFullAiProfile() {
    const wineId = editingWine?.id
    if (!wineId) return
    closeEditor()
    navigate(`/admin/wines/${wineId}/ai-profile`)
  }

  /** Saves the form through the unchanged payload builder; resolves `true` once the wine is saved. */
  async function saveWine(values: AdminWineFormValues): Promise<boolean> {
    if (!editingWine) return false
    const { wine, scores } = toAdminWineDraft(values)
    const payload = buildAdminWinePayload(wine, scores)
    try {
      if (editingWine.id) {
        await updateMutation.mutateAsync({ id: editingWine.id, payload })
        addToast({ type: 'success', message: t('admin.wines.toastUpdated') })
      } else {
        await createMutation.mutateAsync(payload)
        addToast({ type: 'success', message: t('admin.wines.toastCreated') })
      }
      closeEditor()
      return true
    } catch (err) {
      addToast({ type: 'error', message: adminSaveErrorMessage(err, t, 'wines') })
      return false
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return
    await deleteMutation.mutateAsync(confirmDeleteId)
    setConfirmDeleteId(null)
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return {
    wineTypeOptions,
    page,
    setPage,
    search,
    setSearch,
    isLoading,
    isError,
    refetch,
    wines,
    totalItems,
    totalPages,
    editingWine,
    loadingDetails,
    closeEditor,
    confirmDeleteId,
    setConfirmDeleteId,
    confirmAiWineId,
    setConfirmAiWineId,
    winerySearch: wineryPicker.query,
    setWinerySearch: setWineryQuery,
    wineryResults: wineryPicker.results,
    wineryPicker,
    saving,
    handleSearch,
    openCreate,
    openEdit,
    onAiProfileAction,
    confirmGenerateAiProfile,
    openFullAiProfile,
    saveWine,
    handleDelete,
  }
}
