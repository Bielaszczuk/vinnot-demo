import { Users } from 'lucide-react'
import { EmptyState } from '@components/ui/EmptyState'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { PageLoader } from '@components/ui/PageLoader'
import { Pagination } from '@components/ui/Pagination'
import { SocialReviewCard } from '@components/features/social/SocialReviewCard'
import { useFollowingFeedViewModel } from './useFollowingFeedViewModel'

/** FollowingFeedPage — /feed, opened from «Ver todo» in the Home section. */
export function FollowingFeedPage() {
  const vm = useFollowingFeedViewModel()
  const { t, feed } = vm

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('social.feedTitle')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('social.feedSubtitle')}</p>
      </header>
      {vm.isLoading ? (
        <PageLoader compact />
      ) : vm.isError ? (
        <p className="text-sm text-gray-500">{t('social.loadError')}</p>
      ) : !feed || feed.items.length === 0 ? (
        <EmptyState
          illustration="community"
          title={t('social.feedEmpty')}
          description={t('social.feedEmptyHint')}
          action={
            <LinkButton to="/#people-to-follow" variant="secondary" leftIcon={<Icon icon={Users} size="sm" />}>
              {t('social.suggestionsTitle')}
            </LinkButton>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {feed.items.map((review) => (
              <SocialReviewCard key={review.id} review={review} formatDate={vm.formatDate} />
            ))}
          </div>
          <Pagination page={vm.page} totalPages={feed.totalPages} onPageChange={vm.setPage} />
        </>
      )}
    </div>
  )
}
