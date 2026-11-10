/**
 * PageLoader — the one loading state for a page or a large block.
 *
 * The grape mark paints itself while the content loads; the status is
 * announced to assistive technology and no "Loading…" text is shown.
 */

import { useTranslation } from 'react-i18next'
import { GrapeLoadingMark } from '@components/brand/GrapeLoadingMark'

interface PageLoaderProps {
  /** A block inside a page instead of a whole page. */
  compact?: boolean
  /** Spoken label; defaults to "Cargando…" / "Loading…". */
  label?: string
}

export function PageLoader({ compact = false, label }: PageLoaderProps) {
  const { t } = useTranslation()
  return (
    <div className={`flex items-center justify-center ${compact ? 'py-12' : 'min-h-[50vh]'}`}>
      <span role="status" aria-label={label ?? t('common.loading')} className="inline-flex text-wine-700">
        <GrapeLoadingMark size={compact ? 40 : 56} />
      </span>
    </div>
  )
}
