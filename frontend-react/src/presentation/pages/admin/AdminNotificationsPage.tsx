/**
 * AdminNotificationsPage — announcements, push controls (#310), engagement results (#405) and the results of each send
 * (#490). ADMIN only. Three tabs: send an announcement; its history with the per-type push metrics; the push switches.
 *
 * Architecture: page → view-model hooks → query hooks → service → client → http
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminBackLink } from '@components/features/admin/AdminBackLink'
import { AdminPageHeader } from '@components/features/admin/AdminPageHeader'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import { AdminFormDialog } from '@components/features/admin/AdminFormDialog'
import { Spinner } from '@components/ui/Spinner'
import { AnnouncementKindPicker } from '@components/features/admin/notifications/AnnouncementKindPicker'
import { AnnouncementEditor } from '@components/features/admin/notifications/AnnouncementEditor'
import { AnnouncementPreviewPane } from '@components/features/admin/notifications/AnnouncementPreviewPane'
import { AnnouncementAudienceForm } from '@components/features/admin/notifications/AnnouncementAudienceForm'
import { AnnouncementHistory } from '@components/features/admin/notifications/AnnouncementHistory'
import { AnnouncementDetailDialog } from '@components/features/admin/notifications/AnnouncementDetailDialog'
import { PushTypeSwitches } from '@components/features/admin/notifications/PushTypeSwitches'
import { PushMetricsTable } from '@components/features/admin/notifications/PushMetricsTable'
import { PushEngagementTable } from '@components/features/admin/notifications/PushEngagementTable'
import { useAnnouncementComposerViewModel } from './useAnnouncementComposerViewModel'
import { usePushControlsViewModel } from './usePushControlsViewModel'
import { useAdminNotificationsHistoryViewModel } from './useAdminNotificationsHistoryViewModel'

const TABS = ['compose', 'history', 'settings'] as const
type Tab = (typeof TABS)[number]
type PushControls = ReturnType<typeof usePushControlsViewModel>

const CARD = 'rounded-xl border border-gray-200/60 bg-white p-5 shadow-sm'

function ComposeTab() {
  const vm = useAnnouncementComposerViewModel()
  const { t } = vm
  const blocked = vm.errors.length > 0
  // Sending needs someone to send to; a test goes to the administrator, so it stays available.
  const nobodyReached = !blocked && vm.reachSettled && vm.reach.data?.accounts === 0
  const audience = vm.draft.audience
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <div className="space-y-6">
          <section className={CARD}>
            <AnnouncementKindPicker value={vm.draft.kind} disabled={vm.working} onChange={vm.setKind} />
          </section>
          <section className={CARD}>
            <AnnouncementEditor
              language={vm.language}
              written={vm.languages}
              version={vm.version}
              disabled={vm.working}
              bodyRef={vm.bodyRef}
              onLanguageChange={vm.setLanguage}
              onChange={vm.updateVersion}
              onFormat={vm.applyFormat}
            />
          </section>
          <section className={CARD}>
            <AnnouncementAudienceForm
              kind={vm.draft.kind}
              audience={vm.draft.audience}
              destination={vm.draft.destination}
              countries={vm.countries}
              regions={vm.regions}
              countryId={vm.countryId}
              reach={vm.reach.data}
              reachLoading={vm.reach.isFetching}
              reachFailed={vm.reach.isError}
              onReachRetry={() => void vm.reach.refetch()}
              placesFailed={vm.placesFailed}
              disabled={vm.working}
              onAudienceChange={vm.updateAudience}
              onCountryChange={vm.selectCountry}
              onDestinationChange={vm.setDestination}
            />
          </section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {(blocked || nobodyReached) && (
              <p className="text-xs text-gray-500 sm:mr-auto" role="status">
                {blocked ? t(`admin.notifications.draftErrors.${vm.errors[0]}`) : t('admin.notifications.composer.noReach')}
              </p>
            )}
            <button
              type="button"
              onClick={vm.sendTest}
              disabled={blocked || vm.working}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {vm.testing && <Spinner size="sm" />}
              {t('admin.notifications.composer.sendTest')}
            </button>
            <button
              type="button"
              onClick={vm.openConfirm}
              disabled={blocked || vm.working || !vm.reachSettled || !vm.reach.data?.accounts}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-wine-700 px-5 text-sm font-semibold text-white hover:bg-wine-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('admin.notifications.composer.send')}
            </button>
          </div>
        </div>
        <aside className={`${CARD} h-fit xl:sticky xl:top-6`} aria-label={t('admin.notifications.preview.title')}>
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            {t('admin.notifications.preview.titleFor', { language: t(`admin.notifications.languages.${vm.previewLanguage}`) })}
          </h2>
          <AnnouncementPreviewPane
            preview={vm.preview.data}
            loading={vm.preview.isFetching}
            failed={vm.preview.isError}
            ready={vm.previewable}
          />
        </aside>
      </div>

      {vm.confirming && (
        <AdminFormDialog open onClose={vm.sending ? () => undefined : vm.closeConfirm} labelledBy="announcement-confirm-title" panelClassName="space-y-4 p-6">
          <h3 id="announcement-confirm-title" className="text-center font-semibold text-gray-900">{t('admin.notifications.confirm.title')}</h3>
          <p className="text-center text-sm text-gray-600">
            {t('admin.notifications.confirm.message', {
              count: vm.reach.data?.accounts ?? 0,
              kind: t(`admin.notifications.kinds.${vm.draft.kind}.title`),
            })}
          </p>
          {vm.reach.data && (
            <div className="rounded-xl bg-gray-50 p-3 text-center text-sm text-gray-700">
              <p>
                {[audience.email && t('admin.notifications.audience.byEmail', { count: vm.reach.data.email }),
                  audience.push && t('admin.notifications.audience.byPush', { count: vm.reach.data.push })].filter(Boolean).join(' · ')}
              </p>
              {audience.email && audience.push && <p className="mt-1 text-xs text-gray-500">{t('admin.notifications.confirm.overlap')}</p>}
            </div>
          )}
          <p className="text-center text-xs text-gray-500">{t('admin.notifications.confirm.help')}</p>
          <div className="flex justify-center gap-3 pt-2">
            <button type="button" onClick={vm.closeConfirm} disabled={vm.sending} className="min-h-11 rounded-xl px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-60">{t('common.cancel')}</button>
            <button type="button" onClick={vm.send} disabled={vm.sending || !vm.reachSettled} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-wine-700 px-4 text-sm font-semibold text-white hover:bg-wine-800 disabled:opacity-60">
              {vm.sending && <Spinner size="sm" />}
              {t('admin.notifications.confirm.send')}
            </button>
          </div>
        </AdminFormDialog>
      )}
    </div>
  )
}

function HistoryTab({ push }: { push: PushControls }) {
  const vm = useAdminNotificationsHistoryViewModel()
  const { t } = push
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200/60 bg-white shadow-sm" aria-labelledby="announcement-history-heading">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 id="announcement-history-heading" className="text-sm font-semibold text-gray-900">{t('admin.notifications.history.heading')}</h2>
          <p className="mt-1 text-xs text-gray-500">{t('admin.notifications.history.help')}</p>
        </div>
        <AnnouncementHistory
          records={vm.history.data ?? []}
          loading={vm.history.isLoading}
          failed={vm.history.isError}
          retry={() => void vm.history.refetch()}
          onOpen={vm.open}
        />
      </section>
      <section className={CARD} aria-labelledby="push-metrics-heading">
        <h2 id="push-metrics-heading" className="mb-4 text-sm font-semibold text-gray-900">{t('admin.notifications.metrics.heading')}</h2>
        {push.metrics.isError ? <AdminQueryError retry={() => void push.metrics.refetch()} /> : (
          <PushMetricsTable
            metrics={push.metrics.data}
            days={push.days}
            loading={push.metrics.isFetching}
            typeLabel={push.typeLabel}
            onDaysChange={push.setDays}
          />
        )}
      </section>
      <section className={CARD} aria-labelledby="push-engagement-heading">
        <h2 id="push-engagement-heading" className="mb-4 text-sm font-semibold text-gray-900">{t('admin.notifications.engagement.heading')}</h2>
        {push.engagement.isError ? <AdminQueryError retry={() => void push.engagement.refetch()} /> : (
          <PushEngagementTable
            engagement={push.engagement.data}
            days={push.engagementDays}
            loading={push.engagement.isFetching}
            typeLabel={push.typeLabel}
            onDaysChange={push.setEngagementDays}
          />
        )}
      </section>

      {vm.selected && (
        <AnnouncementDetailDialog
          record={vm.selected}
          loading={vm.detail.loading}
          failed={vm.detail.failed}
          notFound={vm.detail.notFound}
          onRetry={vm.retryDetail}
          onClose={vm.close}
        />
      )}
    </div>
  )
}

function SettingsTab({ push: vm }: { push: PushControls }) {
  const { t } = vm
  return (
    <div className="max-w-3xl">
      <section className={CARD}>
        <h2 className="mb-1 text-sm font-semibold text-gray-900">{t('admin.notifications.push.heading')}</h2>
        <p className="mb-4 text-xs text-gray-500">{t('admin.notifications.push.help')}</p>
        {vm.settings.isError ? <AdminQueryError retry={() => void vm.settings.refetch()} />
          : !vm.settings.data ? <div className="p-8 text-center"><Spinner /></div>
            : (
              <PushTypeSwitches
                settings={vm.settings.data}
                sending={vm.sending}
                switching={vm.switching}
                typeLabel={vm.typeLabel}
                onToggle={vm.toggle}
              />
            )}
      </section>

      {vm.pendingOff && (
        <AdminFormDialog open onClose={vm.cancelOff} labelledBy="push-off-title" panelClassName="space-y-4 p-6">
          <h3 id="push-off-title" className="text-center font-semibold text-gray-900">
            {t('admin.notifications.push.confirmOffTitle', { type: vm.typeLabel(vm.pendingOff.type) })}
          </h3>
          <p className="text-center text-sm text-gray-600">{t('admin.notifications.push.confirmOffMessage')}</p>
          <div className="flex justify-center gap-3 pt-2">
            <button type="button" onClick={vm.cancelOff} className="min-h-11 rounded-xl px-4 text-sm font-medium text-gray-600 hover:bg-gray-100">{t('common.cancel')}</button>
            <button type="button" onClick={() => void vm.confirmOff()} disabled={vm.switching !== null} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
              {vm.switching !== null && <Spinner size="sm" />}
              {t('admin.notifications.push.confirmOff')}
            </button>
          </div>
        </AdminFormDialog>
      )}
    </div>
  )
}

export function AdminNotificationsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('compose')
  // One instance for both tabs that show push data, so a switch changed on one never disagrees with the other.
  const push = usePushControlsViewModel()
  return (
    <div className="space-y-6">
      <AdminBackLink />
      <AdminPageHeader
        title={t('admin.notifications.title')}
        subtitle={t('admin.notifications.subtitle')}
      />
      <div role="tablist" aria-label={t('admin.notifications.title')} className="inline-flex max-w-full overflow-x-auto rounded-xl bg-gray-100 p-1">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`admin-notifications-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`admin-notifications-panel-${key}`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
              const next: Tab = TABS[(TABS.indexOf(key) + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length] ?? key
              setTab(next)
              document.getElementById(`admin-notifications-tab-${next}`)?.focus()
            }}
            className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {t(`admin.notifications.tabs.${key}`)}
          </button>
        ))}
      </div>
      {/* Every panel stays mounted so switching tabs never discards the announcement draft. */}
      <div role="tabpanel" id="admin-notifications-panel-compose" aria-labelledby="admin-notifications-tab-compose" hidden={tab !== 'compose'}>
        <ComposeTab />
      </div>
      <div role="tabpanel" id="admin-notifications-panel-history" aria-labelledby="admin-notifications-tab-history" hidden={tab !== 'history'}>
        <HistoryTab push={push} />
      </div>
      <div role="tabpanel" id="admin-notifications-panel-settings" aria-labelledby="admin-notifications-tab-settings" hidden={tab !== 'settings'}>
        <SettingsTab push={push} />
      </div>
    </div>
  )
}

export default AdminNotificationsPage
