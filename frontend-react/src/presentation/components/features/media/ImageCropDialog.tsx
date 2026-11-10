/**
 * ImageCropDialog — the framing step between picking a photo and uploading it.
 *
 * Shows the photo inside the frame where it will be displayed (round for
 * avatars, with the always-visible strip for covers), lets the user move and
 * zoom it, and hands back the framed JPEG. Cancel uploads nothing.
 */

import { ZoomIn, ZoomOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MAX_CROP_ZOOM, MIN_CROP_ZOOM, guideBandInset } from '@domain/media/imageCrop'
import { useImageCropEditor } from '@hooks/useImageCropEditor'
import type { PendingImageCrop } from '@hooks/usePendingImageCrop'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { Modal } from '@components/ui/Modal'

export type ImageCropShape = 'rect' | 'round'

export interface ImageCropDialogProps {
  image: PendingImageCrop
  /** Frame width / height, the same as where the photo is shown. */
  aspect: number
  shape?: ImageCropShape
  /** Aspect of a wider display of the same photo; its strip is marked in the frame. */
  guideBandAspect?: number
  onConfirm: (file: File) => void
  onCancel: () => void
}

/** Keeps tall and square frames a comfortable size on wide screens. */
function frameWidthClass(aspect: number): string {
  if (aspect > 1) return 'max-w-full'
  return aspect === 1 ? 'max-w-xs' : 'max-w-[15rem]'
}

export function ImageCropDialog(props: ImageCropDialogProps) {
  // A new photo starts a new framing.
  return <ImageCropEditor key={props.image.url} {...props} />
}

function ImageCropEditor({ image, aspect, shape = 'rect', guideBandAspect, onConfirm, onCancel }: ImageCropDialogProps) {
  const { t } = useTranslation()
  const {
    frameRef, ready, zoom, placement, busy, error,
    onImageLoad, onImageError, onPointerDown, onPointerMove, onPointerEnd, onKeyDown, zoomTo, confirm,
  } = useImageCropEditor({ file: image.file, aspect, onConfirm })
  const band = guideBandAspect ? guideBandInset(aspect, guideBandAspect) * 100 : 0

  return (
    <Modal
      isOpen
      onClose={busy ? () => undefined : onCancel}
      title={t('media.crop.title')}
      size="lg"
      closeOnBackdrop={false}
    >
      <p className="text-sm text-gray-600">{t('media.crop.hint')}</p>
      <div
        ref={frameRef}
        role="group"
        tabIndex={0}
        aria-label={t('media.crop.frameLabel')}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{ aspectRatio: String(aspect) }}
        className={`relative mx-auto mt-4 w-full ${frameWidthClass(aspect)} cursor-grab touch-none select-none overflow-hidden rounded-xl bg-gray-900 outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-wine-500 focus-visible:ring-offset-2`}
      >
        <img
          src={image.url}
          alt=""
          draggable={false}
          onLoad={onImageLoad}
          onError={onImageError}
          className={`pointer-events-none absolute max-w-none ${placement ? '' : 'invisible'}`}
          style={placement ? {
            left: `${placement.left}%`,
            top: `${placement.top}%`,
            width: `${placement.width}%`,
            height: `${placement.height}%`,
          } : undefined}
        />
        {shape === 'round' && (
          <div aria-hidden="true" data-testid="image-crop-round-mask" className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_100vmax_rgba(17,24,39,0.6)]" />
        )}
        {band > 0 && (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 bg-black/35" style={{ height: `${band}%` }} />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/35" style={{ height: `${band}%` }} />
            <div className="pointer-events-none absolute inset-x-0 border-y-2 border-dashed border-white/90" style={{ top: `${band}%`, bottom: `${band}%` }}>
              <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">{t('media.crop.guideBand')}</span>
            </div>
          </>
        )}
      </div>
      <div className="mx-auto mt-4 flex max-w-md items-center gap-3">
        <Icon icon={ZoomOut} className="text-gray-500" />
        <input
          type="range"
          min={MIN_CROP_ZOOM}
          max={MAX_CROP_ZOOM}
          step={0.01}
          value={zoom}
          aria-label={t('media.crop.zoom')}
          disabled={!ready || busy}
          onChange={(event) => zoomTo(Number(event.target.value))}
          className="h-2 w-full cursor-pointer accent-wine-700 disabled:cursor-not-allowed"
        />
        <Icon icon={ZoomIn} className="text-gray-500" />
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {t(error === 'load' ? 'media.crop.loadFailed' : 'media.crop.failed')}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>{t('media.crop.cancel')}</Button>
        <Button type="button" onClick={() => void confirm()} isLoading={busy} disabled={!ready}>
          {t(busy ? 'media.crop.applying' : 'media.crop.confirm')}
        </Button>
      </div>
    </Modal>
  )
}
