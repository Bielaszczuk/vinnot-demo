/**
 * Skeleton — loading placeholder UI component
 */

interface SkeletonProps {
  className?: string
  width?: string
  height?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

const roundedStyles: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
}

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse motion-reduce:animate-none bg-gray-200 ${roundedStyles[rounded]} ${className}`.trim()}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

