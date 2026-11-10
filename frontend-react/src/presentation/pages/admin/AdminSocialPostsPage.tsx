/**
 * AdminSocialPostsPage — the social media approval queue (#489), with the publications of each post, the content
 * pillar switches and the network connections (#510), and the reschedule and publish now of a post (#513). ADMIN only.
 *
 * Architecture: page → view-model hooks → query hooks → service → client → http
 */
import { AdminBackLink } from '@components/features/admin/AdminBackLink'
import { AdminPageHeader } from '@components/features/admin/AdminPageHeader'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import { Button } from '@components/ui/Button'
import { Spinner } from '@components/ui/Spinner'
import { ContentPillarsPanel } from '@components/features/admin/social-posts/ContentPillarsPanel'
import { SocialAccountsPanel, SocialConnectionNotice } from '@components/features/admin/social-posts/SocialAccountsPanel'
import { SocialPostDetail } from '@components/features/admin/social-posts/SocialPostDetail'
import { SocialPostEditForm } from '@components/features/admin/social-posts/SocialPostEditForm'
import { SocialPostQueue } from '@components/features/admin/social-posts/SocialPostQueue'
import { SocialPostSchedule } from '@components/features/admin/social-posts/SocialPostSchedule'
import { WineDayList } from '@components/features/admin/social-posts/WineDayList'
import { useContentPillarsPanel } from '@components/features/admin/social-posts/useContentPillarsPanel'
import { useSocialAccountsPanel } from '@components/features/admin/social-posts/useSocialAccountsPanel'
import { useSocialPostSchedule } from '@components/features/admin/social-posts/useSocialPostSchedule'
import { useSocialPublicationRetry } from '@components/features/admin/social-posts/useSocialPublicationRetry'
import { SOCIAL_POST_STATUSES } from '@domain/admin/socialPost'
import { useAdminSocialPostsViewModel } from './useAdminSocialPostsViewModel'

const CARD = 'rounded-xl border border-gray-200/60 bg-white shadow-sm'

