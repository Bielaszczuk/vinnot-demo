import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare } from 'lucide-react'
import type { CellarWine } from '@domain/cellar/cellar.types'
import { useCellarReviewPublication } from '@hooks/useCellarReviewPublication'
import { useDiscardGuard } from '@hooks/useDiscardGuard'
import { Modal } from '@components/ui/Modal'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { PageLoader } from '@components/ui/PageLoader'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { ReviewForm } from '@components/features/wine/ReviewForm'

export function CellarReviewModal({ entry, onClose }: { entry: CellarWine; onClose: () => void }) {
  const { t } = useTranslation()
  const { status, canPublish, busy, close, submit } = useCellarReviewPublication(entry, onClose)
  const [dirty, setDirty] = useState(false)
  const requestClose = useDiscardGuard({ dirty, busy, onClose: close })
  return (
    <Modal isOpen onClose={() => void requestClose()} closeOnBackdrop={false} title={t('cellar.publishReview')} size="lg">
      <p className="mb-4 font-medium text-gray-900">{entry.wine.name}</p>
      {(status.isFetching || status.isLoading) && !busy ? (
        <PageLoader compact />
      ) : status.isError ? (
        <QueryErrorState error={status.error} onRetry={() => void status.refetch()} />
      ) : status.data?.hasReview ? (
        <div className="space-y-4 rounded-2xl border border-wine-100 bg-wine-50 p-5">
          <h3 className="font-semibold text-gray-900">{t('cellar.reviewExistsTitle')}</h3>
          <p className="text-sm leading-relaxed text-gray-600">{t('cellar.reviewExistsDescription')}</p>
          <LinkButton to={`/wines/${entry.wine.id}?review=mine`} onClick={close}>
            {t('cellar.openWine')}
          </LinkButton>
        </div>
      ) : canPublish || busy ? (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-2xl border border-wine-100 bg-wine-50 p-4 text-wine-800">
            <Icon icon={MessageSquare} size="md" />
            <p className="text-sm leading-relaxed">{t('cellar.publishReviewDescription')}</p>
          </div>
          <ReviewForm wineId={entry.wine.id} initialRating={entry.rating ?? 0}
            initialComment={entry.notes ?? ''} initialVintage={entry.vintage ?? null}
            catalogVintage={entry.wine.vintage} wineType={entry.wine.type} onDirtyChange={setDirty} onSubmit={submit}
            onCancel={() => void requestClose()} />
        </div>
      ) : null}
    </Modal>
  )
}
