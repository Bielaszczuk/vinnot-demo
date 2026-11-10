/**
 * ReviewForm - create/edit review form aligned with Vue component behavior
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { VintageSelect } from '@components/ui/VintageSelect'
import { PourRating } from '@components/ui/rating/PourRating'
import type { WineType } from '@domain/wine/wine.types'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Textarea } from '@components/ui/Textarea'

export interface ReviewFormData {
  rating: number
  title: string
  comment: string
  /** Tasted vintage, or `null` when the reviewer did not record one. */
  vintage: number | null
}

interface ReviewFormProps {
  wineId: string
  initialRating?: number
  initialTitle?: string
  initialComment?: string
  initialVintage?: number | null
  /** Catalog wine vintage, suggested first in the vintage picker. */
  catalogVintage?: number | null
  /** Draws the pour control with this wine's glass, wine and bottle. */
  wineType?: WineType | null
  isEditing?: boolean
  /** Reports whether the form differs from its initial values, so a dialog can protect the draft. */
  onDirtyChange?: (dirty: boolean) => void
  onSubmit: (data: ReviewFormData) => void | Promise<void>
  onCancel: () => void
}

export function ReviewForm({
  wineId,
  initialRating = 0,
  initialTitle = '',
  initialComment = '',
  initialVintage = null,
  catalogVintage = null,
  wineType,
  isEditing = false,
  onDirtyChange,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const { t } = useTranslation()
  const [rating, setRating] = useState(initialRating)
  const [title, setTitle] = useState(initialTitle)
  const [comment, setComment] = useState(initialComment)
  const [vintage, setVintage] = useState<number | null>(initialVintage)
  const [submitting, setSubmitting] = useState(false)
  const submissionInFlight = useRef(false)

  const isValid = rating > 0
  const dirty = rating !== initialRating || title !== initialTitle
    || comment !== initialComment || vintage !== initialVintage
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])

  const handleSubmit = async () => {
    if (!isValid || submissionInFlight.current) return
    submissionInFlight.current = true
    setSubmitting(true)
    try {
      await onSubmit({
        rating,
        title: title.trim(),
        comment: comment.trim(),
        vintage,
      })
    } finally {
      submissionInFlight.current = false
      setSubmitting(false)
    }
  }

  // keep prop parity with Vue component signature
  void wineId

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface-cream p-5 sm:p-6">
      <h3 className="font-semibold text-ink">
        {isEditing ? t('reviews.form.editTitle') : t('reviews.form.createTitle')}
      </h3>

      <p className="text-xs text-gray-500">{t('reviews.form.requiredNote')}</p>
      <div>
        <p className="mb-1 text-sm font-medium text-gray-700">{t('reviews.form.ratingLabel')}</p>
        <PourRating value={rating} onChange={setRating} disabled={submitting} label={t('reviews.form.ratingLabel')} wineType={wineType} size="lg" />
      </div>

      <VintageSelect
        value={vintage}
        onChange={setVintage}
        catalogVintage={catalogVintage}
        disabled={submitting}
      />

      <Input
        id="review-title"
        label={t('reviews.form.titleLabel')}
        type="text"
        maxLength={255}
        disabled={submitting}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t('reviews.form.titlePlaceholder')}
      />

      <Textarea
        id="review-comment"
        label={t('reviews.form.commentLabel')}
        rows={4}
        disabled={submitting}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={t('reviews.form.commentPlaceholder')}
        hint={t('reviews.form.characters', { count: comment.length })}
        className="resize-none"
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button
          disabled={!isValid}
          isLoading={submitting}
          onClick={() => {
            void handleSubmit()
          }}
        >
          {isEditing ? t('reviews.form.submitEdit') : t('reviews.form.submitCreate')}
        </Button>
      </div>
    </div>
  )
}
