/**
 * RouteInfoSidebar — right-column detail sidebar for wine route detail page
 *
 * Renders "Start Route" card, quick info card, and stops summary.
 * Migrated from the Vue WineRouteDetailsPage sidebar sections.
 */

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Info, MapPin, Map as MapIcon, TrendingUp } from 'lucide-react'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { RatingStars } from '@components/ui/RatingStars'
import { hasCoordinates } from '@domain/location/coordinates'
import { RouteDifficultyIcon, RouteStopTypeIcon } from './RouteIcons'
import { formatDecimal, formatDuration, formatDistance } from '@utils/format'
import { routeLengthLabel } from './routeLength'
import type { WineRoute } from '@domain/route/route.types'

/* ── constants ─────────────────────────────────────────────────────── */

const DIFFICULTY_CONFIG: Record<
  string,
  { color: string; bg: string }
> = {
  short: { color: 'text-success', bg: 'bg-success-soft ring-success/20' },
  medium: { color: 'text-rating', bg: 'bg-warning-soft ring-rating/20' },
  long: { color: 'text-wine-700', bg: 'bg-wine-50 ring-wine-200/60' },
}

/* ── props ──────────────────────────────────────────────────────────── */

interface RouteInfoSidebarProps {
  route: WineRoute
  totalDurationMinutes: number
  totalDistanceKm: number
}

/* ── component ──────────────────────────────────────────────────────── */

export function RouteInfoSidebar({
  route,
  totalDurationMinutes,
  totalDistanceKm,
}: RouteInfoSidebarProps) {
  const { t } = useTranslation()
  const diffConf = route.difficulty ? DIFFICULTY_CONFIG[route.difficulty] : undefined

  const startNavigation = useCallback(() => {
    if (!route.stops || route.stops.length === 0) return

    const stops = route.stops
    const origin = stops[0]
    const destination = stops[stops.length - 1]
    if (!origin || !destination) return

    const waypoints = stops.slice(1, -1).map((stop) => {
      if (hasCoordinates(stop.location)) {
        return `${stop.location.latitude},${stop.location.longitude}`
      }
      return encodeURIComponent(stop.name)
    })

    let url = 'https://www.google.com/maps/dir/?api=1'

    if (hasCoordinates(origin.location)) {
      url += `&origin=${origin.location.latitude},${origin.location.longitude}`
    } else {
      url += `&origin=${encodeURIComponent(origin.name)}`
    }

    if (hasCoordinates(destination.location)) {
      url += `&destination=${destination.location.latitude},${destination.location.longitude}`
    } else {
      url += `&destination=${encodeURIComponent(destination.name)}`
    }

    if (waypoints.length > 0) {
      url += `&waypoints=${waypoints.join('|')}`
    }

    url += '&travelmode=driving'
    window.open(url, '_blank')
  }, [route.stops])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ═══════════ Start Route Card ═══════════ */}
      <div className="overflow-hidden rounded-xl border border-gray-200/60 bg-white shadow-sm sm:rounded-2xl">
        {/* Card header */}
        <div className="bg-gradient-to-r from-wine-700 to-wine-800 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-wine-200">
                {t('routes.title')}
              </p>
              <p className="mt-0.5 text-lg font-semibold text-white">
                {t('routes.startRoute', 'Start route')}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <Icon icon={MapIcon} size="md" />
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {/* Duration */}
          <SidebarStat
            icon={<Icon icon={Clock} className="text-wine-700" />}
            label={t('routes.duration.label', 'Duration')}
            value={routeLengthLabel(t, totalDurationMinutes, route.days)}
          />

          {/* Distance */}
          <SidebarStat
            icon={<Icon icon={TrendingUp} className="text-wine-700" />}
            label={t('routes.distance', 'Distance')}
            value={formatDistance(totalDistanceKm)}
          />

          {/* Stops count */}
          <SidebarStat
            icon={<Icon icon={MapPin} className="text-wine-700" />}
            label={t('routes.stops', 'Stops')}
            value={`${route.stops.length} ${t('routes.stops', 'stops').toLowerCase()}`}
          />

          {/* Rating */}
          {route.rating != null && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">{t('wines.rating', 'Rating')}</p>
              <div className="flex items-center gap-2">
                <RatingStars value={route.rating} />
                <span aria-hidden="true" className="text-sm font-semibold text-gray-900">{formatDecimal(route.rating, 1)}</span>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {t('routes.reviewCount', { count: route.reviewCount ?? 0 })}
              </p>
            </div>
          )}

          {/* Start button */}
          <Button size="lg" onClick={startNavigation} className="w-full" leftIcon={<Icon icon={MapIcon} />}>
            {t('routes.startRoute', 'Start route')}
          </Button>
        </div>
      </div>

      {/* ═══════════ Quick Info Card ═══════════ */}
      <div className="rounded-xl border border-wine-100/60 bg-gradient-to-br from-wine-50/60 to-white p-4 shadow-sm sm:rounded-2xl sm:p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wine-700 text-white">
            <Icon icon={Info} />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
            {t('events.quickInfo', 'Quick info')}
          </h3>
        </div>
        <div className="space-y-2.5 text-xs text-gray-600">
          {route.difficulty && (
            <QuickInfoRow
              label={t('routes.duration.label', 'Duration')}
              value={
                <span className={`flex items-center gap-1 font-medium ${diffConf?.color ?? 'text-gray-700'}`}>
                  <RouteDifficultyIcon difficulty={route.difficulty} />
                  {t(`routes.duration.${route.difficulty}`, route.difficulty)}
                </span>
              }
            />
          )}
          <QuickInfoRow
            label={t('common.totalTime', 'Total time')}
            value={<span className="font-medium text-gray-700">{routeLengthLabel(t, totalDurationMinutes, route.days)}</span>}
          />
          <QuickInfoRow
            label={t('routes.distance', 'Distance')}
            value={<span className="font-medium text-gray-700">{formatDistance(totalDistanceKm)}</span>}
          />
          <QuickInfoRow
            label={t('routes.stops', 'Stops')}
            value={<span className="font-medium text-gray-700">{route.stops.length}</span>}
          />
          <QuickInfoRow
            label={t('wines.region', 'Region')}
            value={<span className="font-medium text-gray-700">{route.region}</span>}
          />
          <QuickInfoRow
            label={t('wines.country', 'Country')}
            value={<span className="font-medium text-gray-700">{route.country}</span>}
          />
        </div>
      </div>

      {/* ═══════════ Stop Types Summary ═══════════ */}
      {route.stops.length > 0 && (
        <div className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t('routes.stops', 'Stops')}
          </h3>
          <div className="space-y-2">
            {route.stops.map((stop) => (
              <div key={stop.id} className="flex items-center gap-2.5 py-1.5">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-wine-50">
                  <RouteStopTypeIcon type={stop.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-700">{stop.name}</p>
                  <p className="text-2xs text-gray-500">
                    {t(`routes.stopTypes.${stop.type}`, stop.type)}
                  </p>
                </div>
                {stop.duration > 0 && (
                  <span className="flex-shrink-0 text-2xs text-gray-500">
                    {formatDuration(stop.duration)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── sub-components ─────────────────────────────────────────────────── */

function SidebarStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-wine-50">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function QuickInfoRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      {value}
    </div>
  )
}

