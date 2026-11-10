import { useEffect, useId, useRef, useState, type BaseSyntheticEvent } from 'react'
import { useForm, useWatch, type FieldError, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useDiscardGuard } from '@hooks/useDiscardGuard'
import { useAdminCountries, useAdminRegions } from '@hooks/queries/admin/useAdminRegions'
import type { AdminRoute, AdminRouteStop } from '@domain/admin/admin.types'
import {
  resolveRouteMinutes,
  routeStopsMinutes,
  toAdminRouteFormValues,
  validateAdminRouteStops,
  type AdminRouteFormField,
  type AdminRouteFormValues,
  type AdminRouteSaveResult,
} from '@domain/admin/adminRouteForm'
import { sortRouteStops } from '@domain/admin/adminRouteStops'
import type { AdminWineryPickerState } from '@components/features/admin/wine-form/useAdminWineEditor'
import { adminRouteFormSection, createAdminRouteFormSchema, type AdminRouteFormSection } from './adminRouteFormSchema'
import { useAdminRouteStops } from './useAdminRouteStops'

export interface AdminRouteEditorOptions {
  /** The stored route (or an empty draft); its stops are edited in their saved order. */
  route: Partial<AdminRoute>
  saving: boolean
  winery: AdminWineryPickerState
  onSave: (values: AdminRouteFormValues, stops: AdminRouteStop[]) => Promise<AdminRouteSaveResult> | AdminRouteSaveResult
  onClose: () => void
}

const touch = { shouldDirty: true } as const

export interface PlaceOption { value: string; label: string }

/** Options for a name-valued select that keep a stored value the catalog does not list. */
function placeOptions(names: PlaceOption[], current: string): PlaceOption[] {
  if (!current || names.some((option) => option.value === current)) return names
  return [...names, { value: current, label: current }]
}

/** Presentation orchestration of the route editor; persistence stays in the page use case. */
export function useAdminRouteEditor({ route, saving, winery, onSave, onClose }: AdminRouteEditorOptions) {
  const { t } = useTranslation()
  const formId = useId()
  const [initialStops] = useState(() => sortRouteStops(route.stops))
  const stopsEditor = useAdminRouteStops(initialStops, winery)
  const { stops, currentStops } = stopsEditor
  const [resolver] = useState(() => zodResolver(createAdminRouteFormSchema(t, currentStops)) as Resolver<AdminRouteFormValues>)
  const form = useForm<AdminRouteFormValues>({ resolver, defaultValues: toAdminRouteFormValues(route) })
  const { register, handleSubmit, setValue, setError, trigger, control, formState: { errors, isDirty, isSubmitted } } = form
  const values = useWatch({ control }) as AdminRouteFormValues
  const { data: countries = [] } = useAdminCountries()
  const countryId = countries.find((country) => country.name === values.country || country.id === values.country)?.id ?? null
  const { data: regions = [] } = useAdminRegions(countryId)
  const [expanded, setExpanded] = useState<AdminRouteFormSection[]>(['details', 'stops'])
  const [imageBusy, setImageBusy] = useState(false)
  const submitting = useRef(false)
  const busy = saving || imageBusy || stopsEditor.wineryBusy
  const dirty = isDirty || stops !== initialStops

  // Rules that read the stops are checked again when the stops change after a save attempt.
  const checkedStops = useRef(stops)
  useEffect(() => {
    if (checkedStops.current === stops) return
    checkedStops.current = stops
    if (form.formState.isSubmitted) void trigger()
  }, [form.formState, stops, trigger])

  const handleClose = useDiscardGuard({ dirty, busy, onClose })
  const update = { ...touch, shouldValidate: isSubmitted }

  const changeCountry = (country: string) => {
    setValue('country', country, update)
    setValue('region', '', touch)
    setValue('subregion', '', touch)
  }

  const stopsMinutes = routeStopsMinutes(stops)
  const minutes = resolveRouteMinutes(values, stops)
  const changeMinutes = (value: number | null) => {
    setValue('durationFromStops', false, touch)
    setValue('estimatedDuration', value, update)
  }
  const applyStopsMinutes = () => setValue('durationFromStops', true, update)

  const stopErrors = isSubmitted ? validateAdminRouteStops(stops) : []
  const stopError = (index: number, field: 'name' | 'address' | 'estimatedDuration') => {
    const found = stopErrors.find((error) => error.index === index && error.field === field)
    return found ? t(`admin.routes.form.validation.${found.code}`) : undefined
  }
  const fieldErrors = errors as Partial<Record<AdminRouteFormField, FieldError>>
  const invalidSections = (found: object) => Object.keys(found).map(adminRouteFormSection)

  const section = (id: AdminRouteFormSection, summary?: string) => {
    const invalid = invalidSections(errors).includes(id) || (id === 'stops' && stopErrors.length > 0)
    return {
      title: t(`admin.routes.form.sections.${id}`),
      summary,
      open: expanded.includes(id) || invalid,
      invalid,
      onToggle: () => setExpanded((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]),
    }
  }

  const openSections = (sections: AdminRouteFormSection[]) => {
    setExpanded((current) => [...new Set([...current, ...sections])])
  }

  const flagRejected = (fields: AdminRouteFormField[]) => {
    for (const field of fields) setError(field as keyof AdminRouteFormValues, { type: 'server', message: t('admin.routes.form.validation.rejected') })
    openSections(fields.map(adminRouteFormSection))
  }

  // In-flight guard: a second press while a save runs is ignored.
  const saveValues = async (formValues: AdminRouteFormValues) => {
    if (busy || submitting.current) return
    if (validateAdminRouteStops(currentStops()).length > 0) {
      openSections(['stops'])
      return
    }
    submitting.current = true
    try {
      const result = await onSave(formValues, currentStops())
      if (!result.saved) flagRejected(result.rejectedFields)
    } finally {
      submitting.current = false
    }
  }
  const openInvalid = (found: object) => {
    const stopsInvalid = validateAdminRouteStops(currentStops()).length > 0
    openSections([...invalidSections(found), ...(stopsInvalid ? ['stops' as const] : [])])
  }
  const submit = (event?: BaseSyntheticEvent) => handleSubmit(saveValues, openInvalid)(event)

  const errorMessages = [...new Set([
    ...Object.values(fieldErrors).map((error) => error?.message),
    ...stopErrors.map((error) => t(`admin.routes.form.validation.${error.code}`)),
  ].filter((message): message is string => !!message))]

  const countryOptions = placeOptions(
    countries.map((country) => ({ value: country.name, label: country.name })),
    values.country,
  ).map((option) => ({ ...option, label: countries.find((country) => country.id === option.value)?.name ?? option.label }))
  const regionOptions = placeOptions(regions.map((region) => ({ value: region.name, label: region.name })), values.region)

  return {
    formId, register, setValue, values, errors: fieldErrors, errorMessages, touch, update,
    isEditing: !!route.id, routeId: route.id,
    countryOptions, regionOptions, hasCountry: !!values.country, changeCountry,
    minutes, stopsMinutes, changeMinutes, applyStopsMinutes,
    stopsEditor, stopError,
    imageBusy, setImageBusy, saving, busy, section, submit, handleClose,
  }
}

export type AdminRouteEditor = ReturnType<typeof useAdminRouteEditor>
