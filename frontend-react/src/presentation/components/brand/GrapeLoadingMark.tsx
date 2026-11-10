import { brandAssets } from './brandAssets'

/** Decorative loading cycle, never a percentage of request completion. */
export function GrapeLoadingMark({ size = 48 }: { size?: number }) {
  const mask = { maskImage: `url("${brandAssets.mark}")`, WebkitMaskImage: `url("${brandAssets.mark}")` }
  return <span aria-hidden="true" className="vinnot-grape-mark" style={{ width: size * 338 / 431, height: size }}>
    <span className="vinnot-grape-base" style={mask} />
    <span className="vinnot-grape-fill" style={mask} />
  </span>
}
