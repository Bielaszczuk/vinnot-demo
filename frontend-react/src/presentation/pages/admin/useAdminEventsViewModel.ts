import { eventBookingErrorKey } from '@domain/event/eventBookingError'
import { requestedEventStatus } from '@domain/event/eventEditor'
import { useAdminEditorSession } from '@hooks/queries/admin/useAdminEditorSession'
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import {
  useAdminEventDetail,
  useAdminEvents,
} from '@hooks/queries/admin/useAdminEvents'
import {
  useCreateAdminEvent,
  useUpdateAdminEvent,
  useDeleteAdminEvent,
} from '@hooks/queries/admin/useAdminEventMutations'
import { ROLES } from '@config/roles'
import type { EventFormData } from '@components/features/event/EventFormModal'
import type { AdminEvent, AdminEventPayload } from '@domain/admin/admin.types'
import type { Event } from '@domain/event/event.types'
import type { EventCancellation } from '@domain/event/eventCancellation'
import { normalizeError } from '@shared/utils/apiError'
import { apiErrorMessage } from '@/presentation/feedback/apiErrorMessage'
import { localDateTimeToIso } from '@shared/utils/dateTime'

const PAGE_SIZE = 20

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function nullablePositiveInteger(value: unknown): number | null {
  const parsed = nullableNumber(value)
  return parsed && parsed > 0 ? Math.trunc(parsed) : null
}

function buildEmptyEditingEvent(): Partial<Event> {
  const start = new Date()
  start.setSeconds(0, 0)
  start.setMinutes(0)
  start.setHours(start.getHours() + 1)
  const end = new Date(start)
  end.setHours(end.getHours() + 2)
  return {
    title: '',
    description: undefined,
    type: 'TASTING',
    status: 'DRAFT',
    startDate: start,
    endDate: end,
    location: {
      name: '',
      address: '',
      city: '',
      region: '',
      country: '',
      latitude: null,
      longitude: null,
    },
    imageUrl: null,
    price: null,
    maxAttendees: null,
    organizer: {
      id: '',
      name: '',
      email: '',
      phone: null,
    },
  }
}

function mapAdminEventToEditingEvent(e: AdminEvent): Partial<Event> {
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? undefined,
    type: e.type as Event['type'],
    status: e.status as Event['status'],
    startDate: new Date(e.startDate),
    endDate: new Date(e.endDate),
    location: {
      name: e.locationName ?? '',
      address: e.locationAddress ?? '',
      city: e.locationCity ?? '',
      region: e.locationRegion ?? '',
      country: e.locationCountry ?? '',
      latitude: e.latitude ?? null,
      longitude: e.longitude ?? null,
    },
    imageUrl: e.imageUrl ?? null,
    websiteUrl: e.websiteUrl ?? null,
    price: e.price ?? null,
    maxAttendees: e.maxAttendees ?? null,
    registration: {
      currency: e.currency ?? 'ARS',
      deadline: e.registrationDeadline
        ? new Date(e.registrationDeadline)
        : null,
      maxTicketsPerRegistration: e.maxTicketsPerRegistration ?? 6,
      approvalMode: e.approvalMode ?? 'MANUAL',
      attendeeConfirmationRequired: e.attendeeConfirmationRequired ?? true,
      holdMinutes: e.registrationHoldMinutes ?? 1440,
      paymentAlias: e.paymentAlias ?? null,
      paymentQrUrl: e.paymentQrUrl ?? null,
      paymentInstructions: e.paymentInstructions ?? null,
    },
    organizer: {
      id: '',
      name: '',
      email: e.contactEmail ?? '',
      phone: e.contactPhone ?? null,
    },
  }
}

