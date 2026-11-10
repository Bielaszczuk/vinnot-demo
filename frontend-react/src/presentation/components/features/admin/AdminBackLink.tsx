/**
 * AdminBackLink — reusable "Volver al panel" link
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import { Icon } from '@components/ui/Icon'

interface AdminBackLinkProps {
  to?: string
  label?: string
}

export function AdminBackLink({ to = '/admin', label }: AdminBackLinkProps) {
  const { t } = useTranslation()
  const resolvedLabel = label || t('admin.common.backToPanel')

  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 min-h-11 text-sm text-muted hover:text-ink transition-colors group"
    >
      <Icon icon={ChevronLeft} size="sm" className="transition-transform group-hover:-translate-x-0.5" />
      {resolvedLabel}
    </Link>
  )
}
