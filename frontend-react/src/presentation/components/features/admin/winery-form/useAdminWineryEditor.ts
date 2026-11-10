import { useCallback, useEffect, useId, useRef, useState, type BaseSyntheticEvent } from 'react'
import { useForm, useWatch, type FieldErrors, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { useDiscardGuard } from '@hooks/useDiscardGuard'
import { useGeocoding } from '@hooks/useGeocoding'
import { useAdminCountries, useAdminRegions } from '@hooks/queries/admin/useAdminRegions'
import type { AdminWinery } from '@domain/admin/admin.types'
import {
  toAdminWineryFormValues,
  type AdminWineryFormField,
  type AdminWineryFormValues,
  type AdminWinerySaveResult,
} from '@domain/admin/adminWineryForm'
import { adminWineryFormSection, createAdminWineryFormSchema, type AdminWineryFormSection } from './adminWineryFormSchema'

export interface AdminWineryEditorOptions {
  winery: Partial<AdminWinery>
  saving: boolean
  onSave: (values: AdminWineryFormValues) => Promise<AdminWinerySaveResult> | AdminWinerySaveResult
  onClose: () => void
}

const touch = { shouldDirty: true } as const

/** Presentation orchestration of the winery editor; persistence stays in the page use case. */
export function useAdminWineryEditor({ winery, saving, onSave, onClose }: AdminWineryEditorOptions) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const { geocodeAddress } = useGeocoding()
  const formId = useId()
  const form = useForm<AdminWineryFormValues>({
    resolver: zodResolver(createAdminWineryFormSchema(t)) as Resolver<AdminWineryFormValues>,
    defaultValues: toAdminWineryFormValues(winery),
  })
  const { register, handleSubmit, setValue, setError, watch, control, formState: { errors, isDirty, isSubmitted } } = form
  const countryId = useWatch({ control, name: 'countryId' })
  const { data: countries = [] } = useAdminCountries()
  const { data: regions = [] } = useAdminRegions(countryId || null)
  const [expanded, setExpanded] = useState<AdminWineryFormSection[]>(['identity'])
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [coverBusy, setCoverBusy] = useState(false)
  const [searchAddress, updateSearchAddress] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  // Bumped by every newer location change and on unmount, so a late geocode never overwrites it.
  const locationRevision = useRef(0)
  const submitting = useRef(false)
  const busy = saving || logoBusy || coverBusy

  useEffect(() => () => { locationRevision.current += 1 }, [])

  const handleClose = useDiscardGuard({ dirty: isDirty, busy, onClose })
  const update = { ...touch, shouldValidate: isSubmitted }

  const setSearchAddress = useCallback((value: string) => {
    locationRevision.current += 1
    setGeocoding(false)
    updateSearchAddress(value)
  }, [])

  const changeCountry = (next: string) => {
    setValue('countryId', next, update)
    setValue('regionId', '', touch)
  }

  const selectLocation = (latitude: number, longitude: number) => {
    locationRevision.current += 1
    setGeocoding(false)
    setValue('latitude', latitude, update)
    setValue('longitude', longitude, update)
  }

  const geocode = async () => {
    const query = searchAddress.trim()
    if (!query) {
      addToast({ type: 'warning', message: t('admin.common.toastGeoRequired') })
      return
    }
    const request = ++locationRevision.current
    const isCurrent = () => locationRevision.current === request
    setGeocoding(true)
    try {
      const result = await geocodeAddress(query)
      if (!isCurrent()) return
      if (!result.ok || !result.location) {
        addToast(result.status === 'NO_API_KEY'
          ? { type: 'error', message: t('admin.common.toastGeoMissingKey') }
          : { type: 'warning', message: t('admin.common.toastGeoNotFound') })
        return
      }
      const { latitude, longitude, formattedAddress } = result.location
      setValue('latitude', latitude, update)
      setValue('longitude', longitude, update)
      if (!form.getValues('address')) setValue('address', formattedAddress, touch)
      addToast({ type: 'success', message: t('admin.wineries.toastGeoFound', { address: formattedAddress }) })
      setSearchAddress('')
    } catch {
      if (!isCurrent()) return
      addToast({ type: 'error', message: t('admin.common.toastGeoError') })
    } finally {
      if (isCurrent()) setGeocoding(false)
    }
  }

  const invalidSections = (found: FieldErrors<AdminWineryFormValues>) => Object.keys(found).map(adminWineryFormSection)
  const coordinatesInvalid = !!(errors.latitude || errors.longitude)

  const section = (id: AdminWineryFormSection, summary?: string) => {
    const invalid = invalidSections(errors).includes(id)
    return {
      title: t(`admin.wineries.form.sections.${id}`),
      summary,
      open: expanded.includes(id) || invalid,
      invalid,
      onToggle: () => setExpanded((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]),
    }
  }

  const openSections = (fields: string[]) => {
    setExpanded((current) => [...new Set([...current, ...fields.map(adminWineryFormSection)])])
  }

  const flagRejected = (fields: AdminWineryFormField[]) => {
    for (const field of fields) setError(field, { type: 'server', message: t('admin.wineries.form.validation.rejected') })
    openSections(fields)
  }

  // In-flight guard: a second press while a save runs is ignored.
  const saveValues = async (values: AdminWineryFormValues) => {
    if (busy || submitting.current) return
    submitting.current = true
    try {
      const result = await onSave(values)
      if (!result.saved) flagRejected(result.rejectedFields)
    } finally {
      submitting.current = false
    }
  }
  const submit = (event?: BaseSyntheticEvent) => handleSubmit(saveValues, (found) => openSections(Object.keys(found)))(event)

  const errorMessages = [...new Set(Object.values(errors).map((error) => error?.message).filter((message): message is string => !!message))]

  return {
    formId, register, setValue, watch, errors, errorMessages, touch, update,
    isEditing: !!winery.id, wineryId: winery.id,
    countries, regions, changeCountry,
    searchAddress, setSearchAddress, geocoding, geocode, selectLocation,
    advancedOpen: advancedOpen || coordinatesInvalid, toggleAdvanced: () => setAdvancedOpen((open) => !open),
    logoBusy, setLogoBusy, coverBusy, setCoverBusy,
    saving, busy, section, submit, handleClose,
  }
}

export type AdminWineryEditor = ReturnType<typeof useAdminWineryEditor>
