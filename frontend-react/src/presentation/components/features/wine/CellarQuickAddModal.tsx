/**
 * CellarQuickAddModal — minimal modal to add wine to cellar from detail page
 * Only the minimum needed for WineDetailsPage. Full cellar module not migrated.
 *
 * Follows architecture: component → hook → service → client (no direct client access).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCellarQuickAdd } from '@hooks/queries/wine/useCellarQuickAdd'
import { useToast } from '@hooks/useToast'
import { Modal } from '@components/ui/Modal'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { VintageSelect } from '@components/ui/VintageSelect'
import { PourRating } from '@components/ui/rating/PourRating'
import type { WineType } from '@domain/wine/wine.types'
import { Textarea } from '@components/ui/Textarea'

interface CellarQuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  wineId: string
  wineName: string
  /** Catalog wine vintage, suggested first in the vintage picker. */
  catalogVintage?: number | null
  /** Draws the pour control with this wine's glass, wine and bottle. */
  wineType?: WineType | null
}

export function CellarQuickAddModal({ isOpen, onClose, wineId, wineName, catalogVintage = null, wineType = null }: CellarQuickAddModalProps) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [rating, setRating] = useState(0)
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [vintage, setVintage] = useState<number | null>(null)

  const addMutation = useCellarQuickAdd()

  const handleSubmit = () => {
    addMutation.mutate(
      {
        wineId,
        rating: rating || null,
        purchasePrice: price ? Number(price) : null,
        notes: notes || null,
        vintage,
      },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: t('cellar.addWine') })
          onClose()
        },
        onError: () => {
          addToast({ type: 'error', message: t('errors.generic') })
        },
      },
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('wineDetails.addToCellar')} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{wineName}</p>

        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">{t('cellar.rating')}</p>
          <PourRating value={rating} onChange={setRating} label={t('cellar.rating')} wineType={wineType} />
        </div>

        <VintageSelect value={vintage} onChange={setVintage} catalogVintage={catalogVintage} />

        <Input
          label={t('cellar.purchasePrice')}
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
        />

        <Textarea
          label={t('cellar.notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('cellar.notesPlaceholder')}
          rows={2}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" isLoading={addMutation.isPending} onClick={handleSubmit}>
            {t('cellar.addWine')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

