import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { useRegions } from '@hooks/queries/wine/useRegions'
import { useEventArea, useUpdateEventArea, type EventAreaChange } from '@hooks/queries/notification/useEventArea'
import { isEventAreaChange, selectedRegionId } from '@domain/notification/eventArea'
import type { SelectOption } from '@components/ui/Select'

export function useEventAreaViewModel() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const area = useEventArea()
  const regions = useRegions()
  const update = useUpdateEventArea()
  const current = area.data ?? null

  const apply = useCallback((change: EventAreaChange, success: string) => {
    update.mutate(change, {
      onSuccess: () => addToast({ type: 'success', message: t(success) }),
      onError: () => addToast({ type: 'error', message: t('notificationPreferences.eventArea.saveError') }),
    })
  }, [update, addToast, t])

  const selectRegion = useCallback((regionId: string) => {
    if (!isEventAreaChange(current, regionId)) return
    apply({ type: 'region', regionId }, 'notificationPreferences.eventArea.saved')
  }, [current, apply])

  const clear = useCallback(() => {
    if (!current) return
    apply({ type: 'clear' }, 'notificationPreferences.eventArea.cleared')
  }, [current, apply])

  const options: SelectOption[] = useMemo(() => (regions.data ?? []).map((region) => ({
    value: region.id, label: `${region.name}, ${region.countryName}`,
  })), [regions.data])

  return {
    t,
    isLoading: area.isLoading || regions.isLoading,
    error: area.error ?? regions.error ?? null,
    retry: () => {
      if (area.error) void area.refetch()
      if (regions.error) void regions.refetch()
    },
    isSaving: update.isPending,
    hasArea: current !== null,
    isApproximate: current?.kind === 'APPROXIMATE',
    selectedRegionId: selectedRegionId(current),
    options,
    selectRegion,
    clear,
  }
}
