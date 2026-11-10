import { useOrganizerPayments, useRequestPaymentRefund } from '@hooks/queries/event/useOrganizerPayments';
import { useConfirm } from '@hooks/useConfirm';
import { allowedRegistrationActions as allowedActions } from '@domain/event/eventRegistrationActions';
import { refundCanBeRetried } from '@domain/event/organizerPayment';
import { useTranslation } from 'react-i18next'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import { useMemo, useState } from 'react'
import { Button } from '@components/ui/Button'
import { Modal } from '@components/ui/Modal'
import { PageLoader } from '@components/ui/PageLoader'
import { Pagination } from '@components/ui/Pagination'
import { Select } from '@components/ui/Select'
import { formatDateTime } from '@utils/date'
import { formatPrice } from '@utils/format'
import {
  useEventRegistrations,
  useReviewEventRegistration,
} from '@hooks/queries/event'
import { useToast } from '@hooks/useToast'
import { apiErrorMessage } from '@/presentation/feedback/apiErrorMessage'
import { RegistrationReviewDialog } from './RegistrationReviewDialog'
import type {
  EventRegistration,
  EventRegistrationAction,
  EventRegistrationStatus,
} from '@domain/event/event.types'

interface EventRegistrationsManagerModalProps {
  isOpen: boolean
  eventId: string | null
  eventTitle: string
  onClose: () => void
}

const PAGE_SIZE = 20

const STATUS_STYLES: Record<EventRegistrationStatus, string> = {
  REQUESTED: 'bg-warning-soft text-warning',
  AWAITING_PAYMENT: 'bg-info-soft text-info',
  AWAITING_ATTENDEE_CONFIRMATION: 'bg-wine-50 text-wine-800',
  CONFIRMED: 'bg-success-soft text-success',
  WAITLISTED: 'bg-gray-100 text-gray-700',
  REJECTED: 'bg-danger-soft text-danger',
  CANCELLED: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-warning-soft text-warning',
}

function formatDate(value: Date | null, locale: string): string {
  return value ? formatDateTime(value, locale) : '—'
}

function formatAmount(registration: EventRegistration, locale: string, freeLabel: string): string {
  if (!registration.totalAmount) return freeLabel
  return formatPrice(registration.totalAmount, registration.currency, locale)
}




