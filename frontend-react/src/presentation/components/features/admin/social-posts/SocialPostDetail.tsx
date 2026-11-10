/**
 * The selected post (#489): rendered slides with the new illustration action (#492), caption with its legal line,
 * hashtags, alt text, CTA, generation and review details, and the review actions the post accepts. The copy and the
 * slides are those of the selected content language (#497); a language still without copy is shown as pending. Once
 * publishing starts, the publication on each network with its retry; a post the system approved says so (#510). The
 * schedule panel (network times, reschedule, publish now; #513) goes under the header.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import {
  captionHasLegalLine,
  hasAnyCopy,
  type SocialLanguage,
  type SocialNetwork,
  type SocialPost,
  type SocialPostAction,
} from '@domain/admin/socialPost'
import { FactCheckBadge, MockBadge, PillarChip, StatusBadge, WineDayChip } from './SocialPostChips'
import { SlideGallery } from './SlideGallery'
import { SocialPostPublications } from './SocialPostPublications'

interface SocialPostDetailProps {
  post: SocialPost
  language: SocialLanguage
  actions: SocialPostAction[]
  working: boolean
  canRequestIllustration: boolean
  rejecting: boolean
  reason: string
  formatDate: (iso: string) => string
  formatNumber: (value: number) => string
  /** Network whose failed publication is being queued again. */
  retryingNetwork: SocialNetwork | null
  onApprove: () => unknown
  onStartReject: () => unknown
  onReasonChange: (reason: string) => void
  onConfirmReject: () => unknown
  onCancelReject: () => unknown
  onEdit: () => unknown
  onRegenerate: () => unknown
  onNewIllustration: () => unknown
  onLanguageChange: (language: SocialLanguage) => void
  onRetryPublication: (network: SocialNetwork) => unknown
  /** When the post goes out and the actions that change it (#513). */
  schedule?: ReactNode
}

const FIELD = 'rounded-lg border border-gray-200 px-3 py-2 text-sm'

