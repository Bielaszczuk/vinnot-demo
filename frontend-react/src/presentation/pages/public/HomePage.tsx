import { BrandHeroImage } from '@components/brand/BrandHeroImage'
import { CalendarDays, Camera, Route, ScanLine, Warehouse, Wine, type LucideIcon } from 'lucide-react'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
/**
 * HomePage — public landing page
 *
 * Uses the same illustrated hero and wine-glass artwork as native:
 * explore by type section, popular grapes pills, features grid,
 * gradient CTA section with decorative circles.
 */

import { Link } from 'react-router-dom'
import { useHomeViewModel, type HomeFeatureIcon } from './useHomeViewModel'

const featureIcons: Record<HomeFeatureIcon, LucideIcon> = {
  discover: Wine,
  scan: ScanLine,
  events: CalendarDays,
  routes: Route,
}

const heroCta = 'w-full sm:w-auto transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0'

export function HomePage() {
  const {
    t,
    isAuthenticated,
    heroVisible,
    sectionsVisible,
    features,
    wineTypes,
    popularGrapes,
  } = useHomeViewModel()

  return (
    <div className="space-y-12 sm:space-y-20">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden -mt-6 bg-wine-950">
        {/* Background image */}
        <div className="absolute inset-0">
          <BrandHeroImage className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-wine-950/30 via-wine-950/55 to-wine-950/90" />
        </div>

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-20 sm:py-28 md:py-36 lg:py-44">
          <div className="max-w-4xl mx-auto text-center">
            {/* Title */}
            <h1
              className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-4 sm:mb-6 leading-tight tracking-tight transition-all duration-1000 motion-reduce:transition-none ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              {t('home.heroTitle')}{' '}
              <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-wine-200 to-wine-300 bg-clip-text text-transparent">
                {t('home.heroSubtitle')}
              </span>
            </h1>

            {/* Description */}
            <p
              className={`text-sm sm:text-base md:text-lg text-gray-300 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-1000 delay-200 motion-reduce:transition-none ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              {t('home.heroDescription')}
            </p>

            {/* CTA buttons */}
            <div
              className={`flex flex-col sm:flex-row flex-wrap justify-center gap-2.5 sm:gap-3 transition-all duration-1000 delay-500 motion-reduce:transition-none ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <LinkButton to="/wines" variant="secondary" size="lg" className={`${heroCta} border-white shadow-lg shadow-black/20`} leftIcon={<Icon icon={Wine} size="md" />}>
                {t('home.exploreWines')}
              </LinkButton>

              <LinkButton to="/wines/scan" variant="onDark" size="lg" className={heroCta} leftIcon={<Icon icon={Camera} size="md" />}>
                {t('home.scanWine')}
              </LinkButton>

              {!isAuthenticated ? (
                <LinkButton to="/register" variant="onDark" size="lg" className={heroCta}>
                  {t('home.getStartedFree')}
                </LinkButton>
              ) : (
                <LinkButton to="/cellar" variant="onDark" size="lg" className={heroCta} leftIcon={<Icon icon={Warehouse} size="md" />}>
                  {t('nav.cellar')}
                </LinkButton>
              )}
            </div>
          </div>
        </div>

        {/* Subtle bottom fade into page bg */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-canvas to-transparent" />
      </section>

      {/* ═══ EXPLORE BY TYPE ═══ */}
      <section
        className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 motion-reduce:transition-none ${
          sectionsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-ink">
            {t('home.exploreByType')}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
          {wineTypes.map((wine, idx) => (
            <Link
              key={wine.type}
              to={wine.path}
              className="group flex flex-col items-center p-4 sm:p-6 bg-white rounded-2xl border border-border shadow-sm hover:shadow-xl hover:border-wine-200 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              style={{ transitionDelay: sectionsVisible ? `${idx * 80}ms` : '0ms' }}
            >
              <div className="w-24 h-24 sm:w-32 sm:h-32 mb-3 sm:mb-4 bg-gray-50 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:bg-wine-50 group-hover:scale-110 transition-all duration-300 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                <img src={wine.icon} alt="" loading="lazy" width={96} height={120} className="h-20 w-16 object-contain sm:h-28 sm:w-24" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-wine-700 transition-colors">
                {wine.type}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ POPULAR GRAPES ═══ */}
      <section
        className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 delay-100 motion-reduce:transition-none ${
          sectionsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-ink">
            {t('home.popularGrapes')}
          </h2>
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
          {popularGrapes.map((grape) => (
            <Link
              key={grape}
              to={`/wines?grape=${grape.toLowerCase()}`}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white border border-border rounded-full text-xs sm:text-sm font-medium text-gray-600 hover:border-wine-300 hover:text-wine-700 hover:bg-wine-50 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {grape}
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section
        className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 delay-200 motion-reduce:transition-none ${
          sectionsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-ink mb-2 sm:mb-3">
            {t('home.featuresTitle')}
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            {t('home.featuresSubtitle')}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {features.map((feature, idx) => (
            <div
              key={feature.title}
              className="group p-4 sm:p-6 bg-white rounded-2xl border border-border shadow-sm hover:shadow-xl hover:border-wine-100 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              style={{ transitionDelay: sectionsVisible ? `${200 + idx * 80}ms` : '0ms' }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 bg-wine-50 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-wine-100 group-hover:scale-110 transition-all duration-300 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                <Icon icon={featureIcons[feature.icon]} size="lg" className="text-wine-700" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-1.5">
                {feature.title}
              </h3>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section
        className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 delay-300 motion-reduce:transition-none ${
          sectionsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="relative isolate overflow-hidden bg-gradient-to-br from-gray-900 via-wine-950 to-wine-900 rounded-2xl sm:rounded-3xl p-8 sm:p-10 md:p-14 shadow-2xl shadow-wine-950/20 ring-1 ring-white/5">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-wine-500/20 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-rating/15 blur-3xl" />
          </div>

          <div className="relative text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white mb-2 sm:mb-3">
              {t('home.ctaTitle')}
            </h2>
            <p className="text-wine-200 text-xs sm:text-sm md:text-base mb-6 sm:mb-8 max-w-lg mx-auto leading-relaxed">
              {t('home.ctaDescription')}
            </p>
            {!isAuthenticated ? (
              <LinkButton to="/register" variant="secondary" size="lg" className="border-white shadow-lg shadow-wine-950/30">
                {t('home.createFreeAccount')}
              </LinkButton>
            ) : (
              <LinkButton to="/wines" variant="secondary" size="lg" className="border-white shadow-lg shadow-wine-950/30">
                {t('home.startExploring')}
              </LinkButton>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
