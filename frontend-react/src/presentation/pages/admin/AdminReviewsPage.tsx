import { AdminTableScroll } from '@components/features/admin/AdminTableScroll'
import { useTranslation } from 'react-i18next'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
/**
 * AdminReviewsPage — Review moderation: list, search, delete
 *
 * Migrated from Vue: frontend/src/pages/admin/AdminReviewsPage.vue
 * Architecture: page → hooks → service → client → http
 */

import { Link } from 'react-router-dom'
import { AdminBackLink } from '@components/features/admin/AdminBackLink'
import { AdminPageHeader } from '@components/features/admin/AdminPageHeader'
import { AdminSearchBar } from '@components/features/admin/AdminSearchBar'
import { AdminPagination } from '@components/features/admin/AdminPagination'
import { AdminDeleteConfirm } from '@components/features/admin/AdminDeleteConfirm'
import { Spinner } from '@components/ui/Spinner'
import { GlassRating } from '@components/ui/rating/GlassRating'
import { UserBadge } from '@components/features/points/UserBadge'
import { SocialAvatar } from '@components/features/social/SocialAvatar'
import { useAdminReviewsViewModel } from './useAdminReviewsViewModel'

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function AdminReviewsPage() {
  const { i18n } = useTranslation()
  const {
    t,
    canDelete,
    page,
    setPage,
    search,
    setSearch,
    isLoading,
    isError,
    refetch,
    reviews,
    totalItems,
    totalPages,
    confirmDeleteId,
    handleSearch,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
  } = useAdminReviewsViewModel()

  return (
    <div className="space-y-6">
      <AdminBackLink />
      <Link className="text-wine-700 underline" to="/admin/community">{t("community.moderation")}</Link>
      <AdminPageHeader title={t('admin.reviews.title')} subtitle={t('admin.reviews.subtitle')} />
      <AdminSearchBar value={search} onChange={setSearch} onSearch={handleSearch} placeholder={t('admin.reviews.searchPlaceholder')} />

      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        {isError ? <AdminQueryError retry={refetch} /> : isLoading ? <div className="p-12 text-center"><Spinner /></div> : reviews.length === 0 ? <div className="p-12 text-center"><p className="text-sm text-gray-500">{t('admin.reviews.noReviews')}</p></div> : (
          <AdminTableScroll><table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.reviews.user')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.reviews.wine')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.reviews.rating')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.reviews.reviewTitle')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.reviews.likes')}</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.reviews.date')}</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">{t('admin.common.actions')}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-sky-50/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span data-testid="admin-review-avatar" className="shrink-0">
                        <SocialAvatar src={review.reviewer?.avatarUrl ?? null} sizeClassName="h-8 w-8" className="ring-2 ring-white shadow-sm" />
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-gray-900 text-xs">
                        {review.reviewer?.displayName ?? t('admin.reviews.unknownUser')}
                        <UserBadge tier={review.reviewer?.badgeTier} size={16} />
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {review.wine ? (
                      <Link to={`/wines/${review.wineId}`} className="text-sky-600 hover:text-sky-800 text-xs font-medium hover:underline">
                        {review.wine.name}
                        {review.wine.vintage && <span className="text-gray-400 ml-0.5">{review.wine.vintage}</span>}
                      </Link>
                    ) : <span className="text-gray-400 text-xs">{t('admin.reviews.notAvailable')}</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <GlassRating value={review.rating} size={16} showValue />
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs max-w-[200px] truncate" title={review.title ?? ''}>{review.title || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                      {review.likesCount}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{formatDate(review.createdAt, i18n.resolvedLanguage ?? i18n.language)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {canDelete && (
                      <button onClick={() => openDeleteConfirm(review.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title={t('common.delete')}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></AdminTableScroll>
        )}
        <AdminPagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} label={t('admin.reviews.labelPlural')} />
      </div>

      <AdminDeleteConfirm open={!!confirmDeleteId} title={t('admin.reviews.deleteTitle')} message={t('admin.reviews.deleteMessage')} onCancel={closeDeleteConfirm} onConfirm={handleDelete} />
    </div>
  )
}

export default AdminReviewsPage
