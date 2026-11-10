import { eventBookingErrorKey } from '@domain/event/eventBookingError'
import { normalizeError } from '@shared/utils/apiError'
import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { usePartnerEvents } from '@hooks/queries/partner/usePartnerEvents'
import { usePartnerEventDetail } from '@hooks/queries/partner/usePartnerEventDetail'
import {
  useCreatePartnerEvent,
  useUpdatePartnerEvent,
  useDeletePartnerEvent,
} from '@hooks/queries/partner/usePartnerEventMutations'
import { useToast } from '@hooks/useToast'
import type { EventFormData } from '@components/features/event/EventFormModal'
import type {
  PartnerEvent,
  PartnerEventPayload,
} from '@domain/partner/partner.types'
import type { Event } from '@domain/event/event.types'
import type { EventCancellation } from '@domain/event/eventCancellation'
import { localDateTimeToIso } from '@shared/utils/dateTime'
import { requestedEventStatus } from '@domain/event/eventEditor'

const PAGE_SIZE = 20

function mapPartnerEventDetailToEditingEvent(
  detail: PartnerEvent,
): Partial<Event> {
  return {
    id: detail.id,
    title: detail.title,
    description: detail.description ?? '',
    type: detail.type as Event['type'],
    status: detail.status as Event['status'],
    startDate: new Date(detail.startDate),
    endDate: new Date(detail.endDate),
    location: {
      name: detail.locationName ?? '',
      address: detail.locationAddress ?? '',
      city: detail.locationCity ?? '',
      region: detail.locationRegion ?? '',
      country: detail.locationCountry ?? '',
      latitude: detail.latitude ?? null,
      longitude: detail.longitude ?? null,
    },
    imageUrl: detail.imageUrl ?? null,
    websiteUrl: detail.websiteUrl ?? null,
    price: detail.price ?? null,
    maxAttendees: detail.maxAttendees ?? null,
    registration: {
      currency: detail.currency,
      deadline: detail.registrationDeadline
        ? new Date(detail.registrationDeadline)
        : null,
      maxTicketsPerRegistration: detail.maxTicketsPerRegistration,
      approvalMode: detail.approvalMode,
      attendeeConfirmationRequired: detail.attendeeConfirmationRequired,
      holdMinutes: detail.registrationHoldMinutes,
      paymentAlias: detail.paymentAlias,
      paymentQrUrl: detail.paymentQrUrl,
      paymentInstructions: detail.paymentInstructions,
    },
    organizer: {
      id: '',
      name: '',
      email: detail.contactEmail ?? '',
      phone: detail.contactPhone ?? null,
    },
  }
}

