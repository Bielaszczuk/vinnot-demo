import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { catalogImagesService } from '@application/services/catalogImages.service'
import { acceptsCatalogImage } from '@domain/media/catalogImages'
import { usePendingImageCrop } from './usePendingImageCrop'

/**
 * Upload-on-pick for catalog photos: the picked photo is framed first, then
 * uploaded; one upload at a time, busy state reported to the form, and a
 * pending upload cancelled when the picker unmounts.
 */
export function useCatalogImageUpload(onChange: (value: string | null) => void, onBusyChange: (busy: boolean) => void) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef<AbortController | null>(null)
  const crop = usePendingImageCrop()
  const callbacks = useRef({ onChange, onBusyChange })
  useEffect(() => { callbacks.current = { onChange, onBusyChange } }, [onChange, onBusyChange])
  useEffect(() => () => { pending.current?.abort(); callbacks.current.onBusyChange(false) }, [])

  async function upload(file?: File) {
    if (!file || pending.current) return
    const controller = new AbortController()
    pending.current = controller
    setBusy(true); callbacks.current.onBusyChange(true); setError(null)
    try {
      const imageUrl = await catalogImagesService.upload(file, controller.signal)
      if (!controller.signal.aborted) callbacks.current.onChange(imageUrl)
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(t(failure instanceof Error && failure.message === 'INVALID_CATALOG_IMAGE' ? 'media.catalog.invalid' : 'media.failed'))
      }
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setBusy(false); callbacks.current.onBusyChange(false) }
    }
  }

  function pick(file?: File) {
    if (!file || pending.current) return
    if (!acceptsCatalogImage(file.type, file.size)) { setError(t('media.catalog.invalid')); return }
    setError(null)
    crop.open(file)
  }

  function confirmCrop(file: File) {
    crop.close()
    void upload(file)
  }

  return { busy, error, upload, pick, cropping: crop.pending, confirmCrop, cancelCrop: crop.close }
}
