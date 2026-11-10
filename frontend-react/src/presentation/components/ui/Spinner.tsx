/**
 * Spinner — base UI component
 */

import { useTranslation } from 'react-i18next'
import { GrapeLoadingMark } from '@components/brand/GrapeLoadingMark'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeStyles: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const { t } = useTranslation()
  if (size === 'lg') return <span role="status" aria-label={t('common.loading')} className={`h-12 w-12 inline-flex items-center justify-center text-wine-700 ${className}`.trim()}><GrapeLoadingMark /></span>
  return (
    <svg
      className={`animate-spin motion-reduce:animate-none text-wine-700 ${sizeStyles[size]} ${className}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label={t('common.loading')}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
