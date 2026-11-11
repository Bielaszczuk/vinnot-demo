/**
 * FollowButton — "Follow" / "Following" toggle. Both states keep the same footprint,
 * so a row or a header never jumps when the state flips.
 */
import { Check, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'

interface FollowButtonProps {
  following: boolean
  /** Name read by screen readers, e.g. "Follow Ana". */
  name: string
  onToggle: () => void
  pending?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function FollowButton({ following, name, onToggle, pending = false, size = 'sm', className = '' }: FollowButtonProps) {
  const { t } = useTranslation()
  return (
    <Button
      type="button"
      size={size}
      variant={following ? 'outline' : 'primary'}
      className={`min-w-[7.5rem] justify-center ${className}`.trim()}
      aria-pressed={following}
      aria-label={following ? t('social.unfollowLabel', { name }) : t('social.followLabel', { name })}
      disabled={pending}
      onClick={onToggle}
      leftIcon={<Icon icon={following ? Check : UserPlus} size="sm" />}
    >
      {following ? t('social.followingState') : t('social.follow')}
    </Button>
  )
}
