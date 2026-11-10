import type { TFunction } from 'i18next'
import { PenLine } from 'lucide-react'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import type { WineReview } from '@domain/wine/wine.types'
import { ReviewForm, type ReviewFormData } from './ReviewForm'

interface ReviewsComposerProps {
  t: TFunction
  wineId: string
  isAuthenticated: boolean
  /** Login link that returns to this wine afterwards. */
  loginPath: string
  hasUserReviewed: boolean
  showReviewForm: boolean
  editingReviewId: string | null
  editingReviewData: WineReview | null
  catalogVintage?: number | null
  onWriteReview: () => void
  onSubmit: (data: ReviewFormData) => void | Promise<void>
  onCancel: () => void
}

export function ReviewsComposer({
  t,
  wineId,
  isAuthenticated,
  loginPath,
  hasUserReviewed,
  showReviewForm,
  editingReviewId,
  editingReviewData,
  catalogVintage = null,
  onWriteReview,
  onSubmit,
  onCancel,
}: ReviewsComposerProps) {
  if (showReviewForm) {
    return (
      <ReviewForm
        key={editingReviewId ?? 'new'}
        wineId={wineId}
        isEditing={Boolean(editingReviewId)}
        initialRating={editingReviewData?.rating ?? 0}
        initialTitle={editingReviewData?.title ?? ''}
        initialComment={editingReviewData?.comment ?? ''}
        initialVintage={editingReviewData?.vintage ?? null}
        catalogVintage={catalogVintage}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-wine-100 bg-wine-50/60 px-4 py-3 text-sm text-gray-700">
        <LinkButton to={loginPath} variant="link" className="font-semibold">
          {t('reviews.loginToReview')}
        </LinkButton>
      </div>
    )
  }

  if (hasUserReviewed) return null

  return (
    <div>
      <Button className="w-full sm:w-auto" onClick={onWriteReview} leftIcon={<Icon icon={PenLine} />}>
        {t('reviews.writeReview')}
      </Button>
    </div>
  )
}
