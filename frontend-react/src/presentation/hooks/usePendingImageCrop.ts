import { useCallback, useEffect, useRef, useState } from 'react'

/** A picked photo waiting to be framed, with a local URL for the preview. */
export interface PendingImageCrop {
  file: File
  url: string
}

/**
 * Holds the photo the user is framing before upload. Opening another photo,
 * closing, or unmounting frees the preview URL.
 */
export function usePendingImageCrop() {
  const [pending, setPending] = useState<PendingImageCrop | null>(null)
  const current = useRef<PendingImageCrop | null>(null)

  const replace = useCallback((next: PendingImageCrop | null) => {
    if (current.current) URL.revokeObjectURL(current.current.url)
    current.current = next
    setPending(next)
  }, [])

  useEffect(() => () => {
    if (current.current) URL.revokeObjectURL(current.current.url)
    current.current = null
  }, [])

  const open = useCallback((file: File) => replace({ file, url: URL.createObjectURL(file) }), [replace])
  const close = useCallback(() => replace(null), [replace])

  return { pending, open, close }
}
