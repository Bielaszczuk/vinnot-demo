import { ClipboardList, Lock, PenLine } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@components/ui/EmptyState'
import { Icon } from '@components/ui/Icon'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { LinkButton } from '@components/ui/LinkButton'
import { PageLoader } from '@components/ui/PageLoader'
import { Pagination } from '@components/ui/Pagination'
import { VintagePill } from '@components/ui/VintagePill'
import { GlassRating } from '@components/ui/rating/GlassRating'
import { UserBadge } from '@components/features/points/UserBadge'
import { FollowButton } from '@components/features/social/FollowButton'
import { SocialAvatar } from '@components/features/social/SocialAvatar'
import { SocialReviewCard } from '@components/features/social/SocialReviewCard'
import { TasteProfileCard } from '@components/features/social/TasteProfileCard'
import { usePublicProfileViewModel, type PublicProfileViewModel } from './usePublicProfileViewModel'

/**
 * PublicProfilePage — /users/:id
 *
 * Avatar, name, bio, seal, counters, follow (or edit on the own profile), affinity,
 * the illustrated taste profile (with the taste quiz entry and the adjustable structure on the own profile) and the Reviews and Cellar
 * sections. Behavior lives in the view model.
 */
export function PublicProfilePage() {
  const vm = usePublicProfileViewModel()
  const { t, profile } = vm

  if (vm.isLoading) return <PageLoader />
  if (vm.isError || !profile) {
    return <EmptyState illustration="notFound" title={t('social.notFound')} description={t('social.notFoundHint')} />
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ProfileHeader vm={vm} />
      <TasteProfileCard
        wheel={profile.tasteWheel}
        traits={profile.tasteTraits}
        isOwn={vm.isOwn}
        editor={vm.structureEditor}
        action={vm.tasteQuizEntry && (
          <LinkButton to={vm.tasteQuizEntry.to} variant="secondary" size="sm" leftIcon={<Icon icon={ClipboardList} size="sm" />}>
            {t(vm.tasteQuizEntry.kind === 'retake' ? 'tasteQuiz.retake' : 'tasteQuiz.take')}
          </LinkButton>
        )}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ReviewsSection vm={vm} />
        <CellarSection vm={vm} />
      </div>
    </div>
  )
}

function ProfileHeader({ vm }: { vm: PublicProfileViewModel }) {
  const { t, profile } = vm
  if (!profile) return null
  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-wine-950 to-wine-900 px-6 py-8 shadow-lg shadow-wine-950/10 ring-1 ring-white/5 sm:px-10">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <SocialAvatar src={profile.avatar} sizeClassName="h-24 w-24" className="border-4 border-white/30 bg-white/10" />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{profile.displayName}</h1>
            <UserBadge tier={profile.tier} size={40} mode="loop" />
          </div>
          <p className="mt-1 text-wine-200">@{profile.username}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {profile.followsYou && !vm.isOwn && (
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90">{t('social.followsYou')}</span>
            )}
            {profile.affinityPercent != null && !vm.isOwn && (
              <span className="rounded-full bg-rating/20 px-2.5 py-1 text-xs font-semibold text-[#f3d38a]" title={t('social.affinityHint')}>
                {t('social.affinity', { percent: profile.affinityPercent })}
              </span>
            )}
          </div>
          {profile.bio && <p className="mt-3 max-w-xl whitespace-pre-line text-sm leading-relaxed text-white/85">{profile.bio}</p>}
          <dl className="mt-5 grid max-w-xl grid-cols-4 gap-2">
            <Counter label={t('social.counters.followers')} value={profile.followersCount} to={`/users/${profile.id}/followers`} />
            <Counter label={t('social.counters.following')} value={profile.followingCount} to={`/users/${profile.id}/following`} />
            <Counter label={t('social.counters.reviews')} value={profile.reviewsCount} />
            <Counter
              label={t('social.counters.cellar')}
              value={profile.cellarCount ?? '—'}
              title={profile.cellarCount == null ? t('social.cellarCountHidden') : undefined}
            />
          </dl>
        </div>
        <div className="shrink-0">
          {vm.isOwn ? (
            <LinkButton to="/profile" variant="onDark" size="sm" leftIcon={<Icon icon={PenLine} size="sm" />} className="min-w-[7.5rem] justify-center">
              {t('social.editProfile')}
            </LinkButton>
          ) : (
            <FollowButton following={profile.following} name={profile.displayName} pending={vm.followPending} onToggle={vm.toggleFollow} />
          )}
        </div>
      </div>
    </section>
  )
}

