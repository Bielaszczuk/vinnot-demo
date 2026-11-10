import { useId, type Dispatch, type SetStateAction } from 'react'
import type { TFunction } from 'i18next'
import type { Wine } from '@domain/wine/wine.types'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Modal } from '@components/ui/Modal'
import { PourRating } from '@components/ui/rating/PourRating'
import { Textarea } from '@components/ui/Textarea'
import { VintageSelect } from '@components/ui/VintageSelect'

type CellarFormState = {
  rating: number | null
  purchasePrice: number | null
  notes: string
  /** Tasted vintage; absent or `null` when none was chosen. */
  vintage?: number | null
}

interface WineCellarModalProps {
  t: TFunction
  wine: Wine
  cellarForm: CellarFormState
  setCellarForm: Dispatch<SetStateAction<CellarFormState>>
  addingToCellar: boolean
  onClose: () => void
  onConfirm: () => void
}

export function WineCellarModal({
  t,
  wine,
  cellarForm,
  setCellarForm,
  addingToCellar,
  onClose,
  onConfirm,
}: WineCellarModalProps) {
  const titleId = useId()
  return (
    <Modal
      isOpen
      onClose={onClose}
      labelledBy={titleId}
      closeOnBackdrop={false}
      containerClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      backdropClassName="absolute inset-0 bg-black/60 backdrop-blur-sm"
      panelClassName="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
    >
      <div className="bg-gradient-to-br from-gray-900 via-wine-950 to-wine-900 px-6 py-4">
        <h2 id={titleId} className="text-lg font-semibold text-white">{t('wineDetails.addToCellar')}</h2>
        <p className="mt-0.5 text-xs text-wine-200">{wine.name}</p>
      </div>

      <div className="space-y-4 p-6">
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">{t('cellar.rating')}</p>
          <div className="space-y-2">
            <PourRating
              value={cellarForm.rating ?? 0}
              label={t('cellar.rating')}
              wineType={wine.type}
              onChange={(rating) => setCellarForm((form) => ({ ...form, rating }))}
            />
            {cellarForm.rating != null && (
              <Button variant="link" onClick={() => setCellarForm((form) => ({ ...form, rating: null }))}>
                {t('wineDetails.clearRating')}
              </Button>
            )}
          </div>
        </div>
        <VintageSelect
          value={cellarForm.vintage ?? null}
          onChange={(vintage) => setCellarForm((form) => ({ ...form, vintage }))}
          catalogVintage={wine.vintage}
        />
        <Textarea
          label={t('cellar.notes')}
          value={cellarForm.notes}
          onChange={(event) => setCellarForm((form) => ({ ...form, notes: event.target.value }))}
          rows={3}
          placeholder={t('cellar.notesPlaceholder')}
        />
        <Input
          id="wine-cellar-purchase-price"
          label={t('cellar.purchasePrice')}
          type="number"
          step="0.01"
          value={cellarForm.purchasePrice ?? ''}
          onChange={(event) => setCellarForm((form) => ({ ...form, purchasePrice: event.target.value ? Number(event.target.value) : null }))}
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-border bg-surface-cream px-6 py-4">
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onConfirm} isLoading={addingToCellar}>
          {t('common.save')}
        </Button>
      </div>
    </Modal>
  )
}
