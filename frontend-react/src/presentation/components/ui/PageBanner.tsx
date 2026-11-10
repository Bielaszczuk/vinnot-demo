/**
 * PageBanner — the title band of a page.
 *
 * A warm dark band (ink to burgundy) with soft watercolor-like glows, the
 * page's only h1, an optional eyebrow, subtitle and icon, actions on the
 * right, and `children` for the search and filters that belong to the title.
 */

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Icon } from './Icon'

interface PageBannerProps {
  title: string
  eyebrow?: string
  subtitle?: ReactNode
  icon?: LucideIcon
  /** A back link or button shown above the title. */
  back?: ReactNode
  /** Actions on the title row, for example "Create event". */
  actions?: ReactNode
  /** Search, filters or status lines under the title. */
  children?: ReactNode
  className?: string
}

export function PageBanner({ title, eyebrow, subtitle, icon, back, actions, children, className = '' }: PageBannerProps) {
  return (
    <header
      className={`relative isolate overflow-clip rounded-2xl bg-gradient-to-br from-gray-900 via-wine-950 to-wine-900 shadow-lg shadow-wine-950/10 ring-1 ring-white/5 ${className}`.trim()}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-wine-500/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-rating/15 blur-3xl" />
      </div>
      <div className="px-4 py-6 sm:px-8 sm:py-9">
        {back && <div className="mb-3 text-gray-300">{back}</div>}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.22em] text-wine-200">{eyebrow}</p>
            )}
            <div className="flex items-center gap-3">
              {icon && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-wine-200 backdrop-blur-sm">
                  <Icon icon={icon} size="md" />
                </span>
              )}
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
            </div>
            {subtitle && <div className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300">{subtitle}</div>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children && <div className="mt-5 sm:mt-6">{children}</div>}
      </div>
    </header>
  )
}
