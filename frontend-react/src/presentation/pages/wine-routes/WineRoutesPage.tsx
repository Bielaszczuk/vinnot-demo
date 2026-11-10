/**
 * WineRoutesPage — wine route listing page with search and filters
 *
 * Supports:
 *   - Search by name/region/country/description (applied by the API)
 *   - Difficulty filter
 *   - Country filter (from hierarchy)
 *   - Region filter (cascading from selected country)
 *   - Clear filters
 *   - Loading / error / empty states
 *   - Pagination
 *
 * All data fetching goes through TanStack Query hooks → service → client.
 */

import { Map as MapIcon, Search, X } from 'lucide-react'
import { WineRouteCard } from '@components/features/wineRoute/WineRouteCard'
import { Button } from '@components/ui/Button'
import { EmptyState } from '@components/ui/EmptyState'
import { Icon } from '@components/ui/Icon'
import { PageBanner } from '@components/ui/PageBanner'
import { PageLoader } from '@components/ui/PageLoader'
import { Pagination } from '@components/ui/Pagination'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { Select } from '@components/ui/Select'
import { fieldClassName } from '@components/ui/fieldStyles'
import type { RouteDifficulty } from '@domain/route/route.types'
import { useWineRoutesViewModel } from './useWineRoutesViewModel'

/* ── constants ─────────────────────────────────────────────────────── */

const DIFFICULTY_OPTIONS: { value: RouteDifficulty }[] = [
  { value: 'short' },
  { value: 'medium' },
  { value: 'long' },
]

const filterClass = 'min-w-[140px] flex-1 sm:w-auto sm:flex-none'

/* ── component ──────────────────────────────────────────────────────── */

export function WineRoutesPage() {
  const {
    t,
    search,
    selectedDifficulty,
    selectedCountry,
    selectedRegion,
    currentPage,
    routes,
    isLoading,
    isError,
    error,
    retry,
    totalItems,
    totalPages,
    countryOptions,
    regionOptions,
    hasActiveFilters,
    clearFilters,
    handleSearchChange,
    handleDifficultyChange,
    handleCountryChange,
    handleRegionChange,
    goToPage,
  } = useWineRoutesViewModel()

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageBanner
        title={t('routes.title', 'Wine Routes')}
        icon={MapIcon}
        subtitle={t('routes.available', { count: totalItems })}
      >
        {/* Search bar */}
        <div className="relative mb-4">
          <Icon icon={Search} size="md" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="search"
            aria-label={t('routes.searchLabel')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('routes.searchPlaceholder')}
            className={fieldClassName({ tone: 'onDark', className: 'py-3 pl-12' })}
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          <Select
            aria-label={t('routes.duration.label', 'Duration')}
            tone="onDark"
            size="sm"
            containerClassName={filterClass}
            value={selectedDifficulty ?? ''}
            onChange={(e) => handleDifficultyChange(e.target.value)}
            options={[
              { value: '', label: t('routes.duration.label', 'Duration') },
              ...DIFFICULTY_OPTIONS.map((opt) => ({ value: opt.value, label: t(`routes.duration.${opt.value}`, opt.value) })),
            ]}
          />
          <Select
            aria-label={t('wines.country', 'Country')}
            tone="onDark"
            size="sm"
            containerClassName={filterClass}
            value={selectedCountry ?? ''}
            onChange={(e) => handleCountryChange(e.target.value)}
            options={[{ value: '', label: t('wines.country', 'Country') }, ...countryOptions]}
          />
          {selectedCountry && (
            <Select
              aria-label={t('wines.region', 'Region')}
              tone="onDark"
              size="sm"
              containerClassName={filterClass}
              value={selectedRegion ?? ''}
              onChange={(e) => handleRegionChange(e.target.value)}
              options={[{ value: '', label: t('wines.region', 'Region') }, ...regionOptions]}
            />
          )}
          {hasActiveFilters && (
            <Button variant="onDark" size="sm" onClick={clearFilters} leftIcon={<Icon icon={X} size="xs" />}>
              {t('routes.clearFilters')}
            </Button>
          )}
        </div>
      </PageBanner>

      {isError && <QueryErrorState error={error} onRetry={() => void retry()} />}
      {isLoading ? (
        <PageLoader compact />
      ) : isError && routes.length === 0 ? null : routes.length === 0 ? (
        <EmptyState
          illustration="route"
          title={
            hasActiveFilters
              ? t('common.noResults', 'No results found')
              : t('routes.noRoutes', 'No routes available')
          }
          description={
            hasActiveFilters
              ? t('routes.noRoutesSearch', 'Try a different search or remove filters')
              : t('routes.noRoutesDesc', 'No wine routes are available at this moment')
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                {t('routes.clearFilters')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {routes.map((route, idx) => (
            <WineRouteCard key={route.id} route={route} index={idx} />
          ))}
        </div>
      )}

      {!isLoading && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          summary={t('routes.available', { count: totalItems })}
          className="pb-8"
        />
      )}
    </div>
  )
}
