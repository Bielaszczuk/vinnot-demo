import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Horizontal scroll for admin tables on narrow screens, so the actions column
 * stays reachable. Focusable so keyboard users can scroll it too.
 */
export function AdminTableScroll({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div role="region" aria-label={t('admin.common.tableScroll')} tabIndex={0} className="overflow-x-auto">
      {children}
    </div>
  )
}
