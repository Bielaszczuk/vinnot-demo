/** Organizer dashboard: own events, editing and registration management. */

import { Link } from 'react-router-dom'
import { CalendarPlus, CreditCard, PartyPopper, Plus } from 'lucide-react'
import { isEventPaymentsEnabled } from '@config/featureFlags'
import { Button } from '@components/ui/Button'
import { Card } from '@components/ui/Card'
import { EmptyState } from '@components/ui/EmptyState'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { PageBanner } from '@components/ui/PageBanner'
import { PageLoader } from '@components/ui/PageLoader'
import { Pagination } from '@components/ui/Pagination'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { formatDate } from '@utils/date'
import { EventFormModal } from '@components/features/event/EventFormModal'
import { EventRegistrationsManagerModal } from '@components/features/event/EventRegistrationsManagerModal'
import { CancelEventDialog } from '@components/features/event/CancelEventDialog'
import { canCancelEvent } from '@domain/event/eventCancellation'
import { usePartnerEventsViewModel } from './usePartnerEventsViewModel'

/* ── Helpers ──────────────────────────────────────────────────────── */

const dateFormat: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }

function getStatusColor(status: string): string {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-success-soft text-success'
    case 'CANCELLED':
      return 'bg-danger-soft text-danger'
    case 'COMPLETED':
      return 'bg-info-soft text-info'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const dangerTextAction =
  'rounded-sm px-0.5 text-sm font-medium text-danger underline decoration-danger/40 underline-offset-4 hover:decoration-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

/* ── Component ────────────────────────────────────────────────────── */

export function PartnerEventsPage() {
  const {
    t,
    page,
    showModal,
    editingEvent,
    registrationsEvent,
    saving,
    isLoading,
    loadFailed,
    loadError,
    retry,
    events,
    totalItems,
    totalPages,
    openCreate,
    openEdit,
    handleSave,
    cancelTarget,
    openCancel,
    closeCancel,
    handleDelete,
    cancelling,
    handleCloseModal,
    openRegistrations,
    closeRegistrations,
    goToPage,
  } = usePartnerEventsViewModel()

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <PageBanner
        title={t('partner.events.title')}
        subtitle={t('partner.events.subtitle')}
        icon={PartyPopper}
        actions={
          <>
            {isEventPaymentsEnabled() && (
              <LinkButton to="/partner/payments" variant="onDark" leftIcon={<Icon icon={CreditCard} />}>
                {t('payments.title')}
              </LinkButton>
            )}
            <Button onClick={openCreate} leftIcon={<Icon icon={Plus} />}>
              {t('partner.events.create')}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-gray-500">
            {t('partner.events.totalEvents')}
          </p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {totalItems}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">
            {t('partner.events.confirmedVisible')}
          </p>
          <p className="mt-2 text-3xl font-semibold text-wine-700">
            {events.reduce((total, event) => total + event.currentAttendees, 0)}
          </p>
        </Card>
      </div>
      {/* Event list card */}
      <Card padding="none">
        {isLoading ? (
          <PageLoader compact />
        ) : loadFailed ? (
          <div className="p-6">
            <QueryErrorState error={loadError} onRetry={retry} />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            illustration="partnerEvents"
            title={t('partner.events.noEvents')}
            action={
              <Button onClick={openCreate} leftIcon={<Icon icon={CalendarPlus} />}>
                {t('partner.events.createFirst')}
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      {t('admin.events.eventTitle')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      {t('admin.events.type')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      {t('partner.events.startDate')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      {t('admin.events.city')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      {t('admin.events.status')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      {t('admin.events.attendees')}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      {t('admin.common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link
                          to={`/events/${e.id}`}
                          className="rounded-sm hover:text-wine-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500"
                        >
                          {e.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600">
                        {t(`events.types.${e.type}`)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(e.startDate, dateFormat)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {e.locationCity || t('admin.common.emptyValue')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(e.status)}`}
                        >
                          {t(`events.statusLabels.${e.status.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {e.currentAttendees}
                        {e.maxAttendees ? ` / ${e.maxAttendees}` : ''}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                          <Button variant="link" onClick={() => openRegistrations(e)}>
                            {t('events.registrationManager.title')}
                          </Button>
                          <Button variant="link" onClick={() => openEdit(e.id)}>
                            {t('common.edit')}
                          </Button>
                          {canCancelEvent(e.status) && (
                            <button
                              type="button"
                              className={dangerTextAction}
                              onClick={() => openCancel(e)}
                              disabled={cancelling}
                            >
                              {t('admin.events.cancelAction')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-100 px-4 pb-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={goToPage}
                summary={t('partner.events.showing', { count: events.length, total: totalItems })}
              />
            </div>
          </>
        )}
      </Card>

      {/* Event form modal (shared component) */}
      <EventFormModal
        isOpen={showModal}
        event={editingEvent}
        saving={saving}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
      <CancelEventDialog
        open={cancelTarget !== null}
        eventTitle={cancelTarget?.title ?? ''}
        isSubmitting={cancelling}
        onClose={closeCancel}
        onConfirm={(cancellation) => void handleDelete(cancellation)}
      />
      {registrationsEvent ? (
        <EventRegistrationsManagerModal
          key={registrationsEvent.id}
          isOpen
          eventId={registrationsEvent.id}
          eventTitle={registrationsEvent.title}
          onClose={closeRegistrations}
        />
      ) : null}
    </div>
  )
}
