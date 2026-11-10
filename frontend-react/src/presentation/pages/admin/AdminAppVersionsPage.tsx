/**
 * AdminAppVersionsPage — minimum supported mobile version per platform (#428). ADMIN only.
 *
 * Architecture: page → view-model hook → query hooks → service → client → http
 */
import { AlertTriangle } from 'lucide-react'
import { AdminBackLink } from '@components/features/admin/AdminBackLink'
import { AdminPageHeader } from '@components/features/admin/AdminPageHeader'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import { AdminFormDialog } from '@components/features/admin/AdminFormDialog'
import { Spinner } from '@components/ui/Spinner'
import { AppVersionPlatformCard } from '@components/features/admin/appVersions/AppVersionPlatformCard'
import { useAdminAppVersionsViewModel } from './useAdminAppVersionsViewModel'

export function AdminAppVersionsPage() {
  const vm = useAdminAppVersionsViewModel()
  const { t } = vm
  const data = vm.settings.data
  return (
    <div className="space-y-6">
      <AdminBackLink />
      <AdminPageHeader title={t('admin.appVersions.title')} subtitle={t('admin.appVersions.subtitle')} />

      <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="note">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{t('admin.appVersions.warningTitle')}</p>
          <p className="mt-1">{t('admin.appVersions.warning')}</p>
        </div>
      </div>

      {vm.settings.isError ? <AdminQueryError retry={() => void vm.settings.refetch()} />
        : !data ? <div className="p-8 text-center"><Spinner /></div>
          : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {data.platforms.map((entry) => (
                  <AppVersionPlatformCard
                    key={entry.platform}
                    entry={entry}
                    label={vm.platformLabel(entry.platform)}
                    draft={vm.draftOf(entry.platform)}
                    invalid={vm.invalid(entry.platform)}
                    changed={vm.changed(entry.platform)}
                    saving={vm.saving === entry.platform}
                    busy={vm.saving !== null}
                    formatDate={vm.formatDate}
                    onEdit={(value) => vm.edit(entry.platform, value)}
                    onSave={() => vm.save(entry.platform)}
                    onClear={() => vm.clear(entry.platform)}
                  />
                ))}
              </div>
              <section className="rounded-xl border border-gray-200/60 bg-white shadow-sm" aria-labelledby="app-version-changes-heading">
                <h2 id="app-version-changes-heading" className="border-b border-gray-100 px-5 py-4 text-sm font-semibold text-gray-900">
                  {t('admin.appVersions.recentChanges')}
                </h2>
                {data.recentChanges.length === 0
                  ? <p className="px-5 py-4 text-sm text-gray-500">{t('admin.appVersions.noChanges')}</p>
                  : (
                    <ul className="divide-y divide-gray-100 text-sm text-gray-700">
                      {data.recentChanges.map((change) => (
                        <li key={`${change.platform}-${change.changedAt}`} className="px-5 py-3">
                          {t('admin.appVersions.change', {
                            platform: vm.platformLabel(change.platform),
                            from: change.previousMinimumVersion ?? t('admin.appVersions.none'),
                            to: change.minimumVersion ?? t('admin.appVersions.none'),
                            by: change.changedBy,
                            date: vm.formatDate(change.changedAt),
                          })}
                        </li>
                      ))}
                    </ul>
                  )}
              </section>
            </>
          )}

      {vm.pendingRaise && (
        <AdminFormDialog open onClose={vm.saving ? () => undefined : vm.cancelRaise} labelledBy="app-version-raise-title" panelClassName="space-y-4 p-6">
          <h3 id="app-version-raise-title" className="text-center font-semibold text-gray-900">
            {t('admin.appVersions.confirmTitle', { platform: vm.platformLabel(vm.pendingRaise.platform), version: vm.pendingRaise.to })}
          </h3>
          <p className="text-center text-sm text-gray-600">
            {t('admin.appVersions.confirmMessage', {
              from: vm.pendingRaise.from ?? t('admin.appVersions.none'),
              version: vm.pendingRaise.to,
            })}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button type="button" onClick={vm.cancelRaise} disabled={vm.saving !== null} className="min-h-11 rounded-xl px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-60">{t('common.cancel')}</button>
            <button type="button" onClick={() => void vm.confirmRaise()} disabled={vm.saving !== null} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
              {vm.saving !== null && <Spinner size="sm" />}
              {t('admin.appVersions.confirm')}
            </button>
          </div>
        </AdminFormDialog>
      )}
    </div>
  )
}

export default AdminAppVersionsPage
