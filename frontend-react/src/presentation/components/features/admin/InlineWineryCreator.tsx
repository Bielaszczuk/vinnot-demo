/**
 * InlineWineryCreator — compact winery form shown inside another admin form
 * when the winery being looked for does not exist yet.
 *
 * It asks only for what `POST /admin/wineries` requires (name and country)
 * plus an optional region, creates the winery through the admin service via
 * the presentation hook, and hands the created winery back so the caller can
 * select it. It is a group, not a nested `<form>`, so it can live inside one.
 */

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { Button } from '@components/ui/Button'
import { useAdminCountries, useAdminRegions } from '@hooks/queries/admin/useAdminRegions'
import { useCreateAdminWinery } from '@hooks/queries/admin/useAdminWineryMutations'
import { adminSaveErrorMessage } from '@/presentation/feedback/apiErrorMessage'
import type { AdminWinery } from '@domain/admin/admin.types'
import {
  MAX_WINERY_NAME_LENGTH,
  toInlineWineryPayload,
  validateInlineWinery,
  type InlineWineryError,
} from '@domain/admin/inlineWinery'

export interface InlineWineryCreatorProps {
  /** Usually the text typed in the winery picker. */
  initialName: string
  onCreated: (winery: AdminWinery) => void
  onCancel: () => void
  /** Reports a creation in flight so the surrounding form can hold its own save. */
  onBusyChange?: (busy: boolean) => void
}

export function InlineWineryCreator({ initialName, onCreated, onCancel, onBusyChange }: InlineWineryCreatorProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const fieldId = useId()
  const [name, setName] = useState(initialName.trim())
  const [countryId, setCountryId] = useState('')
  const [regionId, setRegionId] = useState('')
  const [errors, setErrors] = useState<InlineWineryError[]>([])
  const [failure, setFailure] = useState<string | null>(null)
  const inFlight = useRef(false)
  const { data: countries = [], isLoading: loadingCountries } = useAdminCountries()
  const { data: regions = [] } = useAdminRegions(countryId || null)
  const createWinery = useCreateAdminWinery()
  const busy = createWinery.isPending

  const errorFor = (field: InlineWineryError['field']) => {
    const error = errors.find((item) => item.field === field)
    return error ? t(`admin.inlineWinery.validation.${error.code}`) : undefined
  }

  async function create() {
    if (inFlight.current) return
    const draft = { name, countryId, regionId }
    const found = validateInlineWinery(draft)
    setErrors(found)
    setFailure(null)
    if (found.length > 0) return
    inFlight.current = true
    onBusyChange?.(true)
    try {
      const winery = await createWinery.mutateAsync(toInlineWineryPayload(draft))
      onCreated(winery)
    } catch (error) {
      setFailure(adminSaveErrorMessage(error, t, 'wineries'))
    } finally {
      inFlight.current = false
      onBusyChange?.(false)
    }
  }

  const submitOnEnter = (event: KeyboardEvent) => {
    // Enter creates the winery instead of submitting the surrounding form.
    if (event.key === 'Enter') { event.preventDefault(); void create() }
  }

  return (
    <div role="group" aria-labelledby={titleId} aria-busy={busy} className="space-y-3 rounded-xl border border-wine-200 bg-wine-50/40 p-4">
      <div>
        <h4 id={titleId} className="text-sm font-semibold text-gray-900">{t('admin.inlineWinery.title')}</h4>
        <p className="mt-0.5 text-xs text-gray-500">{t('admin.inlineWinery.intro')}</p>
      </div>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-3">
        <Input
          id={`${fieldId}-name`}
          label={t('admin.inlineWinery.name')}
          value={name}
          maxLength={MAX_WINERY_NAME_LENGTH}
          required
          error={errorFor('name')}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={submitOnEnter}
        />
        <Select
          id={`${fieldId}-country`}
          label={t('admin.inlineWinery.country')}
          value={countryId}
          required
          error={errorFor('countryId')}
          disabled={loadingCountries}
          onChange={(event) => { setCountryId(event.target.value); setRegionId('') }}
        >
          <option value="">{t('admin.inlineWinery.countryPlaceholder')}</option>
          {countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
        </Select>
        <Select
          id={`${fieldId}-region`}
          label={t('admin.inlineWinery.region')}
          value={regionId}
          disabled={!countryId}
          onChange={(event) => setRegionId(event.target.value)}
        >
          <option value="">{t('admin.inlineWinery.regionNone')}</option>
          {regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
        </Select>
      </fieldset>
      {failure && <p role="alert" className="text-sm text-danger">{failure}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="button" size="sm" isLoading={busy} onClick={() => void create()}>
          {busy ? t('admin.inlineWinery.creating') : t('admin.inlineWinery.create')}
        </Button>
      </div>
    </div>
  )
}
