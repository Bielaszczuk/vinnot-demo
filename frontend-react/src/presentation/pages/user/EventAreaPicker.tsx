import { Button } from '@components/ui/Button'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { Select } from '@components/ui/Select'
import { Spinner } from '@components/ui/Spinner'
import { useEventAreaViewModel } from './useEventAreaViewModel'

/** Region picker for "events near you"; the web never asks for a location. */
export function EventAreaPicker() {
  const vm = useEventAreaViewModel()
  const { t } = vm

  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <span className="block font-medium text-gray-900">{t('notificationPreferences.eventArea.title')}</span>
      <span className="block text-xs text-gray-500">{t('notificationPreferences.eventArea.helper')}</span>
      {vm.isLoading ? (
        <div className="flex justify-center py-3"><Spinner size="sm" /></div>
      ) : vm.error ? (
        <QueryErrorState error={vm.error} onRetry={vm.retry} />
      ) : (
        <>
          {vm.isApproximate && (
            <span className="mt-2 block text-xs font-medium text-wine-700">{t('notificationPreferences.eventArea.approximate')}</span>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Select
                id="event-area-region"
                aria-label={t('notificationPreferences.eventArea.region')}
                placeholder={t('notificationPreferences.eventArea.placeholder')}
                options={vm.options}
                value={vm.selectedRegionId}
                disabled={vm.isSaving}
                onChange={(event) => vm.selectRegion(event.target.value)}
              />
            </div>
            {vm.hasArea && (
              <Button variant="outline" size="sm" disabled={vm.isSaving} onClick={vm.clear}>
                {t('notificationPreferences.eventArea.clear')}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
