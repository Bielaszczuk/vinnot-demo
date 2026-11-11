import { ArrowRight, UsersRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { PageLoader } from '@components/ui/PageLoader'
import { SocialPersonCard } from '@components/features/social/SocialPersonCard'
import { SocialReviewTile } from '@components/features/social/SocialReviewTile'
import { useHomeSocialViewModel } from './useHomeSocialViewModel'

/**
 * HomeSocialSections — the signed-in Home closes with «De gente que seguís» (the latest reviews,
 * with «Ver todo» opening /feed) and «Personas para seguir» (suggestions with a follow button).
 */
export function HomeSocialSections() {
  const vm = useHomeSocialViewModel()
  const { t } = vm

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 sm:space-y-16 sm:px-6 lg:px-8">
      <HomeSection title={t('social.homeFeedTitle')} subtitle={t('social.homeFeedSubtitle')}>
        {vm.feedLoading ? (
          <PageLoader compact />
        ) : vm.feedError ? (
          <p className="text-center text-sm text-gray-500">{t('social.loadError')}</p>
        ) : vm.feed.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-border bg-white px-6 py-8 text-center shadow-sm">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-wine-50">
              <Icon icon={UsersRound} size="lg" className="text-wine-700" />
            </span>
            <p className="font-semibold text-gray-900">{t('social.feedEmpty')}</p>
            <p className="mt-1 text-sm text-gray-500">{t('social.feedEmptyHint')}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
              {vm.feed.map((review) => (
                <SocialReviewTile key={review.id} review={review} formatDate={vm.formatDate} />
              ))}
            </div>
            {vm.hasMoreFeed && (
              <div className="mt-6 flex justify-center">
                <LinkButton to="/feed" variant="outline" size="sm" rightIcon={<Icon icon={ArrowRight} size="sm" />}>
                  {t('social.seeAll')}
                </LinkButton>
              </div>
            )}
          </>
        )}
      </HomeSection>

      <HomeSection id="people-to-follow" title={t('social.suggestionsTitle')} subtitle={t('social.suggestionsSubtitle')}>
        {vm.suggestionsLoading ? (
          <PageLoader compact />
        ) : vm.suggestionsError ? (
          <p className="text-center text-sm text-gray-500">{t('social.loadError')}</p>
        ) : vm.suggestions.length === 0 ? (
          <p className="mx-auto max-w-md text-center text-sm text-gray-500">{t('social.suggestionsEmpty')}</p>
        ) : (
          <ul className="flex flex-wrap justify-center gap-3 sm:gap-5">
            {vm.suggestions.filter((person) => person.id !== vm.viewerId).map((person) => (
              <SocialPersonCard key={person.id} person={person} pending={vm.isPending(person.id)} onToggleFollow={vm.toggleFollow} />
            ))}
          </ul>
        )}
      </HomeSection>
    </div>
  )
}

/** The same centred heading as the other Home sections. */
function HomeSection({ id, title, subtitle, children }: { id?: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-8 text-center sm:mb-10">
        <h2 className="mb-2 text-xl font-semibold text-ink sm:mb-3 sm:text-2xl md:text-3xl">{title}</h2>
        <p className="mx-auto max-w-xl text-xs leading-relaxed text-gray-500 sm:text-sm">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}