export function EventRegistrationsManagerModal({
  isOpen,
  eventId,
  eventTitle,
  onClose,
}: EventRegistrationsManagerModalProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const { addToast } = useToast()
  const [status, setStatus] = useState<EventRegistrationStatus | ''>('')
  const [page, setPage] = useState(0)
  const [reviewTarget, setReviewTarget] = useState<{ registration: EventRegistration; action: EventRegistrationAction } | null>(null)


  const query = useEventRegistrations(
    eventId ?? undefined,
    status || undefined,
    page,
    PAGE_SIZE,
  )
  const reviewMutation = useReviewEventRegistration(eventId ?? '')
  const registrations = useMemo(
    () => query.data?.registrations ?? [],
    [query.data?.registrations],
  )
  const payments = useOrganizerPayments(eventId ?? '', registrations.filter(r => r.externallyManagedPayment).map(r => r.id))
  const refundMutation = useRequestPaymentRefund(eventId ?? '')
  const { confirm } = useConfirm()
  async function refund(registration: EventRegistration) {
    const payment = payments.data?.find(p => p.registrationId === registration.id)
    if (!payment?.canRefund || refundMutation.isPending) return
    const retry = refundCanBeRetried(payment.refundStatus)
    if (!await confirm({ title: t('events.refund.title'), message: t(retry ? 'events.refund.retryConfirm' : 'events.refund.confirm', {
      amount: formatAmount(registration, locale, ''), name: registration.contactName || registration.contactEmail,
    }), confirmLabel: t(retry ? 'events.refund.retry' : 'events.refund.action'), cancelLabel: t('common.goBack'), variant: 'danger' })) return
    try {
      await refundMutation.mutateAsync(payment.attemptId)
      addToast({ type: 'success', message: t('events.refund.requested') })
      await query.refetch()
    } catch {
      addToast({ type: 'error', message: t('events.refund.error') })
      await payments.refetch()
    }
  }
  const pagination = query.data?.pagination
  const pendingRegistrationId = reviewMutation.isPending
    ? reviewMutation.variables?.registrationId
    : null

  const confirmedPeople = useMemo(
    () =>
      registrations
        .filter((registration) => registration.status === 'CONFIRMED')
        .reduce((total, registration) => total + registration.attendeeCount, 0),
    [registrations],
  )

  /** Runs the action confirmed in the dialog; the note belongs to that attendee only. */
  async function review(organizerNote: string | undefined) {
    if (!reviewTarget || reviewMutation.isPending) return
    const { registration, action } = reviewTarget
    try {
      await reviewMutation.mutateAsync({ registrationId: registration.id, action, organizerNote })
      setReviewTarget(null)
      addToast({
        type: 'success',
        message: t('events.registrationManager.updateSuccess'),
      })
    } catch (error) {
      // The dialog stays open with the note so the organizer can retry.
      addToast({
        type: 'error',
        message: apiErrorMessage(error, t, 'events.registrationManager.updateError'),
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('events.registrationManager.title')} · ${eventTitle}`}
      size="2xl"
    >
      <div className="space-y-5">
        <div className="grid gap-3 border-b border-gray-200 pb-4 md:grid-cols-[1fr_1fr_auto]">
          <Select
            id="registration-status-filter"
            label={t('admin.submissions.statusLabel')}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as EventRegistrationStatus | '')
              setPage(0)
            }}
            options={['', ...Object.keys(STATUS_STYLES)].map((value) => ({
              value,
              label: value ? t(`events.registrationManager.statuses.${value}`) : t('events.registrationManager.all'),
            }))}
          />

          <div className="self-end rounded-xl bg-surface-cream px-4 py-2.5 text-sm text-gray-700">
            {t('events.registrationManager.confirmedOnPage', { count: confirmedPeople })}
          </div>
        </div>

        {payments.isError && <p role="alert" className="text-sm text-danger">{t('events.refund.loadError')}</p>}
        {registrations.some(r => r.externallyManagedPayment) && <Button size="sm" variant="outline" onClick={() => void payments.refetch()} disabled={payments.isFetching}>{t('events.refund.refresh')}</Button>}
        {query.isLoading ? (
          <PageLoader compact />
        ) : query.isError ? (
          <AdminQueryError retry={query.refetch} />
        ) : registrations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
            {t('events.registrationManager.emptyDescription')}
          </div>
        ) : (
          <div className="space-y-3">
            {registrations.map((registration) => {
              const actions = allowedActions(registration)
              const payment = payments.data?.find(p => p.registrationId === registration.id)
              return (
                <article
                  key={registration.id}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink">
                          {registration.contactName || registration.contactEmail}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[registration.status]}`}
                        >
                          {t(`events.registrationManager.statuses.${registration.status}`)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {registration.contactEmail}
                        {registration.contactPhone
                          ? ` · ${registration.contactPhone}`
                          : ''}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-gray-900">
                        {registration.attendeeCount}{' '}
                        {t('events.registrationManager.attendeeFallback')}
                      </p>
                      <p className="text-gray-500">
                        {formatAmount(registration, locale, t('events.registrationManager.free'))}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
                    <p>{t('events.registrationManager.paymentLabel', { status: t(`events.registrationManager.paymentStatuses.${registration.paymentStatus}`) })}</p>
                    <p>{t('events.registrationManager.reservationUntil', { date: formatDate(registration.expiresAt, locale) })}</p>
                    {registration.companionNames.length > 0 ? (
                      <p className="sm:col-span-2">
                        {t('events.registrationManager.companions', { names: registration.companionNames.join(', ') })}
                      </p>
                    ) : null}
                    {registration.note ? (
                      <p className="sm:col-span-2">{t('events.registrationManager.message', { message: registration.note })}</p>
                    ) : null}
                    {registration.organizerNote ? (
                      <p className="sm:col-span-2">
                        {t('events.registrationManager.previousNote', { note: registration.organizerNote })}
                      </p>
                    ) : null}
                  </div>

                  {payment && payment.refundStatus !== 'NONE' && <p role="status" className="mt-3 rounded-lg bg-wine-50 p-3 text-sm font-medium text-wine-800">{t(`events.refund.${payment.refundStatus}`)}</p>}
                  {payment?.canRefund && !payments.isError && <Button size="sm" variant="outline" className="mt-3" disabled={refundMutation.isPending || reviewMutation.isPending} isLoading={refundMutation.isPending && refundMutation.variables === payment.attemptId} onClick={() => void refund(registration)}>{t(refundCanBeRetried(payment.refundStatus) ? 'events.refund.retry' : 'events.refund.action')}</Button>}
                  {actions.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {actions.map((action) => (
                        <Button
                          key={action}
                          size="sm"
                          variant={
                            action === 'REJECT'
                              ? 'danger'
                              : action === 'WAITLIST'
                                ? 'outline'
                                : 'primary'
                          }
                          isLoading={pendingRegistrationId === registration.id && reviewTarget?.action === action}
                          disabled={pendingRegistrationId === registration.id}
                          onClick={() => setReviewTarget({ registration, action })}
                        >
                          {t(`events.registrationManager.actions.${action}`)}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}

        {pagination ? (
          <Pagination
            page={pagination.pageNumber}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            className="border-t border-gray-100"
          />
        ) : null}
      </div>
      {reviewTarget && (
        <RegistrationReviewDialog
          key={`${reviewTarget.registration.id}:${reviewTarget.action}`}
          registration={reviewTarget.registration}
          action={reviewTarget.action}
          pending={reviewMutation.isPending}
          onCancel={() => setReviewTarget(null)}
          onConfirm={(note) => void review(note)}
        />
      )}
    </Modal>
  )
}
