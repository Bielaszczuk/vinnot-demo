import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { SocialUser } from '@domain/social/social.types'
import { UserBadge } from '../points/UserBadge'
import { FollowButton } from './FollowButton'
import { SocialAvatar } from './SocialAvatar'

interface SocialUserRowProps {
  user: SocialUser
  /** Extra line under the name, e.g. affinity or review count. */
  meta?: ReactNode
  /** Hidden for the viewer's own row. */
  showFollow: boolean
  pending?: boolean
  onToggleFollow: (user: SocialUser) => void
}

/** A person in a list: avatar and name open the profile, with the seal and a follow button. */
export function SocialUserRow({ user, meta, showFollow, pending = false, onToggleFollow }: SocialUserRowProps) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3 sm:p-4">
      <Link to={`/users/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500">
        <SocialAvatar src={user.avatarUrl} />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 font-medium text-ink">
            <span className="truncate">{user.displayName}</span>
            <UserBadge tier={user.tier} size={20} />
          </span>
          <span className="block truncate text-xs text-gray-500">@{user.username}</span>
          {meta && <span className="block text-xs text-gray-500">{meta}</span>}
        </span>
      </Link>
      {showFollow && (
        <FollowButton following={user.following} name={user.displayName} pending={pending} onToggle={() => onToggleFollow(user)} />
      )}
    </li>
  )
}
