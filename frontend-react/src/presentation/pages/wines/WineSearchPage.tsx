/**
 * WineSearchPage — search, filter, and browse wines
 *
 * A PageBanner holds the search and the filter selects; the wine card grid
 * and the pagination follow.
 */
import { Search, X } from 'lucide-react'
import { WineResultsGrid } from '@components/features/wine/WineResultsGrid'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { PageBanner } from '@components/ui/PageBanner'
import { Pagination } from '@components/ui/Pagination'
import { Select } from '@components/ui/Select'
import { fieldClassName } from '@components/ui/fieldStyles'
import { formatNumber } from '@utils/format'
import { useWineSearchViewModel } from './useWineSearchViewModel'

export function WineSearchPage() {
  const {
    t,
    locationStatus,
    search,
    selectedType,
    selectedGrape,
    selectedCountry,
    selectedRegion,
    page,
    wines,
    isLoading,
    isError,
    retry,
    error,
    totalWines,
    totalPages,
    hasActiveFilters,
    grapeTypes,
    countryOptions,
    regionOptions,
    typeOptions,
    handleSearchChange,
    handleTypeChange,
    handleGrapeChange,
    handleCountryChange,
    handleRegionChange,
    handlePageChange,
    clearFilters,
  } = useWineSearchViewModel()

  const winesLabel = `${formatNumber(totalWines)} ${t('wines.title').toLowerCase()}`
  const filterSelect = { tone: 'onDark' as const, size: 'sm' as const, containerClassName: 'min-w-[140px] flex-1 sm:flex-none' }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageBanner
        title={t('compare.browseWines')}
        subtitle={
          <>
            <p>{winesLabel} {t('common.available', 'disponibles')}</p>
            <p className="mt-1" role="status">
              {t(`discovery.${locationStatus}`, { country: selectedCountry })}
            </p>
          </>
        }
      >
        <div className="relative mb-4">
          <Icon icon={Search} size="md" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="search"
            aria-label={t('common.search')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('wines.searchPlaceholder')}
            className={fieldClassName({ tone: 'onDark', className: 'py-3 pl-12 pr-4' })}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            {...filterSelect}
            aria-label={t('wines.type')}
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value)}
            options={[{ value: '', label: t('wines.type') }, ...typeOptions]}
          />
          <Select
            {...filterSelect}
            aria-label={t('wines.grapeVariety')}
            value={selectedGrape}
            onChange={(e) => handleGrapeChange(e.target.value)}
            options={[{ value: '', label: t('wines.grapeVariety') }, ...grapeTypes.map((g) => ({ value: g.name, label: g.name }))]}
          />
          <Select
            {...filterSelect}
            aria-label={t('wines.country')}
            value={selectedCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
            options={[{ value: '', label: t('wines.country', 'País') }, ...countryOptions.map((c) => ({ value: c, label: c }))]}
          />
          {selectedCountry && regionOptions.length > 0 && (
            <Select
              {...filterSelect}
              aria-label={t('wines.region')}
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
              options={[{ value: '', label: t('wines.region', 'Región') }, ...regionOptions.map((r) => ({ value: r, label: r }))]}
            />
          )}
          {hasActiveFilters && (
            <Button variant="onDark" size="sm" onClick={clearFilters} leftIcon={<Icon icon={X} />}>
              {t('common.clear')}
            </Button>
          )}
        </div>
      </PageBanner>

      <WineResultsGrid
        wines={wines}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => void retry()}
        onClearFilters={hasActiveFilters ? clearFilters : undefined}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} summary={winesLabel} disabled={isLoading} className="pb-8" />
    </div>
  )
}
