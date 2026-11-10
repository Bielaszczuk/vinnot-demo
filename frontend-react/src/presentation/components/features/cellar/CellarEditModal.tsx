/**
 * CellarEditModal — modal for editing a cellar entry's rating, tasted vintage, notes, and purchase price
 *
 * Uses the useUpdateCellarEntry mutation hook.
 */

import { useState, useCallback, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useUpdateCellarEntry } from '@hooks/queries/cellar/useUpdateCellarEntry'
import { useToast } from '@hooks/useToast'
import { useDiscardGuard } from '@hooks/useDiscardGuard'
import { formatWineDisplayName } from '@utils/wine'
import { Button } from '@components/ui/Button'
import { Modal } from '@components/ui/Modal'
import { PourRating } from '@components/ui/rating/PourRating'
import { Textarea } from '@components/ui/Textarea'
import { fieldClassName, fieldLabelClassName } from '@components/ui/fieldStyles'
import { VintageSelect } from '@components/ui/VintageSelect'
import { resolveVintageUpdate } from '@domain/wine/wine.vintage'
import type { CellarWine } from '@domain/cellar/cellar.types'

/* ── props ──────────────────────────────────────────────────────────── */

interface CellarEditModalProps {
  entry: CellarWine | null
  onClose: () => void
}

/* ── component ──────────────────────────────────────────────────────── */

export function CellarEditModal({ entry, onClose }: CellarEditModalProps) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const updateMutation = useUpdateCellarEntry()

  const [rating, setRating] = useState<number | null>(entry?.rating ?? null)
  const [purchasePrice, setPurchasePrice] = useState<string>(
    entry?.purchasePrice != null ? String(entry.purchasePrice) : '',
  )
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [vintage, setVintage] = useState<number | null>(entry?.vintage ?? null)
  const titleId = useId()
  const priceId = useId()
  const initialPrice = entry?.purchasePrice != null ? String(entry.purchasePrice) : ''
  const dirty = rating !== (entry?.rating ?? null)
    || purchasePrice !== initialPrice
    || notes !== (entry?.notes ?? '')
    || vintage !== (entry?.vintage ?? null)
  const requestClose = useDiscardGuard({ dirty, busy: updateMutation.isPending, onClose })

  const handleSave = useCallback(() => {
    if (!entry) return

    updateMutation.mutate(
      {
        cellarWineId: entry.id,
        updates: {
          rating,
          purchasePrice: purchasePrice ? Number(purchasePrice) : null,
          notes: notes || null,
          vintage: resolveVintageUpdate(vintage, entry.vintage ?? null),
        },
      },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: t('cellar.updateSuccess') })
          onClose()
        },
        onError: () => {
          addToast({ type: 'error', message: t('errors.generic', 'Error') })
        },
      },
    )
  }, [entry, rating, purchasePrice, notes, vintage, updateMutation, addToast, t, onClose])

  if (!entry) return null

  return (
    <Modal
      isOpen
      onClose={() => void requestClose()}
      closeOnBackdrop={false}
      labelledBy={titleId}
      containerClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      backdropClassName="absolute inset-0 bg-black/60 backdrop-blur-sm"
      panelClassName="relative flex max-h-[90vh] w-full max-w-md transform flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300"
    >
      {/* Modal header */}
      <div className="shrink-0 bg-gradient-to-r from-gray-900 to-wine-900 px-6 py-4">
        <h2 id={titleId} className="truncate text-lg font-semibold text-white">
          {formatWineDisplayName(entry.wine.name, entry.wine.grapeVarieties)}
        </h2>
        <p className="mt-0.5 text-xs text-gray-300">{entry.wine.winery}</p>
      </div>

      {/* Inner scroll keeps Save reachable on short screens. */}
      <div className="min-h-0 space-y-5 overflow-y-auto p-6" data-testid="cellar-edit-body">
        <p className="text-sm leading-relaxed text-gray-500">{t('cellar.privateNotesDescription')}</p>
        {/* Glass rating */}
        <div>
          <p aria-hidden="true" className={`mb-1 ${fieldLabelClassName}`}>
            {t('cellar.rating')}
          </p>
          <div className="space-y-2">
            <PourRating
              value={rating ?? 0}
              onChange={setRating}
              label={t('cellar.rating')}
              wineType={entry.wine.type}
              disabled={updateMutation.isPending}
            />
            {rating != null && (
              <Button variant="link" onClick={() => setRating(null)} disabled={updateMutation.isPending}>
                {t('cellar.clearRating')}
              </Button>
            )}
          </div>
        </div>

        {/* Tasted vintage */}
        <VintageSelect value={vintage} onChange={setVintage} catalogVintage={entry.wine.vintage} />

        {/* Notes */}
        <Textarea
          label={t('cellar.notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t('cellar.notesPlaceholder')}
          className="resize-none"
        />

        {/* Purchase Price */}
        <div className="flex flex-col gap-1">
          <label htmlFor={priceId} className={fieldLabelClassName}>
            {t('cellar.purchasePrice')}
          </label>
          <div className="relative">
            <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
            <input
              id={priceId}
              type="number"
              step="0.01"
              inputMode="decimal"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className={fieldClassName({ className: 'pl-8' })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => void requestClose()} disabled={updateMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} isLoading={updateMutation.isPending}>
            {updateMutation.isPending ? t('common.saving', 'Guardando...') : t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