export function useAdminEventsViewModel() {
  const { t } = useTranslation()
  const { hasRole } = useAuth()
  const { addToast } = useToast()

  const isAdmin = hasRole(ROLES.ADMIN)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const editorSession = useAdminEditorSession()
  const [showModal, updateShowModal] = useState(false)
  const setShowModal = useCallback(
    (open: boolean) => {
      if (!open) editorSession.begin()
      updateShowModal(open)
    },
    [editorSession],
  )
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useAdminEvents(
    page,
    PAGE_SIZE,
    activeSearch || undefined,
  )
  const eventDetailMutation = useAdminEventDetail()
  const createMutation = useCreateAdminEvent()
  const updateMutation = useUpdateAdminEvent()
  const deleteMutation = useDeleteAdminEvent()

  const events = data?.items ?? []
  const totalItems = data?.totalItems ?? 0
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)
  const saving = createMutation.isPending || updateMutation.isPending

  const handleSearch = useCallback(() => {
    setPage(0)
    setActiveSearch(search)
  }, [search])

  const openCreate = useCallback(() => {
    editorSession.begin()
    setEditingEvent(buildEmptyEditingEvent())
    setShowModal(true)
  }, [editorSession, setShowModal])

  const openEdit = useCallback(
    async (event: AdminEvent) => {
      const revision = editorSession.begin()
      try {
        const detail = await eventDetailMutation.mutateAsync(event.id)
        if (!editorSession.isCurrent(revision)) return
        setEditingEvent(mapAdminEventToEditingEvent(detail))
        setShowModal(true)
      } catch (error) {
        if (!editorSession.isCurrent(revision)) return
        addToast({
          type: 'error',
          message: apiErrorMessage(error, t, 'admin.events.toastLoadError'),
        })
      }
    },
    [addToast, editorSession, eventDetailMutation, setShowModal, t],
  )

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingEvent(null)
  }, [setShowModal])

  const saveEvent = useCallback(
    async (formData: EventFormData) => {
      if (!editingEvent) return false

      if (!formData.title) {
        addToast({
          type: 'warning',
          message: t('admin.events.toastTitleRequired'),
        })
        return false
      }

      const startDate = localDateTimeToIso(formData.startDate || '')
      const endDate = localDateTimeToIso(formData.endDate || '')

      if (!startDate || !endDate) {
        addToast({
          type: 'warning',
          message: t(
            'admin.events.toastDatesRequired',
            'Completá fecha de inicio y fin',
          ),
        })
        return false
      }

      if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
        addToast({
          type: 'warning',
          message: t(
            'admin.events.toastInvalidDateRange',
            'La fecha de fin no puede ser anterior al inicio',
          ),
        })
        return false
      }

      const payload: AdminEventPayload = {
        title: formData.title.trim(),
        description: nullableText(formData.description),
        type: formData.type || 'TASTING',
        startDate,
        endDate,
        locationName: nullableText(formData.locationName),
        locationAddress: nullableText(formData.locationAddress),
        locationCity: nullableText(formData.locationCity),
        locationRegion: nullableText(formData.locationRegion),
        locationCountry: nullableText(formData.locationCountry),
        latitude: nullableNumber(formData.latitude),
        longitude: nullableNumber(formData.longitude),
        price: nullableNumber(formData.price),
        maxAttendees: nullablePositiveInteger(formData.maxAttendees),
        currency: formData.currency.toUpperCase(),
        registrationDeadline: formData.registrationDeadline
          ? localDateTimeToIso(formData.registrationDeadline)
          : null,
        maxTicketsPerRegistration: formData.maxTicketsPerRegistration,
        approvalMode: formData.approvalMode,
        attendeeConfirmationRequired: formData.attendeeConfirmationRequired,
        registrationHoldMinutes: formData.registrationHoldMinutes,
        paymentAlias: nullableText(formData.paymentAlias),
        paymentQrUrl: nullableText(formData.paymentQrUrl),
        paymentInstructions: nullableText(formData.paymentInstructions),
        imageUrl: nullableText(formData.imageUrl),
        contactEmail: nullableText(formData.contactEmail),
        contactPhone: nullableText(formData.contactPhone),
        websiteUrl: nullableText(formData.websiteUrl),
      }
      const status = requestedEventStatus(editingEvent.id ? editingEvent.status : undefined, formData.status)
      if (status) payload.status = status

      try {
        if (editingEvent.id) {
          await updateMutation.mutateAsync({ id: editingEvent.id, payload })
          addToast({ type: 'success', message: t('admin.events.toastUpdated') })
        } else {
          await createMutation.mutateAsync(payload)
          addToast({ type: 'success', message: t('admin.events.toastCreated') })
        }
        closeModal()
        return true
      } catch (err) {
        addToast({
          type: 'error',
          message: t(
            eventBookingErrorKey(
              normalizeError(err).code,
              'admin.events.toastSaveError',
            ),
            {
              message: apiErrorMessage(err, t, 'admin.common.unknownError'),
            },
          ),
        })
        return false
      }
    },
    [addToast, closeModal, createMutation, editingEvent, t, updateMutation],
  )

  const confirmDeleteTitle =
    events.find((event) => event.id === confirmDeleteId)?.title ?? ''
  const cancelling = deleteMutation.isPending

  const closeDeleteConfirm = useCallback(() => {
    if (!deleteMutation.isPending) setConfirmDeleteId(null)
  }, [deleteMutation.isPending])

  const handleDelete = useCallback(async (cancellation: EventCancellation) => {
    if (!confirmDeleteId || deleteMutation.isPending) return
    try {
      await deleteMutation.mutateAsync({ id: confirmDeleteId, cancellation })
      setConfirmDeleteId(null)
      addToast({ type: 'success', message: t('admin.events.toastCancelled') })
    } catch {
      addToast({ type: 'error', message: t('admin.feedback.deleteError') })
    }
  }, [confirmDeleteId, deleteMutation, addToast, t])

  return {
    t,
    isAdmin,
    page,
    setPage,
    search,
    setSearch,
    events,
    totalItems,
    totalPages,
    isLoading,
    isError,
    refetch,
    showModal,
    editingEvent,
    saving,
    confirmDeleteId,
    confirmDeleteTitle,
    setConfirmDeleteId,
    closeDeleteConfirm,
    cancelling,
    handleSearch,
    openCreate,
    openEdit,
    closeModal,
    saveEvent,
    handleDelete,
  }
}