export function AdminSocialPostsPage() {
  const vm = useAdminSocialPostsViewModel()
  const publications = useSocialPublicationRetry(vm.selectedId)
  const schedule = useSocialPostSchedule(vm.post)
  const pillars = useContentPillarsPanel()
  const accounts = useSocialAccountsPanel()
  const { t } = vm
  return (
    <div className="space-y-6">
      <AdminBackLink />
      <AdminPageHeader
        title={t('admin.socialPosts.title')}
        subtitle={t('admin.socialPosts.subtitle')}
        actions={(
          <Button variant="onDark" isLoading={vm.isPlanning} onClick={() => void vm.planNow()}>
            {t('admin.socialPosts.planNow')}
          </Button>
        )}
      />
      <SocialConnectionNotice notice={accounts.notice} onDismiss={accounts.dismissNotice} />
      {vm.lastPlan && (
        <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {t('admin.socialPosts.planned', { count: vm.lastPlan.created, from: vm.lastPlan.from, to: vm.lastPlan.to })}
          {vm.awaitingCopy && <> {t('admin.socialPosts.writingCopy')}</>}
        </p>
      )}

      <div role="tablist" aria-label={t('admin.common.status')} className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
        {SOCIAL_POST_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={vm.status === status}
            onClick={() => vm.setStatus(status)}
            className={`min-h-9 rounded-lg px-3 text-sm font-medium transition-colors ${vm.status === status ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {t(`admin.socialPosts.status.${status}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,18rem)]">
        <section className={`${CARD} overflow-hidden`} aria-label={t('admin.socialPosts.queue.heading')}>
          <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">{t('admin.socialPosts.queue.heading')}</h2>
          <SocialPostQueue
            posts={vm.posts}
            selectedId={vm.selectedId}
            loading={vm.isLoading}
            failed={vm.isError}
            page={vm.page}
            totalPages={vm.totalPages}
            totalItems={vm.totalItems}
            formatDate={vm.formatDate}
            onSelect={vm.selectPost}
            onPageChange={vm.setPage}
            onRetry={vm.refetch}
          />
        </section>

        <section className={`${CARD} p-5`} aria-live="polite">
          {!vm.selectedId ? (
            <p className="p-8 text-center text-sm text-gray-500">{t('admin.socialPosts.detail.empty')}</p>
          ) : vm.isDetailError ? (
            <AdminQueryError retry={vm.refetchDetail} />
          ) : vm.isDetailLoading || !vm.post ? (
            <div className="p-12 text-center"><Spinner /></div>
          ) : vm.editing ? (
            <SocialPostEditForm
              draft={vm.draft}
              language={vm.contentLanguage}
              errors={vm.draftErrors}
              saving={vm.working}
              onChange={vm.updateDraft}
              onSlideChange={vm.updateSlide}
              onAddSlide={vm.addSlide}
              onRemoveSlide={vm.removeSlide}
              onSave={vm.saveEdit}
              onCancel={vm.cancelEdit}
            />
          ) : (
            <SocialPostDetail
              post={vm.post}
              language={vm.contentLanguage}
              actions={vm.actions}
              working={vm.working || schedule.busy}
              canRequestIllustration={vm.canRequestIllustration}
              rejecting={vm.rejecting}
              reason={vm.reason}
              formatDate={vm.formatDate}
              formatNumber={publications.formatNumber}
              retryingNetwork={publications.retryingNetwork}
              onApprove={vm.approve}
              onStartReject={vm.startReject}
              onReasonChange={vm.setReason}
              onConfirmReject={vm.confirmReject}
              onCancelReject={vm.cancelReject}
              onEdit={vm.startEdit}
              onRegenerate={vm.regenerate}
              onNewIllustration={vm.newIllustration}
              onLanguageChange={vm.setContentLanguage}
              onRetryPublication={publications.retry}
              schedule={<SocialPostSchedule post={vm.post} working={vm.working} {...schedule} />}
            />
          )}
        </section>

        <aside className={`${CARD} h-fit overflow-hidden`} aria-label={t('admin.socialPosts.wineDays.heading')}>
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">{t('admin.socialPosts.wineDays.heading')}</h2>
            <p className="text-xs text-gray-500">{t('admin.socialPosts.wineDays.help')}</p>
          </div>
          <WineDayList
            days={vm.wineDays}
            loading={vm.wineDaysLoading}
            failed={vm.wineDaysError}
            formatDay={vm.formatDay}
            onRetry={vm.refetchWineDays}
          />
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className={`${CARD} h-fit overflow-hidden`} aria-labelledby="social-pillars-heading">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 id="social-pillars-heading" className="text-sm font-semibold text-gray-900">{t('admin.socialPosts.pillars.heading')}</h2>
            <p className="text-xs text-gray-500">{t('admin.socialPosts.pillars.help')}</p>
          </div>
          <ContentPillarsPanel
            pillars={pillars.pillars}
            loading={pillars.loading}
            failed={pillars.failed}
            switching={pillars.switching}
            formatNumber={pillars.formatNumber}
            onRetry={pillars.refetch}
            onToggleActive={pillars.toggleActive}
            onToggleAutoApprove={pillars.toggleAutoApprove}
          />
        </section>

        <section className={`${CARD} h-fit overflow-hidden`} aria-labelledby="social-accounts-heading">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 id="social-accounts-heading" className="text-sm font-semibold text-gray-900">{t('admin.socialPosts.accounts.heading')}</h2>
            <p className="text-xs text-gray-500">{t('admin.socialPosts.accounts.help')}</p>
          </div>
          <SocialAccountsPanel
            accounts={accounts.accounts}
            loading={accounts.loading}
            failed={accounts.failed}
            busy={accounts.busy}
            formatDate={vm.formatDate}
            onRetry={accounts.refetch}
            onConnect={accounts.connect}
            onDisconnect={accounts.disconnect}
          />
        </section>
      </div>
    </div>
  )
}

export default AdminSocialPostsPage
