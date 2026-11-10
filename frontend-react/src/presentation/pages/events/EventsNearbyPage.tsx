/**
 * EventsNearbyPage — event listing page
 *
 * Uses geolocation to show nearby events first, falling back to all events.
 * Supports search, type, country and region filters, and pagination.
 */

import { CalendarDays, Search, TriangleAlert, X } from 'lucide-react'
import { EventCard } from '@components/features/event/EventCard'
import { Button } from '@components/ui/Button'
import { EmptyState } from '@components/ui/EmptyState'
import { Icon } from '@components/ui/Icon'
import { PageBanner } from '@components/ui/PageBanner'
import { PageLoader } from '@components/ui/PageLoader'
import { Pagination } from '@components/ui/Pagination'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { Select } from '@components/ui/Select'
import { fieldClassName } from '@components/ui/fieldStyles'
import type { EventType } from '@domain/event/event.types'
import { useEventsNearbyViewModel } from './useEventsNearbyViewModel'

/* ── filter constants ──────────────────────────────────────────────── */

const EVENT_TYPE_OPTIONS: { value: EventType }[] = [
  { value: 'TASTING' },
  { value: 'FESTIVAL' },
  { value: 'TOUR' },
  { value: 'WORKSHOP' },
  { value: 'DINNER' },
  { value: 'PAIRING' },
  { value: 'HARVEST' },
  { value: 'FAIR' },
  { value: 'COMPETITION' },
]

const filterWidth = 'min-w-[140px] flex-1 sm:w-auto sm:flex-none'

/* ── page component ────────────────────────────────────────────────── */

export function EventsNearbyPage() {
  const {
    t,
    discoveryMode,
    geo,
    search,
    setSearch,
    selectedType,
    setSelectedType,
    selectedCountry,
    setSelectedCountry,
    selectedRegion,
    setSelectedRegion,
    currentPage,
    isLoading,
    isError,
    error,
    retry,
    filteredEvents,
    nearbyEventsFound,
    showDiscoveryFallback,
    countryOptions,
    regionOptions,
    totalEvents,
    totalPages,
    hasActiveFilters,
    clearFilters,
    goToPage,
  } = useEventsNearbyViewModel()

  const clearButton = (
    <Button variant="secondary" leftIcon={<Icon icon={X} />} onClick={clearFilters}>
      {t('common.clearFilters', 'Limpiar filtros')}
    </Button>
  )

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageBanner
        title={t('events.title')}
        icon={CalendarDays}
        subtitle={
          <>
            <p>{t('events.availableCount', { count: totalEvents, value: totalEvents })}</p>
            <p className="mt-1" role="status">
              {t(`discovery.${discoveryMode}`)}
            </p>
            {geo.error && !geo.loading && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-wine-100">
                <Icon icon={TriangleAlert} size="xs" />
                {t('events.locationError')}. {t('events.showingAll')}
              </p>
            )}
          </>
        }
      >
        {/* Search bar */}
        <div className="relative mb-4">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-300">
            <Icon icon={Search} size="md" />
          </span>
          <input
            type="search"
            aria-label={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('events.searchPlaceholder')}
            className={fieldClassName({ tone: 'onDark', className: 'min-h-12 pl-12' })}
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          <Select
            aria-label={t('events.eventType')}
            tone="onDark"
            size="sm"
            containerClassName={filterWidth}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as EventType | '')}
          >
            <option value="" className="bg-gray-800 text-white">
              {t('events.eventType', 'Tipo de evento')}
            </option>
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-800 text-white">
                {t(`events.types.${opt.value}`, opt.value)}
              </option>
            ))}
          </Select>

          <Select
            aria-label={t('wines.country')}
            tone="onDark"
            size="sm"
            containerClassName={filterWidth}
            value={selectedCountry}
            onChange={(e) => { setSelectedCountry(e.target.value); setSelectedRegion('') }}
          >
            <option value="" className="bg-gray-800 text-white">{t('wines.country', 'País')}</option>
            {countryOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-800 text-white">{opt.label}</option>
            ))}
          </Select>

          {selectedCountry && (
            <Select
              aria-label={t('wines.region')}
              tone="onDark"
              size="sm"
              containerClassName={filterWidth}
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              <option value="" className="bg-gray-800 text-white">{t('wines.region', 'Región')}</option>
              {regionOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-gray-800 text-white">{opt.label}</option>
              ))}
            </Select>
          )}

          {hasActiveFilters && (
            <Button variant="onDark" size="sm" leftIcon={<Icon icon={X} size="xs" />} onClick={clearFilters}>
              {t('common.clear')}
            </Button>
          )}
        </div>
      </PageBanner>

      {!isLoading && !geo.loading && showDiscoveryFallback && (
        <div className="rounded-2xl border border-warning/20 bg-warning-soft px-5 py-4">
          <p className="font-medium text-ink">{t('events.discoveryFallbackTitle')}</p>
          <p className="mt-1 text-sm text-warning">{t('events.discoveryFallbackBody')}</p>
        </div>
      )}

      {!isLoading && !geo.loading && !nearbyEventsFound && filteredEvents.length > 0 && (
        <h2 className="text-xl font-semibold text-ink">{t('events.otherEvents')}</h2>
      )}

      {isError && <QueryErrorState error={error} onRetry={() => void retry()} />}
      {isLoading || geo.loading ? (
        <PageLoader compact />
      ) : isError && filteredEvents.length === 0 ? null : filteredEvents.length === 0 ? (
        <EmptyState
          illustration="event"
          title={t('events.noEvents')}
          description={t('events.noEventsDesc')}
          action={hasActiveFilters ? clearButton : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {filteredEvents.map((event, idx) => (
            <EventCard key={event.id} event={event} index={idx} />
          ))}
        </div>
      )}

      {!isLoading && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          summary={`${totalEvents} ${t('events.title').toLowerCase()}`}
          className="pb-8"
        />
      )}
    </div>
  )
}
