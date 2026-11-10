import { useState } from 'react'
import { brandAssets } from './brandAssets'

/** Reveal the decorative hero as a complete image, never as partial scanlines. */
export function BrandHeroImage({ className = '' }: { className?: string }) {
  const [loaded, setLoaded] = useState(false)

  return <img
    src={brandAssets.hero}
    alt=""
    width={1446}
    height={1087}
    loading="eager"
    decoding="async"
    fetchPriority="high"
    onLoad={() => setLoaded(true)}
    className={className}
    style={{ opacity: loaded ? 1 : 0 }}
  />
}
