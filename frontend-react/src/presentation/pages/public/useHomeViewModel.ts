import { brandAssets } from '@components/brand/brandAssets'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@hooks/useAuth'
import { useReducedMotion } from '@hooks/useReducedMotion'

/** Which pictogram a home feature shows; the page maps it to an icon. */
export type HomeFeatureIcon = 'discover' | 'scan' | 'events' | 'routes'

export function useHomeViewModel() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const reducedMotion = useReducedMotion()
  const [heroRevealed, setHeroRevealed] = useState(false)
  const [sectionsRevealed, setSectionsRevealed] = useState(false)

  useEffect(() => {
    if (reducedMotion) return
    const frame = requestAnimationFrame(() => setHeroRevealed(true))
    const timer = setTimeout(() => setSectionsRevealed(true), 600)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [reducedMotion])

  // Reduced motion shows the final state from the first paint, with no staged reveal.
  const heroVisible = reducedMotion || heroRevealed
  const sectionsVisible = reducedMotion || sectionsRevealed

  const features = useMemo(
    () => [
      {
        icon: 'discover' as const,
        to: '/wines',
        title: t('home.featureDiscover'),
        description: t('home.featureDiscoverDesc'),
      },
      {
        icon: 'scan' as const,
        to: '/wines/scan',
        title: t('home.featureScan'),
        description: t('home.featureScanDesc'),
      },
      {
        icon: 'events' as const,
        to: '/events',
        title: t('nav.events'),
        description: t('home.featureEventsDesc'),
      },
      {
        icon: 'routes' as const,
        to: '/wine-routes',
        title: t('nav.routes'),
        description: t('home.featureRoutesDesc'),
      },
    ],
    [t],
  )

  const wineTypes = useMemo(
    () => [
      {
        type: t('wines.types.red'),
        icon: brandAssets.glasses.red,
        path: '/wines?type=red',
      },
      {
        type: t('wines.types.white'),
        icon: brandAssets.glasses.white,
        path: '/wines?type=white',
      },
      {
        type: t('wines.types.rose'),
        icon: brandAssets.glasses.rose,
        path: '/wines?type=rose',
      },
      {
        type: t('wines.types.sparkling'),
        icon: brandAssets.glasses.sparkling,
        path: '/wines?type=sparkling',
      },
    ],
    [t],
  )

  const popularGrapes = useMemo(
    () => [
      'Malbec',
      'Cabernet Sauvignon',
      'Merlot',
      'Pinot Noir',
      'Chardonnay',
      'Sauvignon Blanc',
      'Torrontés',
      'Syrah',
    ],
    [],
  )

  return {
    t,
    isAuthenticated,
    heroVisible,
    sectionsVisible,
    features,
    wineTypes,
    popularGrapes,
  }
}
