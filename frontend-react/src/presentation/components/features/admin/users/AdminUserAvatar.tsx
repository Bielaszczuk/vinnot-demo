import { ImageWithFallback } from '@components/ui/ImageWithFallback'

interface AdminUserAvatarProps {
  userId: string
  username: string
  avatarUrl?: string | null
}

/** The account photo in the admin users list and dialog; the username initial when there is none or it fails. */
export function AdminUserAvatar({ userId, username, avatarUrl }: AdminUserAvatarProps) {
  const initial = <span aria-hidden="true">{username?.charAt(0).toUpperCase()}</span>
  return (
    <div
      data-testid={`admin-user-avatar-${userId}`}
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-xs font-bold text-white"
    >
      <ImageWithFallback src={avatarUrl ?? undefined} alt="" className="h-full w-full object-cover" fallbackElement={initial} />
    </div>
  )
}
