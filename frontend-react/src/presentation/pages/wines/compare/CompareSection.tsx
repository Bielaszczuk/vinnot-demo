import { useId, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Icon } from '@components/ui/Icon'

export type CompareT = (key: string, options?: Record<string, unknown>) => string

/** The card, icon well and title shared by every comparison section, as on the AI profile page. */
export function CompareSection({ icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wine-50 text-wine-700">
          <Icon icon={icon} />
        </div>
        <h2 id={headingId} className="text-sm font-semibold uppercase tracking-wider text-ink">{title}</h2>
      </div>
      {children}
    </section>
  )
}

/** Column header naming the wine; wine A uses the wine accent, wine B the neutral one, like the bar table. */
export function WineColumnLabel({ side, label }: { side: 'A' | 'B'; label: string }) {
  return (
    <p className={`mb-3 truncate text-xs font-bold ${side === 'A' ? 'text-wine-700' : 'text-gray-600'}`}>{label}</p>
  )
}

/** Small labelled fact tile (cream background), as used for serving and palate details on the profile. */
export function FactTile({ label, value, icon }: { label: string; value: string; icon?: LucideIcon }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-surface-cream p-3">
      {icon && (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white text-wine-700 shadow-sm">
          <Icon icon={icon} size="xs" />
        </div>
      )}
      <div className="min-w-0">
        <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        <p className="mt-0.5 text-sm leading-relaxed text-ink">{value}</p>
      </div>
    </div>
  )
}
