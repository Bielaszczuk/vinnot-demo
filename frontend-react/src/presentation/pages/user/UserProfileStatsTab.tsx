import { CalendarDays, MessageSquareText, Star, Warehouse } from 'lucide-react'
import { Card } from '@components/ui/Card'
import { Icon } from '@components/ui/Icon'
import { PageLoader } from '@components/ui/PageLoader'
import type { ReactNode } from 'react'
import type { UserProfileViewModel } from './useUserProfileViewModel'
import { formatProfileRating } from './UserProfileFormatters'

interface UserProfileTabProps {
  vm: UserProfileViewModel
}

function StatCard({
  icon,
  haloClass,
  iconClass,
  value,
  label,
}: {
  icon: ReactNode
  haloClass: string
  iconClass: string
  value: string | number
  label: string
}) {
  return (
    <Card padding="lg" className="relative overflow-hidden">
      <div className={`absolute -mr-4 -mt-4 right-0 top-0 h-20 w-20 rounded-full ${haloClass}`} />
      <div className="relative">
        <div className="mb-3 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>{icon}</div>
        </div>
        <div className="text-3xl font-semibold text-ink">{value}</div>
        <div className="mt-1 text-sm text-gray-500">{label}</div>
      </div>
    </Card>
  )
}

function ActivityBar({ label, value, colorClass, width }: { label: string; value: number; colorClass: string; width: number }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100">
        <div className={`h-2.5 rounded-full bg-gradient-to-r transition-all duration-500 motion-reduce:transition-none ${colorClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export function UserProfileStatsTab({ vm }: UserProfileTabProps) {
  const { t, loadingStats, stats } = vm

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          haloClass="bg-wine-100/50"
          iconClass="bg-wine-50"
          value={stats?.totalReviews ?? 0}
          label={t('profile.reviewsWritten')}
          icon={<Icon icon={MessageSquareText} size="md" className="text-wine-700" />}
        />
        <StatCard
          haloClass="bg-wine-50"
          iconClass="bg-wine-100/70"
          value={stats?.cellarSize ?? 0}
          label={t('profile.winesInCellar')}
          icon={<Icon icon={Warehouse} size="md" className="text-wine-800" />}
        />
        <StatCard
          haloClass="bg-success-soft"
          iconClass="bg-success-soft"
          value={stats?.totalEventsAttended ?? 0}
          label={t('profile.eventsAttended')}
          icon={<Icon icon={CalendarDays} size="md" className="text-success" />}
        />
        <StatCard
          haloClass="bg-warning-soft"
          iconClass="bg-warning-soft"
          value={formatProfileRating(stats?.averageRating ?? 0)}
          label={t('profile.averageRating')}
          icon={<Icon icon={Star} size="md" className="text-rating" fill="currentColor" />}
        />
      </div>

      <Card padding="lg">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{t('profile.activitySummary')}</h3>
        {loadingStats ? (
          <PageLoader compact label={t('profile.loadingStats')} />
        ) : (
          <div className="space-y-4">
            <ActivityBar label={t('profile.reviewsLabel')} value={stats?.totalReviews ?? 0} colorClass="from-wine-500 to-wine-600" width={Math.min((stats?.totalReviews ?? 0) * 5, 100)} />
            <ActivityBar label={t('profile.cellarLabel')} value={stats?.cellarSize ?? 0} colorClass="from-wine-300 to-wine-500" width={Math.min((stats?.cellarSize ?? 0) * 5, 100)} />
            <ActivityBar label={t('profile.eventsLabel')} value={stats?.totalEventsAttended ?? 0} colorClass="from-emerald-600 to-success" width={Math.min((stats?.totalEventsAttended ?? 0) * 10, 100)} />
          </div>
        )}
      </Card>
    </div>
  )
}
