/**
 * AdminWineriesPage — full CRUD for wineries.
 *
 * Architecture: page → view-model → hooks → service → client → http.
 * The editor is a dialog of collapsible sections (react-hook-form + Zod) with
 * geocoding and a map pick, logo and cover upload, and an unsaved-changes guard.
 */

import { AdminTableScroll } from '@components/features/admin/AdminTableScroll'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'

import { Link } from 'react-router-dom'
import { AdminBackLink } from '@components/features/admin/AdminBackLink'
import { AdminPageHeader } from '@components/features/admin/AdminPageHeader'
import { AdminSearchBar } from '@components/features/admin/AdminSearchBar'
import { AdminPagination } from '@components/features/admin/AdminPagination'
import { AdminDeleteConfirm } from '@components/features/admin/AdminDeleteConfirm'
import { Spinner } from '@components/ui/Spinner'
import { AdminWineryFormDialog } from '@components/features/admin/winery-form/AdminWineryFormDialog'
import { useAdminWineriesViewModel } from './useAdminWineriesViewModel'
import { useCountryName } from '@hooks/useCountryName'

export function AdminWineriesPage() {
  const countryName = useCountryName()
  const {
    t,
    isAdmin,
    page,
    setPage,
    search,
    setSearch,
    filterCountryId,
    filterRegionId,
    editingWinery,
    editorKey,
    confirmDeleteId,
    setConfirmDeleteId,
    countries,
    filterRegions,
    wineries,
    totalItems,
    totalPages,
    isLoading,
    isError,
    refetch,
    saving,
    handleSearch,
    openCreate,
    openEdit,
    saveWinery,
    handleDelete,
    clearFilters,
    onFilterCountryChange,
    onFilterRegionChange,
    closeModal,
  } = useAdminWineriesViewModel()

  return (
    <div className="space-y-6">
      <AdminBackLink />
      <AdminPageHeader title={t('admin.wineries.title')} subtitle={t('admin.wineries.subtitle')} actions={
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-xl backdrop-blur-sm border border-white/20 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {t('admin.wineries.new')}
        </button>
      } />
      <AdminSearchBar value={search} onChange={setSearch} onSearch={handleSearch} placeholder={t('admin.wineries.searchPlaceholder')} />
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">{t('admin.wineries.country')}</label>
            <select
              value={filterCountryId || ''}
              onChange={(e) => {
                const nextCountryId = e.target.value || null
                onFilterCountryChange(nextCountryId)
              }}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
            >
              <option value="">{t('admin.wineries.allCountries')}</option>
              {countries?.map((country) => (
                <option key={country.id} value={country.id}>
                  {countryName(country.name)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">{t('admin.wineries.region')}</label>
            <select
              value={filterRegionId || ''}
              onChange={(e) => onFilterRegionChange(e.target.value || null)}
              disabled={!filterCountryId}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all disabled:opacity-50"
            >
              <option value="">{t('admin.wineries.allRegions')}</option>
              {filterRegions?.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full px-3.5 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors ring-1 ring-amber-200/70"
            >
              {t('common.clear')}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        {isError ? <AdminQueryError retry={refetch} /> : isLoading ? <div className="p-12 text-center"><Spinner /></div> : wineries.length === 0 ? <div className="p-12 text-center"><p className="text-sm text-gray-500">{t('admin.wineries.noWineries')}</p></div> : (
          <AdminTableScroll><table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.wineries.name')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.wineries.countryRegion')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.wineries.established')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.wineries.wines')}</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.common.actions')}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {wineries.map((w) => (
                <tr key={w.id} className="hover:bg-amber-50/30 transition-colors duration-150">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        {w.logoUrl ? <img src={w.logoUrl} alt={w.name} className="w-6 h-6 object-contain" /> : <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>}
                      </div>
                      <Link to={`/wineries/${w.id}`} className="font-medium text-gray-900 hover:text-amber-600 transition-colors">{w.name}</Link>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">{countryName(w.countryName)}{w.regionName ? ` / ${w.regionName}` : ''}</td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">{w.establishedYear ?? t('admin.common.emptyValue')}</td>
                  <td className="px-5 py-3.5"><span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-medium">{t('admin.wineries.winesCount', { count: w.winesCount })}</span></td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(w)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title={t('common.edit')}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {isAdmin && <button onClick={() => setConfirmDeleteId(w.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title={t('common.delete')}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></AdminTableScroll>
        )}
        <AdminPagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} label={t('admin.wineries.labelPlural')} />
      </div>

      {editingWinery && (
        <AdminWineryFormDialog
          key={editorKey}
          winery={editingWinery}
          saving={saving}
          onSave={saveWinery}
          onClose={closeModal}
        />
      )}

      <AdminDeleteConfirm open={!!confirmDeleteId} title={t('admin.wineries.deleteTitle')} message={t('admin.wineries.deleteMessage')} onCancel={() => setConfirmDeleteId(null)} onConfirm={handleDelete} />
    </div>
  )
}

export default AdminWineriesPage
