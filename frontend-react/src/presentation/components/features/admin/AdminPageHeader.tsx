/**
 * AdminPageHeader — the title band of admin pages, built on `PageBanner`
 * so admin and user pages share one warm header.
 */
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageBanner } from '@components/ui/PageBanner'

interface AdminPageHeaderProps {
  title: string
  subtitle: string
  actions?: ReactNode
  icon?: LucideIcon
}

export function AdminPageHeader({ title, subtitle, actions, icon }: AdminPageHeaderProps) {
  const { t } = useTranslation()
  return <PageBanner eyebrow={t('nav.admin')} title={title} subtitle={subtitle} actions={actions} icon={icon} />
}
