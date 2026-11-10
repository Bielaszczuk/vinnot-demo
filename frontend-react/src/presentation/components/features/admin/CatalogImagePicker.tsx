/**
 * CatalogImagePicker — catalog photo picker: the chosen file is framed in the
 * crop dialog, then uploaded at once (through the admin catalog-image
 * service), with preview, busy state and remove. Same look as the event and
 * route cover picker.
 */

import { ImageIcon, ImagePlus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CATALOG_IMAGE_ACCEPT } from '@domain/media/catalogImages'
import { IMAGE_ASPECT } from '@domain/media/imageAspect'
import { useCatalogImageUpload } from '@hooks/useCatalogImageUpload'
import { Button } from '@components/ui/Button'
import { buttonClassName } from '@components/ui/buttonStyles'
import { Icon } from '@components/ui/Icon'
import { ImageCropDialog } from '@components/features/media/ImageCropDialog'

export interface CatalogImagePickerProps {
  value?: string | null
  onChange: (value: string | null) => void
  onBusyChange: (busy: boolean) => void
  label?: string
  disabled?: boolean
  /** Frame of the photo (width / height); wine photos by default. */
  aspect?: number
}

export function CatalogImagePicker({ value, onChange, onBusyChange, label, disabled = false, aspect = IMAGE_ASPECT.WINE }: CatalogImagePickerProps) {
  const { t } = useTranslation()
  const upload = useCatalogImageUpload(onChange, onBusyChange)
  const locked = disabled || upload.busy
  return (
    <>
      <section
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); if (!locked) upload.pick(event.dataTransfer.files[0]) }}
        className="space-y-3 rounded-2xl border border-wine-700/15 bg-wine-700/5 p-4"
        aria-busy={upload.busy}
      >
        <p className="text-sm font-semibold">{label ?? t('media.catalog.label')}</p>
        <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl bg-white">
          {value
            ? <img src={value} alt="" className="h-full w-full object-contain" />
            : <span className="flex flex-col items-center gap-1 text-xs text-gray-400"><Icon icon={ImageIcon} size="md" />{t('media.catalog.empty')}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className={buttonClassName({ variant: 'secondary', className: `focus-within:ring-2 focus-within:ring-wine-500 focus-within:ring-offset-2 ${locked ? 'opacity-50' : 'cursor-pointer'}` })}>
            <Icon icon={ImagePlus} size="md" />{t(value ? 'media.replace' : 'media.choose')}
            <input
              type="file"
              className="sr-only"
              accept={CATALOG_IMAGE_ACCEPT}
              disabled={locked}
              onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; upload.pick(file) }}
            />
          </label>
          {value && <Button type="button" variant="ghost" disabled={locked} onClick={() => onChange(null)} leftIcon={<Icon icon={Trash2} />}>{t('media.remove')}</Button>}
        </div>
        <p className="text-xs text-gray-500">{t('media.dropHint')}</p>
        <p className="text-xs text-gray-500" role="status">{t(upload.busy ? 'media.catalog.uploading' : 'media.catalog.hint')}</p>
        {upload.error && <p role="alert" className="text-sm text-danger">{upload.error}</p>}
      </section>
      {upload.cropping && (
        <ImageCropDialog image={upload.cropping} aspect={aspect} onConfirm={upload.confirmCrop} onCancel={upload.cancelCrop} />
      )}
    </>
  )
}