export function usePartnerEventsViewModel() {
  const { t } = useTranslation()
  const { addToast } = useToast()

  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null)
  const [registrationsEvent, setRegistrationsEvent] = useState<Pick<
    PartnerEvent,
    'id' | 'title'
  > | null>(null)
  const [saving, setSaving] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Pick<
    PartnerEvent,
    'id' | 'title'
  > | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const cancellationInFlight = useRef(false)

  const { data, isLoading, isError, error, refetch } = usePartnerEvents(page, PAGE_SIZE)
  const eventDetailMutation = usePartnerEventDetail()
  const createMutation = useCreatePartnerEvent()
  const updateMutation = useUpdatePartnerEvent()
  const deleteMutation = useDeletePartnerEvent()

  const events = data?.items ?? []
  const totalItems = data?.totalItems ?? 0
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)

  const openCreate = useCallback(() => {
    setEditingEvent(null)
    setShowModal(true)
  }, [])

  const openEdit = useCallback(
    async (eventId: string) => {
      try {
        const detail = await eventDetailMutation.mutateAsync(eventId)
        setEditingEvent(mapPartnerEventDetailToEditingEvent(detail))
        setShowModal(true)
      } catch {
        addToast({ type: 'error', message: t('partner.events.toastLoadError') })
      }
    },
    [addToast, eventDetailMutation, t],
  )

  const handleSave = useCallback(
    async (formData: EventFormData) => {
      setSaving(true)
      try {
        const startDate = localDateTimeToIso(formData.startDate)
        const endDate = localDateTimeToIso(formData.endDate)
        if (!startDate || !endDate) {
          addToast({
            type: 'error',
            message: t('events.invalidDateRange'),
          })
          return false
        }

        const payload: PartnerEventPayload = {
          title: formData.title,
          description: formData.description || null,
          type: formData.type || 'TASTING',
          startDate,
          endDate,
          locationName: formData.locationName || null,
          locationAddress: formData.locationAddress || null,
          locationCity: formData.locationCity || null,
          locationRegion: formData.locationRegion || null,
          locationCountry: formData.locationCountry || null,
          latitude: formData.latitude ?? null,
          longitude: formData.longitude ?? null,
          price: formData.price ?? null,
          maxAttendees: formData.maxAttendees || null,
          currency: formData.currency.toUpperCase(),
          registrationDeadline: formData.registrationDeadline
            ? localDateTimeToIso(formData.registrationDeadline)
            : null,
          maxTicketsPerRegistration: formData.maxTicketsPerRegistration,
          approvalMode: formData.approvalMode,
          attendeeConfirmationRequired: formData.attendeeConfirmationRequired,
          registrationHoldMinutes: formData.registrationHoldMinutes,
          paymentAlias: formData.paymentAlias || null,
          paymentQrUrl: formData.paymentQrUrl || null,
          paymentInstructions: formData.paymentInstructions || null,
          imageUrl: formData.imageUrl || null,
          contactEmail: formData.contactEmail || null,
          contactPhone: formData.contactPhone || null,
          websiteUrl: formData.websiteUrl || null,
        }
        const status = requestedEventStatus(editingEvent?.id ? editingEvent.status : undefined, formData.status)
        if (status) payload.status = status

        if (editingEvent?.id) {
          await updateMutation.mutateAsync({ id: editingEvent.id, payload })
        } else {
          await createMutation.mutateAsync(payload)
        }

        setShowModal(false)
        setEditingEvent(null)
        return true
      } catch (error) {
        addToast({
          type: 'error',
          message: t(
            eventBookingErrorKey(
              normalizeError(error).code,
              'partner.events.toastSaveError',
            ),
          ),
        })
        return false
      } finally {
        setSaving(false)
      }
    },
    [addToast, createMutation, editingEvent, t, updateMutation],
  )

  const openCancel = useCallback(
    (event: Pick<PartnerEvent, 'id' | 'title'>) => {
      if (!cancellationInFlight.current) {
        setCancelTarget({ id: event.id, title: event.title })
      }
    },
    [],
  )

  const closeCancel = useCallback(() => {
    if (!cancellationInFlight.current) setCancelTarget(null)
  }, [])

  const handleDelete = useCallback(
    async (cancellation: EventCancellation) => {
      if (!cancelTarget || cancellationInFlight.current) return
      cancellationInFlight.current = true
      setCancelling(true)
      try {
        await deleteMutation.mutateAsync({ id: cancelTarget.id, cancellation })
        setCancelTarget(null)
        addToast({ type: 'success', message: t('partner.deleteSuccess') })
      } catch {
        addToast({
          type: 'error',
          message: t('partner.events.toastDeleteError'),
        })
      } finally {
        cancellationInFlight.current = false
        setCancelling(false)
      }
    },
    [addToast, cancelTarget, deleteMutation, t],
  )

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setEditingEvent(null)
  }, [])

  const openRegistrations = useCallback((event: PartnerEvent) => {
    setRegistrationsEvent({ id: event.id, title: event.title })
  }, [])

  const closeRegistrations = useCallback(() => {
    setRegistrationsEvent(null)
  }, [])

  const goToPrevPage = useCallback(() => {
    setPage((p) => Math.max(0, p - 1))
  }, [])

  const goToPage = useCallback((next: number) => {
    setPage(Math.min(Math.max(next, 0), Math.max(totalPages - 1, 0)))
  }, [totalPages])

  const goToNextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages - 1, p + 1))
  }, [totalPages])

  return {
    t,
    page,
    showModal,
    editingEvent,
    registrationsEvent,
    saving,
    isLoading,
    loadFailed: isError && !data,
    loadError: error,
    retry: () => void refetch(),
    events,
    totalItems,
    totalPages,
    openCreate,
    openEdit,
    handleSave,
    cancelTarget,
    openCancel,
    closeCancel,
    handleDelete,
    cancelling,
    handleCloseModal,
    openRegistrations,
    closeRegistrations,
    goToPrevPage,
    goToNextPage,
    goToPage,
  }
}