function Counter({ label, value, to, title }: { label: string; value: number | string; to?: string; title?: string }) {
  const content: ReactNode = (
    <>
      <dd className="text-xl font-semibold tabular-nums text-white">{value}</dd>
      <dt className="text-[11px] leading-tight text-wine-200/80">{label}</dt>
    </>
  )
  const box = 'flex flex-col-reverse items-center rounded-xl px-1 py-1.5 text-center sm:items-start sm:text-left'
  return to ? (
    <Link to={to} className={`${box} transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}>
      {content}
    </Link>
  ) : (
    <div className={box} title={title}>{content}</div>
  )
}

function ReviewsSection({ vm }: { vm: PublicProfileViewModel }) {
  const { t, reviews } = vm
  return (
    <section aria-labelledby="profile-reviews" className="space-y-3">
      <h2 id="profile-reviews" className="text-lg font-semibold text-gray-900">{t('social.reviewsTitle')}</h2>
      {vm.reviewsLoading ? (
        <PageLoader compact />
      ) : vm.reviewsError ? (
        <p className="text-sm text-gray-500">{t('social.loadError')}</p>
      ) : !reviews || reviews.items.length === 0 ? (
        <EmptyState illustration="noReviews" title={t('social.reviewsEmpty')} className="py-6" />
      ) : (
        <>
          <div className="space-y-3">
            {reviews.items.map((review) => (
              <SocialReviewCard key={review.id} review={review} formatDate={vm.formatDate} showReviewer={false} />
            ))}
          </div>
          <Pagination page={vm.reviewsPage} totalPages={reviews.totalPages} onPageChange={vm.setReviewsPage} label={t('social.reviewsTitle')} />
        </>
      )}
    </section>
  )
}

function CellarSection({ vm }: { vm: PublicProfileViewModel }) {
  const { t, cellar } = vm
  return (
    <section aria-labelledby="profile-cellar" className="space-y-3">
      <h2 id="profile-cellar" className="text-lg font-semibold text-gray-900">{t('social.cellarTitle')}</h2>
      {vm.cellarLocked ? (
        <EmptyState icon={<Icon icon={Lock} size="lg" className="text-wine-700" />} title={t('social.cellarLocked')} description={t('social.cellarLockedHint')} className="rounded-2xl border border-border bg-white py-8" />
      ) : vm.cellarLoading ? (
        <PageLoader compact />
      ) : vm.cellarError ? (
        <p className="text-sm text-gray-500">{t('social.loadError')}</p>
      ) : !cellar || cellar.items.length === 0 ? (
        <EmptyState illustration="emptyCellar" title={t('social.cellarEmpty')} className="py-6" />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {cellar.items.map((entry) => (
              <li key={entry.id} className="flex gap-3 rounded-2xl border border-border bg-white p-3">
                <ImageWithFallback src={entry.wine.imageUrl ?? undefined} alt="" className="h-16 w-12 shrink-0 rounded-lg object-contain" />
                <div className="min-w-0">
                  <Link to={`/wines/${entry.wine.id}`} className="block truncate text-sm font-semibold text-gray-900 hover:text-wine-700">{entry.wine.name}</Link>
                  {entry.wine.wineryName && <p className="truncate text-xs text-gray-500">{entry.wine.wineryName}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {entry.vintage != null && <VintagePill year={entry.vintage} />}
                    {entry.rating != null && <GlassRating value={entry.rating} wineType={entry.wine.type} size={18} />}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">{t('social.cellarAdded', { date: vm.formatDate(entry.addedAt) })}</p>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={vm.cellarPage} totalPages={cellar.totalPages} onPageChange={vm.setCellarPage} label={t('social.cellarTitle')} />
        </>
      )}
    </section>
  )
}
