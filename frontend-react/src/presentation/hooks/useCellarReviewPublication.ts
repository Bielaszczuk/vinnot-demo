import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CellarWine } from '@domain/cellar/cellar.types'
import { useMyReviewStatus } from '@hooks/queries/wine/useMyReviewStatus'
import { useCreateReview } from '@hooks/queries/wine/useCreateReview'
import { useToast } from '@hooks/useToast'

/** Explicit publication uses the review use case, never the private cellar endpoint. */
export function useCellarReviewPublication(entry: CellarWine, onClose: () => void) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const status = useMyReviewStatus(entry.wine.id, true, true)
  const create = useCreateReview()
  const submitting = useRef(false)
  const [busy, setBusy] = useState(false)
  const canPublish = status.data?.hasReview === false && !status.isFetching && !status.isError
  const close = () => { if (!submitting.current) onClose() }

  const submit = async (draft: { rating: number; title: string; comment: string; vintage: number | null }): Promise<void> => {
    if (!canPublish || submitting.current || draft.rating <= 0) return
    submitting.current = true
    setBusy(true)
    try {
      await create.mutateAsync({ wineId: entry.wine.id, rating: draft.rating,
        title: draft.title || undefined, comment: draft.comment || undefined, vintage: draft.vintage })
      addToast({ type: 'success', message: t('community.reviewPublished') })
      onClose()
    } catch {
      addToast({ type: 'error', message: t('reviews.errorSave') })
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  return { status, canPublish, busy, close, submit }
}
