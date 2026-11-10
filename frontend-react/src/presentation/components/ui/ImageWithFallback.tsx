/**
 * ImageWithFallback — base UI component
 *
 * Displays an image with a fallback when loading fails.
 */

import { useState, type ImgHTMLAttributes } from 'react'

interface ImageWithFallbackProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string
  fallbackElement?: React.ReactNode
}

const defaultFallback =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNlNWU3ZWIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5Y2EzYWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj5ObyBpbWFnZTwvdGV4dD48L3N2Zz4='

export function ImageWithFallback({
  src,
  alt = '',
  fallbackSrc = defaultFallback,
  fallbackElement,
  className = '',
  onError,
  ...props
}: ImageWithFallbackProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const source = src?.trim()
  const hasError = !source || failedSrc === source
  const [failedFallback, setFailedFallback] = useState<string | null>(null)

  if (hasError && fallbackElement) {
    return <>{fallbackElement}</>
  }

  if (hasError && failedFallback === fallbackSrc) {
    return <span role={alt ? 'img' : undefined} aria-label={alt || undefined} className={`inline-block bg-wine-50 ${className}`} />
  }

  return (
    <img
      src={hasError ? fallbackSrc : source}
      alt={alt}
      className={className}
      onError={(event) => {
        if (hasError) setFailedFallback(fallbackSrc)
        else setFailedSrc(source ?? null)
        onError?.(event)
      }}
      {...props}
    />
  )
}
