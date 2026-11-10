import { useCallback, useId, useRef, useState, type BaseSyntheticEvent } from 'react'
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { useDiscardGuard } from '@hooks/useDiscardGuard'
import { useGrapeTypes } from '@hooks/queries/wine/useGrapeTypes'
import type { AdminWine, AdminWinery } from '@domain/admin/admin.types'
import { toAdminWineFormValues, type AdminWineFormValues } from '@domain/admin/adminWineForm'
import { adminWineFormSection, createAdminWineFormSchema, type AdminWineFormSection } from './adminWineFormSchema'

/** Winery search state owned by the page view-model and shared with the picker. */
export interface AdminWineryPickerState {
  query: string
  setQuery: (query: string) => void
  results: AdminWinery[]
  loading: boolean
  minQueryLength: number
}

export interface AdminWineEditorOptions {
  wine: Partial<AdminWine>
  saving: boolean
  winery: AdminWineryPickerState
  onSave: (values: AdminWineFormValues) => Promise<boolean | void> | boolean | void
  onClose: () => void
  /** Leaves the editor for the full AI profile page (edit only), asking first when there are unsaved changes. */
  onOpenAiProfile?: () => void
}

const noop = () => {}

const touch = { shouldDirty: true } as const

/** Presentation orchestration of the wine editor; persistence stays in the page use case. */
export function useAdminWineEditor({ wine, saving, winery, onSave, onClose, onOpenAiProfile }: AdminWineEditorOptions) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const formId = useId()
  const form = useForm<AdminWineFormValues>({
    resolver: zodResolver(createAdminWineFormSchema(t)) as Resolver<AdminWineFormValues>,
    defaultValues: toAdminWineFormValues(wine),
  })
  const { register, handleSubmit, setValue, watch, formState: { errors, isDirty, isSubmitted } } = form
  const { data: grapeTypes = [], isLoading: grapesLoading } = useGrapeTypes()
  const [expanded, setExpanded] = useState<AdminWineFormSection[]>(['identity'])
  const [imageBusy, setImageBusy] = useState(false)
  const [wineryBusy, setWineryBusy] = useState(false)
  const [newWineryName, setNewWineryName] = useState<string | null>(null)
  const submitting = useRef(false)
  const busy = saving || imageBusy || wineryBusy

  const handleClose = useDiscardGuard({ dirty: isDirty, busy, onClose })
  const openAiProfile = useDiscardGuard({ dirty: isDirty, busy, onClose: onOpenAiProfile ?? noop })

  const selectWinery = useCallback((selected: AdminWinery) => {
    setValue('wineryId', selected.id, { ...touch, shouldValidate: isSubmitted })
    setValue('wineryName', selected.name, touch)
    winery.setQuery(selected.name)
    setNewWineryName(null)
  }, [isSubmitted, setValue, winery])

  const wineryCreated = useCallback((created: AdminWinery) => {
    selectWinery(created)
    addToast({ type: 'success', message: t('admin.wines.form.wineryCreated', { name: created.name }) })
  }, [addToast, selectWinery, t])

  const invalidSections = (found: FieldErrors<AdminWineFormValues>) => Object.keys(found).map(adminWineFormSection)

  const section = (id: AdminWineFormSection, summary?: string) => {
    const invalid = invalidSections(errors).includes(id)
    return {
      title: t(`admin.wines.form.sections.${id}`),
      summary,
      open: expanded.includes(id) || invalid,
      invalid,
      onToggle: () => setExpanded((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]),
    }
  }

  // In-flight guard: a second press while a save runs is ignored.
  const saveValues = async (values: AdminWineFormValues) => {
    if (busy || submitting.current) return
    submitting.current = true
    try {
      await onSave(values)
    } finally {
      submitting.current = false
    }
  }
  const openInvalidSections = (found: FieldErrors<AdminWineFormValues>) => {
    setExpanded((current) => [...new Set([...current, ...invalidSections(found)])])
  }
  const submit = (event?: BaseSyntheticEvent) => handleSubmit(saveValues, openInvalidSections)(event)

  const errorMessages = [...new Set(Object.values(errors).map((error) => error?.message).filter((message): message is string => !!message))]

  return {
    formId, register, setValue, watch, errors, errorMessages, isEditing: !!wine.id, wineId: wine.id,
    grapeOptions: grapeTypes.map((grape) => grape.name), grapesLoading,
    winery, selectWinery, newWineryName, startWineryCreation: setNewWineryName,
    cancelWineryCreation: () => setNewWineryName(null), wineryCreated, wineryBusy, setWineryBusy,
    imageBusy, setImageBusy, saving, busy, section, submit, handleClose, touch,
    openAiProfile: wine.id && onOpenAiProfile ? openAiProfile : undefined,
  }
}

export type AdminWineEditor = ReturnType<typeof useAdminWineEditor>
