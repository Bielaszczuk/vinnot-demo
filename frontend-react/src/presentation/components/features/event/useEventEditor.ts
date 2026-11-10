import { useAuth } from "@/presentation/hooks/useAuth";
import { useEventDraftRecovery } from "@/presentation/hooks/useEventDraftRecovery"
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { useGeocoding } from '@hooks/useGeocoding'
import type { Event } from '@domain/event/event.types'
import { editorEventStatus } from '@domain/event/eventEditor'
import { eventEditorSection, type EventEditorSection } from './eventEditorSections'
import {
  EVENT_FORM_DEFAULT_VALUES, createEventFormDefaultValues,
  createEventFormSchema, toDatetimeLocal, type EventFormData,
} from './EventFormConfig'

interface EventEditorOptions {
  isOpen: boolean
  event: Partial<Event> | null
  saving: boolean
  onClose: () => void
  onSave: (data: EventFormData) => Promise<boolean | void> | void
}

/** Presentation orchestration; persistence stays in the caller's use case. */
export function useEventEditor({ isOpen, event, saving, onClose, onSave }: EventEditorOptions) {
  const { user } = useAuth();
  const ownerId = user?.id;
  const { t } = useTranslation()
  const { addToast } = useToast()
  const { geocodeAddress: geocode } = useGeocoding()
  const [searchAddress, setSearchAddress] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)

  const [expanded, setExpanded] = useState<EventEditorSection[]>(['basic'])
  const geocodeRevision = useRef(0)

  const form = useForm<EventFormData>({
    resolver: zodResolver(createEventFormSchema(t)) as Resolver<EventFormData>,
    defaultValues: EVENT_FORM_DEFAULT_VALUES,
  })
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = form

  const latitude = watch('latitude')
  const longitude = watch('longitude')

  const handleLocationChanged = useCallback(
    (lat: number, lng: number) => {
      geocodeRevision.current += 1
      setGeocoding(false)
      setValue('latitude', lat, { shouldValidate: true, shouldDirty: true })
      setValue('longitude', lng, { shouldValidate: true, shouldDirty: true })
    },
    [setValue],
  )

  const geocodeAddress = useCallback(async () => {
    const queryAddress = searchAddress.trim()
    if (!queryAddress) {
      addToast({
        type: 'warning',
        message: t('events.geocodeTypeAddress', 'Por favor ingresá un lugar o dirección para buscar'),
      })
      return
    }

    const revision = ++geocodeRevision.current
    setGeocoding(true)

    try {
      const result = await geocode(queryAddress)
      if (revision !== geocodeRevision.current) return
      if (!result.ok || !result.location) {
        if (result.status === 'NO_API_KEY') {
          addToast({
            type: 'error',
            message: t('eventEditor.mapUnavailable'),
          })
          return
        }
        addToast({
          type: 'warning',
          message: t(
            'events.locationNotFound',
            'No se encontró la ubicación. Intentá con un nombre o dirección más específica.',
          ),
        })
        return
      }

      setValue('latitude', result.location.latitude, { shouldValidate: true, shouldDirty: true })
      setValue('longitude', result.location.longitude, { shouldValidate: true, shouldDirty: true })
      setValue('locationAddress', result.location.formattedAddress ?? null, {
        shouldDirty: true,
      })

      if (result.location.city) {
        setValue('locationCity', result.location.city, { shouldDirty: true })
      }
      if (result.location.region) {
        setValue('locationRegion', result.location.region, { shouldDirty: true })
      }
      if (result.location.country) {
        setValue('locationCountry', result.location.country, { shouldDirty: true })
      }

      const currentLocationName = getValues('locationName')
      if (!currentLocationName || !String(currentLocationName).trim()) {
        setValue('locationName', queryAddress, { shouldDirty: true })
      }

      addToast({
        type: 'success',
        message: t('events.locationFound', { address: result.location.formattedAddress }),
      })
      setSearchAddress('')
    } catch {
      if (revision !== geocodeRevision.current) return
      addToast({
        type: 'error',
        message: t('events.geocodeError', 'Error al buscar la ubicación. Por favor intentá nuevamente.'),
      })
    } finally {
      if (revision === geocodeRevision.current) setGeocoding(false)
    }
  }, [addToast, geocode, getValues, searchAddress, setValue, t])

  const eventSnapshot = useRef(event)
  eventSnapshot.current = event
  const eventId = event?.id
  useEffect(() => {
    const event = eventSnapshot.current
    geocodeRevision.current += 1
    setGeocoding(false)
    if (!isOpen) return
    setExpanded(['basic'])
    if (event) {
      reset({
        title: event.title ?? '',
        pricingMode: Number(event.price) > 0 ? 'PAID' : 'FREE',
        description: event.description ?? null,
        type: event.type ?? 'TASTING',
        status: editorEventStatus(event.status) as EventFormData['status'],
        startDate: toDatetimeLocal(event.startDate),
        endDate: toDatetimeLocal(event.endDate),
        locationName: event.location?.name ?? null,
        locationAddress: event.location?.address ?? null,
        locationCity: event.location?.city ?? null,
        locationRegion: event.location?.region ?? null,
        locationCountry: event.location?.country ?? null,
        latitude: event.location?.latitude ?? null,
        longitude: event.location?.longitude ?? null,
        price: event.price ?? null,
        maxAttendees: event.maxAttendees ?? null,
        currency: event.registration?.currency ?? 'ARS',
        registrationDeadline: toDatetimeLocal(event.registration?.deadline),
        maxTicketsPerRegistration:
          event.registration?.maxTicketsPerRegistration ?? 6,
        approvalMode: event.registration?.approvalMode ?? 'MANUAL',
        attendeeConfirmationRequired:
          event.registration?.attendeeConfirmationRequired ?? true,
        registrationHoldMinutes: event.registration?.holdMinutes ?? 1440,
        paymentAlias: event.registration?.paymentAlias ?? null,
        paymentQrUrl: event.registration?.paymentQrUrl ?? null,
        paymentInstructions: event.registration?.paymentInstructions ?? null,
        imageUrl: event.imageUrl ?? null,
        contactEmail: event.organizer?.email ?? null,
        contactPhone: event.organizer?.phone ?? null,
        websiteUrl: event.websiteUrl ?? null,
      })
    } else {
      reset(createEventFormDefaultValues())
    }
    return () => { geocodeRevision.current += 1 }
  }, [eventId, ownerId, isOpen, reset])

  useEffect(() => {
    if (!isOpen) {
      setSearchAddress('')
    }
  }, [isOpen])

  const draft = useEventDraftRecovery(isOpen, eventId, form)
  const { persist, status: draftStatus } = draft
  const submitting = useRef(false)
  const handleClose = useCallback(async () => {
    if (saving || imageUploading || submitting.current || draftStatus === 'loading') return
    if (await persist()) { setSearchAddress(''); onClose() }
  }, [saving, imageUploading, persist, draftStatus, onClose])

  const handleFormSubmit = async (data: EventFormData) => {
    if (imageUploading || saving || draft.blocked || submitting.current) return
    submitting.current = true
    try {
      const result = await onSave({ ...data, paymentAlias: null, paymentQrUrl: null, paymentInstructions: null, approvalMode: data.pricingMode === "PAID" ? "AUTOMATIC" : data.approvalMode, attendeeConfirmationRequired: data.pricingMode === "PAID" ? false : data.attendeeConfirmationRequired, price: data.pricingMode === 'FREE' ? null : data.price, currency: data.pricingMode === 'FREE' ? 'ARS' : data.currency.trim().toUpperCase() })
      if (result === true) {
        try { await draft.complete() } catch { addToast({ type: 'warning', message: t('eventDraft.cleanupError') }) }
      }
    } finally { submitting.current = false }
  }

  const pricingMode = watch('pricingMode')
  const section = (id: EventEditorSection, summary?: string) => ({
    title: t(`eventEditor.sections.${id}`), summary,
    open: expanded.includes(id) || Object.keys(errors).some(field => eventEditorSection(field) === id),
    invalid: Object.keys(errors).some(field => eventEditorSection(field) === id),
    onToggle: () => setExpanded(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]),
  })
  const submit = handleSubmit(handleFormSubmit, invalid => {
    setExpanded(current => [...new Set([...current, ...Object.keys(invalid).map(eventEditorSection)])])
  })

  const changeSearchAddress = (value: string) => {
    geocodeRevision.current += 1
    setGeocoding(false)
    setSearchAddress(value)
  }
  return {
    register, control, errors, watch, setValue, getValues, draft,
    latitude, longitude, searchAddress, geocoding, pricingMode,
    imageUploading, setImageUploading, section, submit, handleClose,
    changeSearchAddress, geocodeAddress, handleLocationChanged,
  }
}
