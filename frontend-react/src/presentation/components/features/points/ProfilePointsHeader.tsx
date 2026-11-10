/**
 * ProfilePointsHeader — points and seal in the own profile header. The seal
 * opens "Your points". Renders nothing when the points are unavailable, so
 * the header never breaks.
 */

import type { PointsSummary } from '@domain/points/points.types'
import { Skeleton } from '@components/ui/Skeleton'
import { PointsTierSummary } from './PointsTierSummary'

export const POINTS_PAGE_PATH = '/profile/points'

interface ProfilePointsHeaderProps {
  summary: PointsSummary | undefined
  loading?: boolean
}

export function ProfilePointsHeader({ summary, loading = false }: ProfilePointsHeaderProps) {
  if (summary) return <PointsTierSummary summary={summary} tone="dark" sealSize={72} to={POINTS_PAGE_PATH} />
  if (!loading) return null
  return (
    <div className="flex items-center gap-4" data-testid="profile-points-loading">
      <Skeleton width="64px" height="64px" rounded="full" className="bg-white/15" />
      <Skeleton width="160px" height="12px" className="bg-white/15" />
    </div>
  )
}
