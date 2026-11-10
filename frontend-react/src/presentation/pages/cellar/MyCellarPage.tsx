/**
 * MyCellarPage — personal wine cellar page (protected, requires auth)
 *
 * Shows the user's cellar with:
 *   - The app's cellar cover: illustration, title, "Add wine" and the
 *     wines / average / regions figures with the type mix (no money total;
 *     the purchase price stays on each card)
 *   - Wine grid with CellarWineCards
 *   - Edit modal for rating/notes/price
 *   - Delete confirmation via useConfirm
 *   - Loading / error / empty states
 *
 * All data fetching goes through TanStack Query hooks → service → client.
 * No direct Axios calls. No server state in Zustand.
 */

import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CellarCover } from '@components/features/cellar/CellarCover'
import { CellarWineCard } from '@components/features/cellar/CellarWineCard'
import { CellarEditModal } from '@components/features/cellar/CellarEditModal'
import { CellarReviewModal } from '@components/features/cellar/CellarReviewModal'
import { Icon } from '@components/ui/Icon'
import { IllustratedState } from '@components/ui/IllustratedState'
import { LinkButton } from '@components/ui/LinkButton'
import { PageLoader } from '@components/ui/PageLoader'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { useMyCellarViewModel } from './useMyCellarViewModel'

/* ── component ──────────────────────────────────────────────────────── */

export function MyCellarPage() {
  const { t } = useTranslation()
  const {
    cellarWines,
    isLoading,
    isError,
    error,
    retry,
    editingEntry,
    publishingEntry,
    handlePublishReview,
    closeReviewModal,
    totalWines,
    averageRating,
    averageRatingLabel,
    regionCount,
    typeMix,
    handleEdit,
    closeEditModal,
    handleDelete,
  } = useMyCellarViewModel()

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 sm:space-y-8">
      <CellarCover
        wineCount={totalWines}
        averageRatingLabel={averageRatingLabel}
        hasAverage={averageRating > 0}
        regionCount={regionCount}
        typeMix={typeMix}
      />

      {/* ═══════════════════════════════════════════════
           LOADING
           ═══════════════════════════════════════════════ */}
      {isLoading && <PageLoader compact />}

      {/* ═══════════════════════════════════════════════
           ERROR STATE
           ═══════════════════════════════════════════════ */}
      {isError && !isLoading && (
        <QueryErrorState error={error} onRetry={() => void retry()} />
      )}
      {!isLoading && !isError && cellarWines.length === 0 && (
        <IllustratedState kind="emptyCellar" compact>
          <LinkButton to="/wines" leftIcon={<Icon icon={Plus} />}>{t('cellar.addWine')}</LinkButton>
        </IllustratedState>
      )}

      {/* ═══════════════════════════════════════════════
           WINE GRID
           ═══════════════════════════════════════════════ */}
      {!isLoading && cellarWines.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {cellarWines.map((entry) => (
            <CellarWineCard
              key={entry.id}
              entry={entry}
              onEdit={handleEdit}
              onPublishReview={handlePublishReview}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
           EDIT MODAL
           ═══════════════════════════════════════════════ */}
      {editingEntry && (
        <CellarEditModal
          entry={editingEntry}
          onClose={closeEditModal}
        />
      )}
      {publishingEntry && <CellarReviewModal key={publishingEntry.id} entry={publishingEntry} onClose={closeReviewModal} />}
    </div>
  )
}
