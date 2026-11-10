/**
 * The post on each network once publishing starts (#510): state, public link, date, attempts, last error, the figures
 * the network reported, and a retry for a network that failed. A TikTok draft has no link: it waits in the inbox.
 */
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import {
  canRetryPublication,
  isKnownPublishingError,
  reportedMetrics,
  type PublicationStatus,
  type SocialNetwork,
  type SocialPostPublishing,
  type SocialPublication,
} from '@domain/admin/socialPost'

interface SocialPostPublicationsProps {
  publications: SocialPublication[]
  publishing: SocialPostPublishing | null
  retrying: SocialNetwork | null
  formatDate: (iso: string) => string
  formatNumber: (value: number) => string
  onRetry: (network: SocialNetwork) => unknown
}

const STATUS_STYLES: Record<PublicationStatus, string> = {
  QUEUED: 'bg-gray-100 text-gray-700',
  PUBLISHING: 'bg-sky-100 text-sky-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  DRAFT_SENT: 'bg-amber-100 text-amber-800',
  FAILED: 'bg-red-100 text-red-800',
}

const CHIP = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'

export function SocialPostPublications({ publications, publishing, retrying, formatDate, formatNumber, onRetry }: SocialPostPublicationsProps) {
  const { t } = useTranslation()
  const errorReason = (code: string) =>
    isKnownPublishingError(code)
      ? t(`admin.socialPosts.publications.errors.${code}`)
      : t('admin.socialPosts.publications.errors.OTHER', { code })
  if (!publishing && publications.length === 0) return null
  return (
    <section aria-labelledby="social-post-publications" className="space-y-3 rounded-xl border border-gray-100 p-4 text-sm">
      <h3 id="social-post-publications" className="font-semibold text-gray-900">{t('admin.socialPosts.publications.heading')}</h3>
      {publishing && (publishing.startedAt || publishing.finishedAt) && (
        <p className="flex flex-wrap gap-x-3 text-gray-600">
          {publishing.startedAt && <span>{t('admin.socialPosts.publications.started', { date: formatDate(publishing.startedAt) })}</span>}
          {publishing.finishedAt && <span>{t('admin.socialPosts.publications.finished', { date: formatDate(publishing.finishedAt) })}</span>}
        </p>
      )}
      {publishing?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
          {t('admin.socialPosts.publications.publishingError', { reason: errorReason(publishing.error) })}
        </p>
      )}
      {publications.length > 0 && (
        <ul aria-label={t('admin.socialPosts.publications.heading')} className="divide-y divide-gray-100">
          {publications.map((publication) => {
            const network = t(`admin.socialPosts.networks.${publication.network}`)
            const metrics = reportedMetrics(publication.metrics)
            return (
              <li key={publication.network} className="space-y-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">{network}</span>
                  <span className={`${CHIP} ${STATUS_STYLES[publication.status]}`}>{t(`admin.socialPosts.publications.status.${publication.status}`)}</span>
                  {publication.permalink && (
                    <a href={publication.permalink} target="_blank" rel="noopener noreferrer" className="text-wine-700 underline underline-offset-4 hover:text-wine-800">
                      {t('admin.socialPosts.publications.open', { network })}
                    </a>
                  )}
                  {canRetryPublication(publication) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      disabled={retrying !== null}
                      isLoading={retrying === publication.network}
                      aria-label={t('admin.socialPosts.publications.retry', { network })}
                      onClick={() => void onRetry(publication.network)}
                    >
                      {t('admin.socialPosts.publications.retryShort')}
                    </Button>
                  )}
                </div>
                <p className="flex flex-wrap gap-x-3 text-xs text-gray-600">
                  {publication.publishedAt && <span>{t('admin.socialPosts.publications.publishedAt', { date: formatDate(publication.publishedAt) })}</span>}
                  <span>{t('admin.socialPosts.publications.attempts', { count: publication.attempts })}</span>
                </p>
                {publication.status === 'DRAFT_SENT' && <p className="text-xs text-amber-800">{t('admin.socialPosts.publications.draftHint')}</p>}
                {publication.error && <p className="text-xs text-red-700">{t('admin.socialPosts.publications.error', { reason: errorReason(publication.error) })}</p>}
                {metrics.length > 0 ? (
                  <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {metrics.map(({ metric, value }) => (
                      <div key={metric} className="flex gap-1">
                        <dt className="text-gray-500">{t(`admin.socialPosts.publications.metrics.${metric}`)}</dt>
                        <dd className="font-medium text-gray-900">{formatNumber(value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-xs text-gray-500">{t('admin.socialPosts.publications.noMetrics')}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
