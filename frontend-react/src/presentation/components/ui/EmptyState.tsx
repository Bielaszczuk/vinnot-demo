/**
 * EmptyState — an empty list or result.
 *
 * Main lists show a watercolor `illustration` from the shared catalog; small
 * blocks may use an `icon`. The title says what is empty, the description
 * why, and `action` offers the next step (for example, clear the filters).
 */

import { type ReactNode } from 'react'
import { illustrations } from '@shared/illustrations'
import { ImageWithFallback } from './ImageWithFallback'

export type EmptyIllustration = keyof typeof illustrations

interface EmptyStateProps {
  illustration?: EmptyIllustration
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  illustration,
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-4 py-12 text-center ${className}`.trim()}
    >
      {illustration ? (
        <ImageWithFallback
          src={illustrations[illustration]}
          alt=""
          className="mb-6 h-40 w-auto max-w-full object-contain sm:h-48"
          fallbackElement={<div aria-hidden="true" className="mb-6 h-px w-16 bg-wine-200" />}
        />
      ) : (
        icon && <div className="mb-4 text-gray-400">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-gray-600">{description}</p>
      )}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}
