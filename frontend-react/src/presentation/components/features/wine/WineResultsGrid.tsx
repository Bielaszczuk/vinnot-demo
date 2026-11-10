/**
 * WineResultsGrid — grid of wine cards with loading, empty and error states
 */
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import { EmptyState } from '@components/ui/EmptyState'
import { PageLoader } from '@components/ui/PageLoader'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { WineCard } from './WineCard'
import type { WineSummary } from '@domain/wine/wine.types'

interface WineResultsGridProps {
  wines: WineSummary[]
  isLoading: boolean
  isError: boolean
  error?: Error | null
  onRetry: () => void
  /** Given only while filters are active: the empty state offers to clear them. */
  onClearFilters?: () => void
}

export function WineResultsGrid({ wines, isLoading, isError, error, onRetry, onClearFilters }: WineResultsGridProps) {
  const { t } = useTranslation()

  if (isLoading) return <PageLoader compact />

  if (isError && wines.length === 0) return <QueryErrorState error={error} onRetry={onRetry} />

  if (wines.length === 0) {
    return (
      <EmptyState
        illustration="noWines"
        title={t('wines.noWines')}
        description={t(onClearFilters ? 'wines.noWinesHint' : 'wines.noWinesCatalog')}
        action={onClearFilters && (
          <Button variant="secondary" onClick={onClearFilters}>
            {t('wines.clearFilters')}
          </Button>
        )}
      />
    )
  }

  return (
    <>
      {isError && <QueryErrorState error={error} onRetry={onRetry} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
        {wines.map((wine) => (
          <WineCard key={wine.id} wine={wine} />
        ))}
      </div>
    </>
  )
}
