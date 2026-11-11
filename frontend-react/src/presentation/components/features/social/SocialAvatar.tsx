import { UserRound } from 'lucide-react'
import { Icon } from '@components/ui/Icon'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'

interface SocialAvatarProps {
  src: string | null
  /** Size in Tailwind units, e.g. `h-10 w-10`. */
  sizeClassName?: string
  className?: string
}

/** Round user photo with the generic person icon as fallback. */
export function SocialAvatar({ src, sizeClassName = 'h-10 w-10', className = '' }: SocialAvatarProps) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 ${sizeClassName} ${className}`.trim()}>
      <ImageWithFallback
        src={src ?? undefined}
        alt=""
        className="h-full w-full object-cover"
        fallbackElement={<Icon icon={UserRound} size="md" className="text-gray-400" />}
      />
    </span>
  )
}
