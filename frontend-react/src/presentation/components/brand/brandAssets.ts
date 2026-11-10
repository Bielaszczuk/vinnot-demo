import sparklinglass from '@assets/glasses/sparklinglass.webp'
import roseglass from '@assets/glasses/roseglass.webp'
import whiteglass from '@assets/glasses/whiteglass.webp'
import redglass from '@assets/glasses/redglass.webp'
import homeHero from '@assets/home-hero.webp'

/** Shared native artwork; the web hero is compressed for first-load delivery. */
export const brandAssets = {
  mark: '/images/brand/mark.png',
  wordmark: '/images/brand/wordmark.png',
  hero: homeHero,
  glasses: {
    red: redglass,
    white: whiteglass,
    rose: roseglass,
    sparkling: sparklinglass,
  },
} as const
