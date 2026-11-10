import { AdminTableScroll } from '@components/features/admin/AdminTableScroll'
import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminPagination } from '@components/features/admin/AdminPagination'
import { Spinner } from '@components/ui/Spinner'
import { GlassRating } from '@components/ui/rating/GlassRating'
import type { AdminWine } from '@domain/admin/admin.types'
import { wineTypeLabel } from '@shared/i18n/wineTypeLabel'
import type { TFunction } from 'i18next'
import type { ReactNode } from 'react'

const wineTypeColorMap: Record<string, string> = {
  RED: 'bg-red-50 text-red-700',
  WHITE: 'bg-yellow-50 text-yellow-700',
  ROSE: 'bg-pink-50 text-pink-700',
  SPARKLING: 'bg-sky-50 text-sky-700',
  DESSERT: 'bg-orange-50 text-orange-700',
  FORTIFIED: 'bg-purple-50 text-purple-700',
  ORANGE: 'bg-amber-50 text-amber-700',
}

interface AdminWinesTableProps {
  t: TFunction
  isAdmin: boolean
  isLoading: boolean
  wines: AdminWine[]
  page: number
  totalPages: number
  totalItems: number
  setPage: (page: number) => void
  openEdit: (wine: AdminWine) => void
  onAiProfileAction: (wineId: string) => void
  setConfirmDeleteId: (wineId: string | null) => void
}

export function AdminWinesTable({
  t,
  isAdmin,
  isLoading,
  wines,
  page,
  totalPages,
  totalItems,
  setPage,
  openEdit,
  onAiProfileAction,
  setConfirmDeleteId,
}: AdminWinesTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/60 bg-white shadow-sm">
      {isLoading ? (
        <div className="p-12 text-center"><Spinner /></div>
      ) : wines.length === 0 ? (
        <div className="p-12 text-center"><p className="text-sm text-gray-500">{t('admin.wines.noWines')}</p></div>
      ) : (
        <AdminTableScroll><table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.wines.name')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.wines.type')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.wines.winery')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('wines.price')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.wines.rating')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.common.status')}</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {wines.map((wine) => (
              <AdminWineRow
                key={wine.id}
                wine={wine}
                t={t}
                isAdmin={isAdmin}
                openEdit={openEdit}
                onAiProfileAction={onAiProfileAction}
                setConfirmDeleteId={setConfirmDeleteId}
              />
            ))}
          </tbody>
        </table></AdminTableScroll>
      )}
      <AdminPagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} label={t('admin.wines.labelPlural')} />
    </div>
  )
}

function AdminWineRow({
  wine,
  t,
  isAdmin,
  openEdit,
  onAiProfileAction,
  setConfirmDeleteId,
}: {
  wine: AdminWine
  t: TFunction
  isAdmin: boolean
  openEdit: (wine: AdminWine) => void
  onAiProfileAction: (wineId: string) => void
  setConfirmDeleteId: (wineId: string | null) => void
}) {
  return (
    <tr className="transition-colors duration-150 hover:bg-wine-50/30">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          {wine.imageUrl ? (
            <img src={wine.imageUrl} alt={wine.name} className="h-10 w-8 rounded object-contain" />
          ) : (
            <div className="flex h-10 w-8 items-center justify-center rounded bg-wine-50">
              <svg className="h-4 w-4 text-wine-300" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2L3 7v2h14V7l-7-5zM5 11v7h4v-4h2v4h4v-7H5z" /></svg>
            </div>
          )}
          <div>
            <Link to={`/wines/${wine.id}`} className="font-medium text-gray-900 transition-colors hover:text-wine-600">{wine.name}</Link>
            {wine.vintage && <span className="ml-1 text-xs text-gray-400">{wine.vintage}</span>}
            {wine.isFeatured && <span className="ml-1.5 inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-2xs font-semibold text-amber-600"><Star className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />{t('admin.wines.featuredTag')}</span>}
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${wineTypeColorMap[wine.wineType] || 'bg-gray-50 text-gray-700'}`}>{wineTypeLabel(t, wine.wineType)}</span>
      </td>
      <td className="px-5 py-3.5 text-xs text-gray-600">{wine.wineryName}</td>
      <td className="px-5 py-3.5 text-xs text-gray-600">
        {wine.priceMin ? <span className="font-medium">$ {wine.priceMin}{wine.priceMax && wine.priceMax !== wine.priceMin ? ` - ${wine.priceMax}` : ''}</span> : <span className="text-gray-300">-</span>}
      </td>
      <td className="px-5 py-3.5">
        {wine.ratingAverage ? (
          <GlassRating value={Number(wine.ratingAverage)} wineType={wine.wineType} size={16} showValue />
        ) : <span className="text-xs text-gray-300">-</span>}
      </td>
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold ${wine.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-red-50 text-red-700 ring-1 ring-red-600/20'}`}>
          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${wine.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {wine.isActive ? t('admin.wines.active') : t('admin.wines.inactive')}
        </span>
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <RowAction title={t('common.edit')} onClick={() => openEdit(wine)} colorClass="hover:text-wine-600 hover:bg-wine-50">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </RowAction>
          <RowAction title={t('admin.aiProfile.title')} onClick={() => onAiProfileAction(wine.id)} colorClass="hover:text-purple-600 hover:bg-purple-50">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </RowAction>
          {isAdmin && (
            <RowAction title={t('common.delete')} onClick={() => setConfirmDeleteId(wine.id)} colorClass="hover:text-red-600 hover:bg-red-50">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </RowAction>
          )}
        </div>
      </td>
    </tr>
  )
}

function RowAction({ title, onClick, colorClass, children }: { title: string; onClick: () => void; colorClass: string; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-lg p-1.5 text-gray-400 transition-colors ${colorClass}`} title={title}>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{children}</svg>
    </button>
  )
}
