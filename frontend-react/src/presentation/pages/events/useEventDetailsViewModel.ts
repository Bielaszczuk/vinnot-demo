import { eventBookingErrorKey } from "@domain/event/eventBookingError";
import { registrationSuccessFeedback } from "@domain/event/eventRegistrationFeedback";
import { normalizeError } from "@shared/utils/apiError";
import { useEventCheckout } from "@/presentation/hooks/useEventCheckout"
import { isEventPaymentsEnabled } from "@/shared/config/featureFlags"
import { hasCoordinates } from '@domain/location/coordinates'
import { useMemo, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEvent } from '@hooks/queries/event/useEvent'
import { useRegisterForEvent } from '@hooks/queries/event/useRegisterForEvent'
import {
  useConfirmEventAttendance,
  useMyEventRegistration,
} from '@hooks/queries/event/useEventRegistration'
import { useCancelRegistration } from '@hooks/queries/event/useCancelRegistration'
import { useAuth } from '@hooks/useAuth'
import { useConfirm } from '@hooks/useConfirm'
import { isPublicEvent } from '@domain/sharing/publicContent'
import { useToast } from '@hooks/useToast'
import { useBackNavigation } from '@hooks/useBackNavigation'
import { useShareLink } from '@hooks/useShareLink'
import { useCurrentTime } from '@hooks/useCurrentTime'
import { formatDate, formatTime } from '@utils/date'
import type { RegisterForEventInput } from '@domain/event/event.types'
import { calendarDaysUntil } from '@domain/event/eventCalendar'


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function useEventDetailsViewModel() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { addToast } = useToast()
  const { confirm } = useConfirm()

  const isValidId = !!id && UUID_RE.test(id)
  const { data: event, isLoading, isError, error, refetch } = useEvent(isValidId ? id : undefined)
  const checkout = useEventCheckout()
  const checkoutEnabled = isEventPaymentsEnabled()
  const payRegistration = async (registrationId: string) => {
    if (!id) return
    try { if (!await checkout.start(id, registrationId)) addToast({ type: "info", message: t("eventBooking.checkoutPending") }) }
    catch (error) { addToast({ type: "error", message: t(eventBookingErrorKey(normalizeError(error).code, "eventBooking.checkoutError")) }) }
  }
  const registerMutation = useRegisterForEvent()
  const registrationQuery = useMyEventRegistration(id, isAuthenticated && isValidId)
  const confirmMutation = useConfirmEventAttendance(id ?? '')
  const cancelMutation = useCancelRegistration()

  const renderTime = useCurrentTime()
  const shareLink = useShareLink()
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false)

  const isUpcoming = useMemo(() => {
    if (!event) return false
    return new Date(event.startDate) > renderTime
  }, [event, renderTime])

  const daysUntil = useMemo(() => {
    if (!event) return 0
    return calendarDaysUntil(event.startDate, renderTime)
  }, [event, renderTime])

  const capacityPercent = useMemo(() => {
    if (!event?.maxAttendees) return 0
    return Math.min(100, (event.currentAttendees / event.maxAttendees) * 100)
  }, [event])

  const isSoldOut = useMemo(() => {
    if (!event?.maxAttendees) return false
    return event.currentAttendees >= event.maxAttendees
  }, [event])

  const formattedDateRange = useMemo(() => {
    if (!event) return ''
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)
    const sameDay = start.toDateString() === end.toDateString()
    if (sameDay) {
      return `${formatDate(start, undefined, i18n.language)} · ${formatTime(start, i18n.language)} - ${formatTime(end, i18n.language)}`
    }
    return `${formatDate(start, undefined, i18n.language)} ${formatTime(start, i18n.language)} — ${formatDate(end, undefined, i18n.language)} ${formatTime(end, i18n.language)}`
  }, [event, i18n.language])

  const capacityColor = useMemo(() => {
    if (capacityPercent > 85) return 'bg-danger'
    if (capacityPercent > 50) return 'bg-warning'
    return 'bg-success'
  }, [capacityPercent])


  const handleRegister = useCallback(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/events/${id ?? ''}`)
      return
    }
    setRegistrationModalOpen(true)
  }, [isAuthenticated, id, navigate])

  const submitRegistration = async (input: RegisterForEventInput) => {
    if (!id) return
    try {
      const registration = await registerMutation.mutateAsync({ eventId: id, input })
      setRegistrationModalOpen(false)
      const feedback = registrationSuccessFeedback(registration.status)
      if (feedback) addToast({ type: feedback.type, message: t(feedback.key) })
      if (checkoutEnabled && registration.status === "AWAITING_PAYMENT") {
        await payRegistration(registration.id)
      } else if (!event?.price && registration.contactActionUrl) {
        window.open(registration.contactActionUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      addToast({ type: 'error', message: t(eventBookingErrorKey(normalizeError(error).code)) })
    }
  }

  const confirmAttendance = useCallback(async () => {
    if (!registrationQuery.data) return
    try {
      await confirmMutation.mutateAsync(registrationQuery.data.id)
      addToast({ type: 'success', message: t('events.attendanceConfirmed') })
    } catch {
      addToast({ type: 'error', message: t('events.attendanceConfirmError') })
    }
  }, [registrationQuery.data, confirmMutation, addToast, t])

  const cancelRegistration = useCallback(async () => {
    if (!id) return
    const confirmed = await confirm({
      title: t('events.registration.cancelRegistration'),
      message: t('events.registration.cancelPrompt'),
      confirmLabel: t('events.registration.cancelRegistration'),
      cancelLabel: t('common.back'),
      variant: 'danger',
    })
    if (!confirmed) return
    try {
      await cancelMutation.mutateAsync(id)
      addToast({ type: 'success', message: t('events.registration.cancelled') })
    } catch (error) {
      addToast({ type: 'error', message: t(eventBookingErrorKey(normalizeError(error).code, 'events.registration.cancelError')) })
    }
  }, [id, confirm, t, cancelMutation, addToast])

  const shareEvent = useCallback(() => {
    if (!event) return
    return shareLink({ kind: 'events', id: event.id, title: event.title })
  }, [shareLink, event])

  const openInMaps = useCallback(() => {
    if (!event) return
    const { latitude, longitude, address, city } = event.location
    if (hasCoordinates({ latitude, longitude })) {
      window.open(`https://maps.google.com/?q=${latitude},${longitude}`, '_blank')
    } else if (address || city) {
      window.open(
        `https://maps.google.com/?q=${encodeURIComponent(`${address} ${city}`)}`,
        '_blank',
      )
    }
  }, [event])

  const goBack = useBackNavigation('/events')

  const goToEvents = useCallback(() => {
    navigate('/events')
  }, [navigate])

  return {
    t,
    id,
    event,
    isLoading,
    isError,
    error,
    retry: refetch,
    isUpcoming,
    daysUntil,
    capacityPercent,
    isSoldOut,
    formattedDateRange,
    capacityColor,
    registerPending: registerMutation.isPending || checkout.pending,
    registration: registrationQuery.data ?? null,
    registrationModalOpen,
    setRegistrationModalOpen,
    registrationDefaultName: user?.name ?? '',
    registrationDefaultEmail: user?.email ?? '',
    registrationDefaultPhone: user?.phoneNumber ?? '',
    handleRegister,
    submitRegistration,
    confirmAttendance,
    cancelRegistration,
    payNow: checkoutEnabled ? () => registrationQuery.data && void payRegistration(registrationQuery.data.id) : undefined,
    registrationActionPending:
      confirmMutation.isPending || cancelMutation.isPending || checkout.pending,
    canShare: !!event && isPublicEvent(event),
    shareEvent,
    openInMaps,
    goBack,
    goToEvents,
  }
}