export function SocialPostDetail({
  post, language, actions, working, canRequestIllustration, rejecting, reason, formatDate, formatNumber, retryingNetwork,
  onApprove, onStartReject, onReasonChange, onConfirmReject, onCancelReject, onEdit, onRegenerate, onNewIllustration,
  onLanguageChange, onRetryPublication, schedule,
}: SocialPostDetailProps) {
  const { t } = useTranslation()
  const { generation, review } = post
  const copy = post.copies[language]
  const can = (action: SocialPostAction) => actions.includes(action)
  // A pending language offers Regenerate inside its notice, so the action bar does not repeat it.
  const languagePending = copy === null && hasAnyCopy(post)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={post.status} />
        {post.pillar && <PillarChip pillar={post.pillar} />}
        {post.wineDay && <WineDayChip wineDay={post.wineDay} />}
        {generation.mock && <MockBadge />}
        <span className="ml-auto text-sm text-gray-600">{t('admin.socialPosts.detail.scheduledFor', { date: formatDate(post.scheduledFor) })}</span>
      </div>

      {schedule}

      {hasAnyCopy(post) ? (
        <>
          <SlideGallery
            key={post.id}
            postId={post.id}
            language={language}
            copy={copy}
            media={post.media}
            canRequestIllustration={canRequestIllustration}
            canRegenerate={can('regenerate')}
            working={working}
            onLanguageChange={onLanguageChange}
            onNewIllustration={onNewIllustration}
            onRegenerate={onRegenerate}
          />
          {copy && <dl className="grid gap-4 text-sm md:grid-cols-2">
            <div className="md:col-span-2">
              <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">{t('admin.socialPosts.detail.caption')}</dt>
              <dd className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-gray-800">{copy.caption}</dd>
              <dd className={`mt-1 text-xs ${captionHasLegalLine(copy.caption, language) ? 'text-green-700' : 'text-red-700'}`}>
                {t(captionHasLegalLine(copy.caption, language) ? 'admin.socialPosts.detail.legalLine' : 'admin.socialPosts.detail.legalMissing')}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">{t('admin.socialPosts.detail.hashtags')}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {copy.hashtags.map((tag) => <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{tag}</span>)}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">{t('admin.socialPosts.detail.cta')}</dt>
              <dd className="text-gray-800">{copy.cta}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">{t('admin.socialPosts.detail.altText')}</dt>
              <dd className="text-gray-800">{copy.altText}</dd>
            </div>
          </dl>}
        </>
      ) : (
        <p role="status" className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">{t('admin.socialPosts.detail.noCopy')}</p>
      )}

      <section aria-labelledby="social-post-generation" className="space-y-2 rounded-xl border border-gray-100 p-4 text-sm">
        <h3 id="social-post-generation" className="font-semibold text-gray-900">{t('admin.socialPosts.generation.heading')}</h3>
        <p className="text-gray-600">
          {t('admin.socialPosts.generation.model')}: {generation.model ?? '—'} · {t('admin.socialPosts.generation.provider')}: {generation.provider ?? '—'} · {t('admin.socialPosts.generation.attempts')}: {generation.attempts}
        </p>
        <p className="text-gray-600">
          {generation.generatedAt ? t('admin.socialPosts.generation.generatedAt', { date: formatDate(generation.generatedAt) }) : t('admin.socialPosts.generation.notGenerated')}
        </p>
        <FactCheckBadge factCheck={generation.factCheck} issues={generation.issues} />
        {generation.error && <p role="alert" className="text-red-700">{t('admin.socialPosts.generation.error')}: {generation.error}</p>}
      </section>

      <SocialPostPublications
        publications={post.publications}
        publishing={post.publishing}
        retrying={retryingNetwork}
        formatDate={formatDate}
        formatNumber={formatNumber}
        onRetry={onRetryPublication}
      />

      {review && (review.automatic || review.reviewedBy || review.editedBy || review.reason) && (
        <section aria-labelledby="social-post-review" className="space-y-1 rounded-xl border border-gray-100 p-4 text-sm text-gray-600">
          <h3 id="social-post-review" className="font-semibold text-gray-900">{t('admin.socialPosts.review.heading')}</h3>
          {review.automatic
            ? <p>{t('admin.socialPosts.review.automatic', { date: review.reviewedAt ? formatDate(review.reviewedAt) : '—' })}</p>
            : review.reviewedBy && <p>{t('admin.socialPosts.review.reviewedBy', { by: review.reviewedBy, date: review.reviewedAt ? formatDate(review.reviewedAt) : '—' })}</p>}
          {review.editedBy && <p>{t('admin.socialPosts.review.editedBy', { by: review.editedBy })}</p>}
          {review.reason && !review.automatic && <p>{t('admin.socialPosts.review.reason', { reason: review.reason })}</p>}
        </section>
      )}

      {actions.length > 0 && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <div className="flex flex-wrap justify-end gap-2">
            {can('regenerate') && !languagePending && <Button variant="outline" disabled={working} onClick={() => void onRegenerate()}>{t('admin.socialPosts.actions.regenerate')}</Button>}
            {can('edit') && <Button variant="outline" disabled={working} onClick={() => void onEdit()}>{t('admin.socialPosts.actions.edit')}</Button>}
            {can('reject') && !rejecting && <Button variant="danger" disabled={working} onClick={() => void onStartReject()}>{t('admin.socialPosts.actions.reject')}</Button>}
            {can('approve') && <Button disabled={working} onClick={() => void onApprove()}>{t('admin.socialPosts.actions.approve')}</Button>}
          </div>
          {post.status === 'APPROVED' && can('regenerate') && (
            <p className="text-right text-sm text-gray-600">{t('admin.socialPosts.actions.regenerateApprovedHint')}</p>
          )}
          {rejecting && (
            <div className="space-y-2 rounded-xl bg-red-50 p-4">
              <label htmlFor="social-post-reject-reason" className="block text-sm font-medium text-gray-900">{t('admin.socialPosts.actions.rejectReason')}</label>
              <textarea
                id="social-post-reject-reason"
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                placeholder={t('admin.socialPosts.actions.rejectReasonPlaceholder')}
                rows={2}
                className={`${FIELD} w-full bg-white`}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" disabled={working} onClick={() => void onCancelReject()}>{t('common.cancel')}</Button>
                <Button variant="danger" disabled={working} onClick={() => void onConfirmReject()}>{t('admin.socialPosts.actions.confirmReject')}</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
