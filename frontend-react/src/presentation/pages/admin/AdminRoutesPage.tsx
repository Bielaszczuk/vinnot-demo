/**
 * AdminRoutesPage — wine route list with create, edit and delete.
 *
 * Architecture: page → view-model → hooks → service → client → http. The route
 * editor (sections, stops, inline winery creation) lives in `route-form/`.
 */

import { Link } from 'react-router-dom'
import { AdminTableScroll } from '@components/features/admin/AdminTableScroll'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import { AdminBackLink } from '@components/features/admin/AdminBackLink'
import { AdminPageHeader } from '@components/features/admin/AdminPageHeader'
import { AdminSearchBar } from '@components/features/admin/AdminSearchBar'
import { AdminPagination } from '@components/features/admin/AdminPagination'
import { AdminDeleteConfirm } from '@components/features/admin/AdminDeleteConfirm'
import { AdminRouteFormDialog, AdminRouteFormLoading } from '@components/features/admin/route-form/AdminRouteFormDialog'
import { Spinner } from '@components/ui/Spinner'
import { useAdminRoutesViewModel } from './useAdminRoutesViewModel'
import { useCountryName } from '@hooks/useCountryName'

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  draft: 'bg-gray-100 text-gray-600 ring-1 ring-gray-300/40',
  archived: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
}
const statusLabelKey: Record<string, string> = { active: 'admin.routes.statusLabels.active', draft: 'admin.routes.statusLabels.draft', archived: 'admin.routes.statusLabels.archived' }
const difficultyLabelKey: Record<string, string> = { short: 'admin.routes.difficulty.short', medium: 'admin.routes.difficulty.medium', long: 'admin.routes.difficulty.long' }

export function AdminRoutesPage() {
  const countryName = useCountryName()
  const {
    t,
    isAdmin,
    page,
    setPage,
    search,
    setSearch,
    routes,
    totalItems,
    totalPages,
    isLoading,
    isError,
    refetch,
    editingRoute,
    editorKey,
    loadingDetail,
    wineryPicker,
    confirmDeleteId,
    setConfirmDeleteId,
    saving,
    handleSearch,
    openCreate,
    openEdit,
    closeEditor,
    saveRoute,
    handleDelete,
  } = useAdminRoutesViewModel()

  return (
    <div className="space-y-6">
      <AdminBackLink />
      <AdminPageHeader title={t('admin.routes.title')} subtitle={t('admin.routes.subtitle')} actions={
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-xl backdrop-blur-sm border border-white/20 transition-all">
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {t('admin.routes.newRoute')}
        </button>
      } />
      <AdminSearchBar value={search} onChange={setSearch} onSearch={handleSearch} placeholder={t('admin.routes.searchPlaceholder')} />

      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        {isError ? <AdminQueryError retry={refetch} /> : isLoading ? <div className="p-12 text-center"><Spinner /></div> : routes.length === 0 ? <div className="p-12 text-center"><p className="text-sm text-gray-500">{t('admin.routes.noRoutes')}</p></div> : (
          <AdminTableScroll><table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.routes.name')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.wineries.countryRegion')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.routes.status')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.routes.duration')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.routes.daysKm')}</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">{t('admin.common.actions')}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {routes.map((r) => (
                <tr key={r.id} className="hover:bg-emerald-50/30 transition-colors">
                  <td className="px-5 py-3.5"><Link to={`/wine-routes/${r.id}`} className="font-medium text-gray-900 hover:text-emerald-600">{r.name}</Link></td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">{countryName(r.country)}{r.region ? ` / ${r.region}` : ''}</td>
                  <td className="px-5 py-3.5"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold ${statusStyles[r.status] || ''}`}>{t(statusLabelKey[r.status] || 'admin.common.emptyValue')}</span></td>
                  <td className="px-5 py-3.5"><span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">{difficultyLabelKey[r.difficulty ?? ''] ? t(difficultyLabelKey[r.difficulty ?? ''] ?? '') : t('admin.common.emptyValue')}</span></td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">{r.estimatedDays ?? t('admin.common.emptyValue')} {t('admin.routes.days')} / {r.totalDistance ? `${r.totalDistance}km` : t('admin.common.emptyValue')}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => void openEdit(r)} aria-label={t('common.edit')} title={t('common.edit')} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"><svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      {isAdmin && <button type="button" onClick={() => setConfirmDeleteId(r.id)} aria-label={t('common.delete')} title={t('common.delete')} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></AdminTableScroll>
        )}
        <AdminPagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} label={t('admin.routes.labelPlural')} />
      </div>

      {loadingDetail && <AdminRouteFormLoading onClose={closeEditor} />}
      {editingRoute && (
        <AdminRouteFormDialog
          key={editorKey}
          route={editingRoute}
          saving={saving}
          winery={wineryPicker}
          onSave={saveRoute}
          onClose={closeEditor}
        />
      )}

      <AdminDeleteConfirm open={!!confirmDeleteId} title={t('admin.routes.deleteTitle')} message={t('admin.routes.deleteMessage')} onCancel={() => setConfirmDeleteId(null)} onConfirm={handleDelete} />
    </div>
  )
}

export default AdminRoutesPage
