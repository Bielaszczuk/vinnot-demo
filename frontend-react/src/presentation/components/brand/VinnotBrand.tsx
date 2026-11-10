import { brandAssets } from './brandAssets'

/** User-supplied vector artwork, rasterized once and tinted with the current theme. */
export function VinnotBrand({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const markHeight = compact ? 40 : 54
  const wordWidth = compact ? 90 : 126
  const mask = (source: string) => ({
    maskImage: `url("${source}")`,
    WebkitMaskImage: `url("${source}")`,
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
    backgroundColor: 'currentColor',
  })
  return <span role="img" aria-label="Vinnot" className={`inline-flex shrink-0 items-center gap-2 ${className}`}>
    <span aria-hidden="true" style={{ ...mask(brandAssets.mark), height: markHeight, width: markHeight * 338 / 431 }} />
    <span aria-hidden="true" style={{ ...mask(brandAssets.wordmark), width: wordWidth, height: wordWidth * 171 / 702 }} />
  </span>
}
