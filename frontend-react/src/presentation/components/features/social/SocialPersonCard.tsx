import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { SuggestedUser } from '@domain/social/social.types'
import { UserBadge } from '../points/UserBadge'
import { FollowButton } from './FollowButton'
import { SocialAvatar } from './SocialAvatar'

interface SocialPersonCardProps {
  person: SuggestedUser
  pending: boolean
  onToggleFollow: (person: SuggestedUser) => void
}

/** A suggested person: photo, name and seal open the profile; affinity and reviews below; a follow button. */
export function SocialPersonCard({ person, pending, onToggleFollow }: SocialPersonCardProps) {
  const { t } = useTranslation()
  return (
    <li className="flex w-40 flex-col items-center rounded-2xl border border-border bg-white p-4 text-center shadow-sm transition-shadow duration-300 hover:shadow-lg motion-reduce:transition-none sm:w-44">
      <Link to={`/users/${person.id}`} className="flex w-full flex-col items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500">
        <SocialAvatar src={person.avatarUrl} sizeClassName="h-16 w-16" className="ring-4 ring-wine-50" />
        <span className="mt-3 flex max-w-full items-center justify-center gap-1">
          <span className="truncate text-sm font-semibold text-ink">{person.displayName}</span>
          <UserBadge tier={person.tier} size={18} />
        </span>
        <span className="block max-w-full truncate text-xs text-gray-500">@{person.username}</span>
      </Link>
      <span className="mt-2 flex flex-wrap justify-center gap-1">
        {person.affinityPercent != null && (
          <span className="rounded-full bg-wine-50 px-2 py-0.5 text-2xs font-semibold text-wine-700">
            {t('social.affinityShort', { percent: person.affinityPercent })}
          </span>
        )}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-2xs font-medium text-gray-600">
          {t('social.reviewsCount', { count: person.reviewsCount })}
        </span>
      </span>
      <FollowButton
        following={person.following}
        name={person.displayName}
        pending={pending}
        onToggle={() => onToggleFollow(person)}
        className="mt-3 w-full min-w-0"
      />
    </li>
  )
}
