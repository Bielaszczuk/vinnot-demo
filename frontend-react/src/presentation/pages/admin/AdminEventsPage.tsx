import { AdminTableScroll } from '@components/features/admin/AdminTableScroll'
import { useTranslation } from 'react-i18next'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
/**
 * AdminEventsPage — Full CRUD for events with modal form
 *
 * Migrated from Vue: frontend/src/pages/admin/AdminEventsPage.vue
 * Architecture: page → hooks → service → client → http
 */

import { Link } from 'react-router-dom'
import { AdminBackLink } from '@components/features/admin/AdminBackLink'
import { AdminPageHeader } from '@components/features/admin/AdminPageHeader'
import { AdminSearchBar } from '@components/features/admin/AdminSearchBar'
import { AdminPagination } from '@components/features/admin/AdminPagination'
import { CancelEventDialog } from '@components/features/event/CancelEventDialog'
import { canCancelEvent } from '@domain/event/eventCancellation'
import { Spinner } from '@components/ui/Spinner'
import { EventFormModal } from '@components/features/event/EventFormModal'
import { useAdminEventsViewModel } from './useAdminEventsViewModel'

const statusStyles: Record<string, string> = {
  PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  DRAFT: 'bg-gray-100 text-gray-600 ring-1 ring-gray-300/40',
  CANCELLED: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
  COMPLETED: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20',
}
const statusDot: Record<string, string> = {
  PUBLISHED: 'bg-emerald-500',
  DRAFT: 'bg-gray-400',
  CANCELLED: 'bg-red-500',
  COMPLETED: 'bg-sky-500',
}
const statusLabelKey: Record<string, string> = {
  PUBLISHED: 'events.statusLabels.published',
  DRAFT: 'events.statusLabels.draft',
  CANCELLED: 'events.statusLabels.cancelled',
  COMPLETED: 'events.statusLabels.completed',
}

export function AdminEventsPage() {
  const { i18n } = useTranslation()
  const {
    t,
    isAdmin,
    page,
    setPage,
    search,
    setSearch,
    events,
    totalItems,
    totalPages,
    isLoading,
    isError,
    refetch,
    showModal,
    editingEvent,
    saving,
    confirmDeleteId,
    confirmDeleteTitle,
    setConfirmDeleteId,
    closeDeleteConfirm,
    cancelling,
    handleSearch,
    openCreate,
    openEdit,
    closeModal,
    saveEvent,
    handleDelete,
  } = useAdminEventsViewModel()

  return (
    <div className="space-y-6">
      <AdminBackLink />
      <AdminPageHeader
        title={t('admin.events.title')}
        subtitle={t('admin.events.subtitle')}
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-xl backdrop-blur-sm border border-white/20 transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('admin.events.newEvent')}
          </button>
        }
      />
      <AdminSearchBar
        value={search}
        onChange={setSearch}
        onSearch={handleSearch}
        placeholder={t('admin.events.searchPlaceholder')}
      />

      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        {isError ? (
          <AdminQueryError retry={refetch} />
        ) : isLoading ? (
          <div className="p-12 text-center">
            <Spinner />
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">
              {t('admin.events.noEvents')}
            </p>
          </div>
        ) : (
          <AdminTableScroll><table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">
                  {t('admin.events.eventTitle')}
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">
                  {t('admin.events.type')}
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">
                  {t('admin.events.status')}
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">
                  {t('admin.events.date')}
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">
                  {t('admin.events.city')}
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">
                  {t('admin.events.attendees')}
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">
                  {t('admin.common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events.map((e) => (
                <tr
                  key={e.id}
                  className="hover:bg-purple-50/30 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/events/${e.id}`}
                      className="font-medium text-gray-900 hover:text-purple-600"
                    >
                      {e.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
                      {t(
                        `events.types.${String(e.type ?? '').toLowerCase()}`,
                        String(e.type ?? ''),
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold ${statusStyles[e.status] || ''}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusDot[e.status] || ''}`}
                      />
                      {statusLabelKey[e.status]
                        ? t(statusLabelKey[e.status]!)
                        : e.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">
                    {new Date(e.startDate).toLocaleDateString(
                      i18n.resolvedLanguage ?? i18n.language,
                      { day: 'numeric', month: 'short', year: 'numeric' },
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">
                    {e.locationCity ?? t('admin.common.emptyValue')}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">
                    <span className="font-medium">{e.currentAttendees}</span>
                    {e.maxAttendees ? ` / ${e.maxAttendees}` : ''}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title={t('common.edit')}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      {isAdmin &&
                        canCancelEvent(e.status) && (
                          <button
                            onClick={() => setConfirmDeleteId(e.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title={t('admin.events.cancelAction')}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></AdminTableScroll>
        )}
        <AdminPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setPage}
          label={t('admin.events.labelPlural')}
        />
      </div>

      <EventFormModal
        isOpen={showModal}
        event={editingEvent}
        saving={saving}
        onClose={closeModal}
        onSave={saveEvent}
      />

      <CancelEventDialog
        open={!!confirmDeleteId}
        eventTitle={confirmDeleteTitle}
        isSubmitting={cancelling}
        onClose={closeDeleteConfirm}
        onConfirm={(cancellation) => void handleDelete(cancellation)}
      />
    </div>
  )
}

export default AdminEventsPage
