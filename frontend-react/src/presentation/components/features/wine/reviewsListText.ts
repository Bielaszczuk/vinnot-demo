import type { TFunction } from 'i18next'

export type ReviewListText = {
  user: string
  yourReview: string
  edited: string
  edit: string
  delete: string
}

export function buildReviewListText(t: TFunction): ReviewListText {
  return {
    user: t('reviews.user'),
    yourReview: t('reviews.yourReview'),
    edited: t('reviews.edited'),
    edit: t('common.edit'),
    delete: t('common.delete'),
  }
}
