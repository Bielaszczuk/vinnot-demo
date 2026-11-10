import { useTranslation } from 'react-i18next'
import type { AdminWineSubmissionStatus } from '@domain/admin/admin.types'
import { AdminBackLink } from '@components/features/admin/AdminBackLink'
import { AdminPageHeader } from '@components/features/admin/AdminPageHeader'
import { AdminPagination } from '@components/features/admin/AdminPagination'
import { Spinner } from '@components/ui/Spinner'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import { AdminFormDialog } from '@components/features/admin/AdminFormDialog'
import { useAdminWineSubmissionsViewModel } from './useAdminWineSubmissionsViewModel'
import { wineTypeLabel } from '@shared/i18n/wineTypeLabel'
import { SubmissionDecisionPanel } from './submissions/SubmissionDecisionPanel'

const STATUSES: AdminWineSubmissionStatus[] = [
  'NEEDS_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'DUPLICATE', 'REJECTED', 'PENDING',
]

export function AdminWineSubmissionsPage() {
  const { i18n } = useTranslation()
  const vm = useAdminWineSubmissionsViewModel()
  return (
    <div className="space-y-6">
      <AdminBackLink />
      <AdminPageHeader
        title={vm.t('admin.submissions.title')}
        subtitle={vm.t('admin.submissions.subtitle')}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 md:flex-row">
        <select
          aria-label={vm.t('admin.submissions.statusLabel')}
          value={vm.status}
          onChange={(event) => vm.setStatus(event.target.value as AdminWineSubmissionStatus)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>{vm.t(`admin.submissions.status.${status}`)}</option>
          ))}
        </select>
        <input
          type="search"
          aria-label={vm.t('admin.submissions.searchPlaceholder')}
          value={vm.search}
          onChange={(event) => vm.setSearch(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') vm.applySearch() }}
          placeholder={vm.t('admin.submissions.searchPlaceholder')}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button onClick={vm.applySearch} className="rounded-lg bg-wine-700 px-5 py-2 text-sm font-medium text-white">
          {vm.t('common.search')}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {vm.isError ? <AdminQueryError retry={vm.refetch} /> : vm.isLoading ? <div className="p-12 text-center"><Spinner /></div> : vm.submissions.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">{vm.t('admin.submissions.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
                <th className="px-5 py-3">{vm.t('admin.submissions.wine')}</th>
                <th className="px-5 py-3">{vm.t('admin.submissions.winery')}</th>
                <th className="px-5 py-3">{vm.t('admin.submissions.submittedBy')}</th>
                <th className="px-5 py-3">{vm.t('admin.submissions.statusLabel')}</th>
                <th className="px-5 py-3">{vm.t('admin.submissions.createdAt')}</th>
                <th className="px-5 py-3 text-right">{vm.t('admin.common.actions')}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {vm.submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-wine-50/40">
                    <td className="px-5 py-3 font-medium text-gray-900">{submission.wineName}</td>
                    <td className="px-5 py-3 text-gray-600">{submission.wineryName}</td>
                    <td className="px-5 py-3 text-gray-600 break-words">{submission.submittedByUsername ? `@${submission.submittedByUsername}` : vm.t('admin.submissions.unknownAuthor')}</td>
                    <td className="px-5 py-3"><span className="rounded-full bg-wine-50 px-2.5 py-1 text-xs text-wine-800">{vm.t(`admin.submissions.status.${submission.status}`)}</span></td>
                    <td className="px-5 py-3 text-gray-500">{new Date(submission.createdAt).toLocaleString(i18n.resolvedLanguage ?? i18n.language)}</td>
                    <td className="px-5 py-3 text-right"><button onClick={() => vm.selectSubmission(submission.id)} className="text-sm font-medium text-wine-700 hover:underline">{vm.t('common.view')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination page={vm.page} totalPages={vm.totalPages} totalItems={vm.totalItems} onPageChange={vm.setPage} label={vm.t('admin.submissions.items')} />
      </div>

      {vm.selectedId ? (
        <AdminFormDialog open onClose={vm.closeDetail} labelledBy={vm.submission ? 'admin-submission-title' : undefined} ariaLabel={vm.t('admin.submissions.title')} widthClassName="max-w-3xl" panelClassName="max-h-[92vh] overflow-y-auto p-6">
            {vm.isDetailError ? <><AdminQueryError retry={vm.refetchDetail} /><button onClick={vm.closeDetail}>{vm.t('common.close')}</button></> : vm.isDetailLoading || !vm.submission ? <div className="p-12 text-center"><Spinner /></div> : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div><h2 id="admin-submission-title" className="text-xl font-semibold text-gray-900">{vm.submission.wineName}</h2><p className="text-sm text-gray-500">{vm.submission.wineryName}</p></div>
                  <button onClick={vm.closeDetail} className="rounded-lg px-3 py-1 text-gray-500 hover:bg-gray-100" aria-label={vm.t('common.close')}>×</button>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    {vm.image.url ? (
                      <img src={vm.image.url} onError={vm.image.onImageError} alt={vm.t('admin.submissions.labelImage')} className="max-h-96 w-full rounded-xl bg-gray-50 object-contain" />
                    ) : vm.image.isError ? (
                      <div role="alert" className="rounded-xl bg-red-50 p-4">
                        <p>{vm.t('admin.submissions.imageLoadError')}</p>
                        <button type="button" onClick={vm.image.retry} className="mt-3 font-semibold text-wine-700">{vm.t('common.retry')}</button>
                      </div>
                    ) : (
                      <div role="status" className="flex h-64 items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500">
                        {vm.t(vm.image.isLoading ? 'common.loading' : 'admin.submissions.imageUnavailable')}
                      </div>
                    )}
                  </div>
                  <dl className="grid content-start grid-cols-2 gap-3 text-sm">
                    <dt className="text-gray-500">{vm.t('admin.submissions.submittedBy')}</dt><dd className="min-w-0 break-words">{vm.submission.submittedByUsername ? `@${vm.submission.submittedByUsername}` : vm.t('admin.submissions.unknownAuthor')}</dd>
                    <dt className="text-gray-500">{vm.t('admin.submissions.type')}</dt><dd>{wineTypeLabel(vm.t, vm.submission.wineType) || '—'}</dd>
                    <dt className="text-gray-500">{vm.t('admin.submissions.vintage')}</dt><dd>{vm.submission.vintage ?? '—'}</dd>
                    <dt className="text-gray-500">{vm.t('admin.submissions.grapes')}</dt><dd>{vm.submission.grapes.join(', ') || '—'}</dd>
                    <dt className="text-gray-500">{vm.t('admin.submissions.origin')}</dt><dd>{[vm.submission.region, vm.submission.country].filter(Boolean).join(', ') || '—'}</dd>
                    <dt className="text-gray-500">{vm.t('admin.submissions.catalog.title')}</dt>
                    <dd>
                      <ul className="space-y-1">
                        {vm.catalogValues.map(({ field, value, proposed }) => (
                          <li key={`${field}-${value}`} className="flex flex-wrap items-center gap-2">
                            <span className="text-gray-500">{vm.t(`admin.submissions.catalog.${field}`)}:</span>
                            <span className="break-words">{value}</span>
                            <span className={proposed ? 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800' : 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800'}>
                              {vm.t(proposed ? 'admin.submissions.catalog.proposed' : 'admin.submissions.catalog.existing')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </dd>
                    <dt className="text-gray-500">{vm.t('admin.submissions.confidence')}</dt><dd>{vm.submission.reviewConfidence == null ? '—' : `${Math.round(vm.submission.reviewConfidence * 100)}%`}</dd>
                    <dt className="text-gray-500">{vm.t('admin.submissions.notes')}</dt><dd>{vm.submission.notes ?? '—'}</dd>
                  </dl>
                </div>
                <SubmissionDecisionPanel vm={vm} submission={vm.submission} />
              </div>
            )}
        </AdminFormDialog>
      ) : null}
    </div>
  )
}
