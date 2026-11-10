import { AdminQueryError } from '@components/features/admin/AdminQueryError'
/**
 * AdminDashboardPage — admin panel dashboard with stats and quick actions
 *
 * Migrated from Vue: frontend/src/pages/admin/AdminDashboardPage.vue
 * Architecture: page → useAdminStats hook → adminService → adminClient → http
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, CalendarDays, Grape, Megaphone, Route, ShieldAlert, Smartphone, Users, Warehouse, Wine, type LucideIcon } from 'lucide-react'
import { Icon } from '@components/ui/Icon'
import { PageBanner } from '@components/ui/PageBanner'
import { formatNumber } from '@utils/format'
import { useAuth } from '@hooks/useAuth'
import { useAdminStats } from '@hooks/queries/admin'
import { ROLES } from '@config/roles'
import type { AdminStats } from '@domain/admin/admin.types'

interface StatCard {
  key: string
  labelKey: string
  icon: LucideIcon
  to: string
  adminOnly?: boolean
}

const allCards: StatCard[] = [
  { key: 'wines', labelKey: 'admin.dashboard.cards.wines', icon: Wine, to: '/admin/wines' },
  { key: 'wineries', labelKey: 'admin.dashboard.cards.wineries', icon: Warehouse, to: '/admin/wineries' },
  { key: 'events', labelKey: 'admin.dashboard.cards.events', icon: CalendarDays, to: '/admin/events' },
  { key: 'routes', labelKey: 'admin.dashboard.cards.routes', icon: Route, to: '/admin/routes' },
  { key: 'reviews', labelKey: 'admin.dashboard.cards.reviews', icon: Grape, to: '/admin/reviews' },
  { key: 'users', labelKey: 'admin.dashboard.cards.users', icon: Users, to: '/admin/users', adminOnly: true },
]

const quickActions = [
  { labelKey: 'admin.dashboard.quickActions.moderation.title', icon: ShieldAlert, to: '/admin/community', descKey: 'admin.dashboard.quickActions.moderation.desc' },
  { labelKey: 'admin.dashboard.quickActions.wines.title', icon: Wine, to: '/admin/wines', descKey: 'admin.dashboard.quickActions.wines.desc' },
  { labelKey: 'admin.dashboard.quickActions.events.title', icon: CalendarDays, to: '/admin/events', descKey: 'admin.dashboard.quickActions.events.desc' },
  { labelKey: 'admin.dashboard.quickActions.routes.title', icon: Route, to: '/admin/routes', descKey: 'admin.dashboard.quickActions.routes.desc' },
  { labelKey: 'admin.dashboard.quickActions.wineries.title', icon: Warehouse, to: '/admin/wineries', descKey: 'admin.dashboard.quickActions.wineries.desc' },
  { labelKey: 'admin.dashboard.quickActions.notifications.title', icon: Bell, to: '/admin/notifications', descKey: 'admin.dashboard.quickActions.notifications.desc', adminOnly: true },
  { labelKey: 'admin.dashboard.quickActions.socialPosts.title', icon: Megaphone, to: '/admin/social-posts', descKey: 'admin.dashboard.quickActions.socialPosts.desc', adminOnly: true },
  { labelKey: 'admin.dashboard.quickActions.appVersions.title', icon: Smartphone, to: '/admin/app-versions', descKey: 'admin.dashboard.quickActions.appVersions.desc', adminOnly: true },
]

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation()
  const { user, hasRole } = useAuth()
  const { data: stats, isLoading, isError, refetch } = useAdminStats()
  const isAdmin = hasRole(ROLES.ADMIN)

  const cards = allCards.filter((c) => !c.adminOnly || isAdmin)

  // Extended stats only shown when values are available from backend
  const extendedStats: Array<{ label: string; value: number | null }> = [
    { label: 'admin.dashboard.stats.activeUsers', value: stats?.activeUsers ?? null },
    { label: 'admin.dashboard.stats.publishedEvents', value: stats?.publishedEvents ?? null },
    { label: 'admin.dashboard.stats.publishedRoutes', value: stats?.publishedRoutes ?? null },
  ].filter((s) => s.value !== null)
  const locale = i18n.resolvedLanguage ?? i18n.language

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageBanner
        eyebrow={t('nav.admin')}
        title={t('admin.dashboard.title')}
        subtitle={t('admin.dashboard.welcome', {
          name: user?.name || user?.username || t('admin.dashboard.defaultAdminName'),
        })}
      />

      {/* Stats Grid */}
      {isError ? <AdminQueryError retry={refetch} /> : isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white border border-gray-200/60 p-5 animate-pulse motion-reduce:animate-none shadow-sm">
              <div className="h-8 w-8 bg-gray-200 rounded-lg mb-3" />
              <div className="h-7 w-16 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-12 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {cards.map((card) => (
              <Link
                key={card.key}
                to={card.to}
                className="group relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-lg hover:border-wine-300/60 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="absolute top-0 right-0 w-20 h-20 -mr-4 -mt-4 rounded-full bg-wine-100 opacity-40 group-hover:opacity-70 transition-opacity" />
                <div className="relative">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-wine-50 text-wine-700 group-hover:scale-105 transition-transform duration-300">
                    <Icon icon={card.icon} size="md" />
                  </span>
                  <div className="text-3xl font-semibold text-ink tracking-tight">
                    {(() => {
                      const value = (stats as AdminStats | undefined)?.[card.key as keyof AdminStats]
                      return typeof value === 'number' ? formatNumber(value, undefined, locale) : '–'
                    })()}
                  </div>
                  <div className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">
                    {t(card.labelKey)}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Extended stats — activeUsers, publishedEvents, publishedRoutes */}
          {extendedStats.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {extendedStats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-white px-5 py-3 shadow-sm"
                >
                  <span className="text-xl font-semibold text-wine-800">
                    {formatNumber(stat.value ?? 0, undefined, locale)}
                  </span>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t(stat.label)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

        {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.common.quickActions')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.filter((action) => !action.adminOnly || isAdmin).map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-start gap-4 p-5 rounded-2xl border border-border bg-white shadow-sm hover:shadow-md hover:border-wine-300/60 transition-all duration-300"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-wine-50 text-wine-700 flex items-center justify-center group-hover:bg-wine-100 transition-colors">
                <Icon icon={action.icon} size="lg" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-wine-700 transition-colors">
                  {t(action.labelKey)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t(action.descKey)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage
