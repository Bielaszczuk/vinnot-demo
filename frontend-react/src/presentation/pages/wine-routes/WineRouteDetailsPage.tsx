/**
 * WineRouteDetailsPage — wine route detail page
 *
 * Shows full route information: hero image, difficulty badge, title, meta,
 * description, expandable stops timeline, map embed, and info sidebar.
 * Migrated from Vue WineRouteDetailsPage.vue.
 *
 * All data fetching goes through TanStack Query hooks → service → client.
 * No direct Axios calls.
 */

import { ArrowLeft, Clock, MapPin, Map as MapIcon, Share2, TrendingUp } from 'lucide-react'
import { illustrations } from '@shared/illustrations'
import { CommunityActions } from '@components/features/community/CommunityActions'
import { RouteDifficultyIcon } from '@components/features/wineRoute/RouteIcons'
import { Button } from '@components/ui/Button'
import { EmptyState } from '@components/ui/EmptyState'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { PageLoader } from '@components/ui/PageLoader'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { RatingStars } from '@components/ui/RatingStars'
import { CoverImage } from '@components/features/media/CoverImage'
import { GoogleMapsEmbed } from '@components/ui/GoogleMapsEmbed'
import { RouteStopTimeline } from '@components/features/wineRoute/RouteStopTimeline'
import { RouteInfoSidebar } from '@components/features/wineRoute/RouteInfoSidebar'
import { formatDecimal, formatDistance } from '@utils/format'
import { routeLengthLabel } from '@components/features/wineRoute/routeLength'
import { useWineRouteDetailsViewModel } from './useWineRouteDetailsViewModel'

/* ── component ──────────────────────────────────────────────────────── */

export function WineRouteDetailsPage() {
  const {
    t,
    wineRoute,
    isLoading,
    isError,
    error,
    retry,
    totalDurationMinutes,
    totalDistanceKm,
    routeMapQuery,
    diffConf,
    goBack,
    startNavigation,
    shareRoute,
    canShare,
  } = useWineRouteDetailsViewModel()

  /* ── render ───────────────────────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-5xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={goBack} className="mb-4 -ml-2 sm:mb-6" leftIcon={<Icon icon={ArrowLeft} />}>
        {t('common.back', 'Back')}
      </Button>

      {/* ═══════════ Loading ═══════════ */}
      {isLoading && <PageLoader />}

      {/* ═══════════ Error ═══════════ */}
      {isError && !isLoading && <QueryErrorState error={error} onRetry={() => void retry()} />}

      {/* ═══════════ Main content ═══════════ */}
      {wineRoute && !isLoading && (
        <>
          {/* ═══════════ HERO IMAGE ═══════════ */}
          <div className="relative mb-4 overflow-hidden rounded-xl sm:mb-6 sm:rounded-2xl">
            <div className="aspect-[21/9] bg-gray-100 sm:aspect-[21/8]">
                <CoverImage
                  src={wineRoute.imageUrl ?? undefined}
                  alt={wineRoute.name}
                  fallbackSrc={illustrations.route}
                  className="h-full w-full object-cover"
                />
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* Difficulty badge top-left */}
            {wineRoute.difficulty && (
              <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider shadow-sm ring-1 ${
                    diffConf?.bg ?? 'bg-gray-50 ring-gray-200/60'
                  }`}
                >
                  <RouteDifficultyIcon difficulty={wineRoute.difficulty} />
                  <span className={diffConf?.color ?? 'text-gray-700'}>
                    {t(`routes.duration.${wineRoute.difficulty}`, wineRoute.difficulty)}
                  </span>
                </span>
              </div>
            )}

            {/* Rating badge bottom-left */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 sm:bottom-6 sm:left-6">
              {wineRoute.rating != null && (
                <div className="flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-sm">
                  <RatingStars value={wineRoute.rating} size="sm" />
                  <span aria-hidden="true" className="text-sm font-semibold text-gray-900">{formatDecimal(wineRoute.rating, 1)}</span>
                  <span className="text-xs text-gray-500">({wineRoute.reviewCount})</span>
                </div>
              )}
            </div>

            {/* Stops count bottom-right */}
            <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
              <div className="flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-sm">
                <Icon icon={MapPin} className="text-wine-700" />
                <span className="text-sm font-semibold text-gray-900">{wineRoute.stops.length}</span>
                <span className="text-xs text-gray-500">{t('routes.stops', 'stops')}</span>
              </div>
            </div>
          </div>

          {/* ═══════════ MAIN CONTENT GRID ═══════════ */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            {/* LEFT COLUMN (2/3) */}
            <div className="space-y-4 sm:space-y-6 lg:col-span-2">
              {/* Title & Meta */}
              <section className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6 md:p-8">
                <h1 className="text-xl font-semibold leading-tight tracking-tight text-ink sm:text-2xl lg:text-3xl">
                  {wineRoute.name}
                </h1>

                {/* Quick stats row */}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Icon icon={MapPin} className="text-gray-400" />
                    <span>{wineRoute.region}, {wineRoute.country}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon icon={Clock} className="text-gray-400" />
                    <span>{routeLengthLabel(t, totalDurationMinutes, wineRoute.days)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon icon={TrendingUp} className="text-gray-400" />
                    <span>{formatDistance(totalDistanceKm)}</span>
                  </div>
                </div>

                {/* Tags */}
                {wineRoute.tags?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {wineRoute.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-lg bg-wine-50 px-2.5 py-1 text-xs font-medium text-wine-700 ring-1 ring-wine-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions: share, maps and the community menu */}
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-5">
                  {canShare && (
                    <Button variant="outline" size="sm" onClick={shareRoute} leftIcon={<Icon icon={Share2} />}>
                      {t('events.share', 'Share')}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={startNavigation} leftIcon={<Icon icon={MapIcon} />}>
                    {t('events.openMaps', 'Open in Maps')}
                  </Button>
                  <div className="ml-auto">
                    <CommunityActions variant="menu" targetType="WINE_ROUTE" targetId={wineRoute.id} allowBlock={false} />
                  </div>
                </div>
              </section>

              {/* About / Description */}
              {wineRoute.description && (
                <div className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t('routes.aboutRoute', 'About this route')}
                  </h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
                    {wineRoute.description}
                  </p>
                </div>
              )}

              {/* Route Timeline (Stops) */}
              <RouteStopTimeline stops={wineRoute.stops} />

              {/* Map */}
              {(wineRoute.mapEmbedUrl || routeMapQuery) && (
                <div className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t('routes.routeMap', 'Route map')}
                  </h3>
                  <div className="overflow-hidden rounded-xl">
                    {wineRoute.mapEmbedUrl ? (
                      <GoogleMapsEmbed mode="place" query={wineRoute.mapEmbedUrl} height="450px" />
                    ) : routeMapQuery?.mode === 'directions' ? (
                      <GoogleMapsEmbed
                        mode="directions"
                        origin={routeMapQuery.origin}
                        destination={routeMapQuery.destination}
                        waypoints={routeMapQuery.waypoints}
                        height="450px"
                      />
                    ) : routeMapQuery?.mode === 'place' ? (
                      <GoogleMapsEmbed mode="place" query={routeMapQuery.query} height="450px" />
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN (1/3) */}
            <RouteInfoSidebar
              route={wineRoute}
              totalDurationMinutes={totalDurationMinutes}
              totalDistanceKm={totalDistanceKm}
            />
          </div>
        </>
      )}

      {/* Not found (no data, no loading, no error) */}
      {!wineRoute && !isLoading && !isError && (
        <EmptyState
          illustration="route"
          title={t('routes.notFound', 'Route not found')}
          action={<LinkButton to="/wine-routes" variant="secondary">{t('routes.explore')}</LinkButton>}
        />
      )}
    </div>
  )
}
