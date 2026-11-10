import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { VinnotBrand } from '@components/brand/VinnotBrand'
import { BrandHeroImage } from '@components/brand/BrandHeroImage'

export function AuthEditorialPanel({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  return <aside className={`relative hidden min-h-[640px] flex-col justify-between overflow-hidden bg-wine-950 p-10 text-white lg:flex ${className}`}>
    <BrandHeroImage className="absolute inset-0 h-full w-full object-cover object-[42%_center]" />
    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-wine-950/35 via-wine-950/55 to-wine-950/95" />
    <Link to="/" aria-label="Vinnot" className="relative self-start"><VinnotBrand /></Link>
    <div className="relative mt-40 space-y-6">
      <div aria-hidden="true" className="h-px w-16 bg-white/60" />
      <h2 className="text-3xl font-semibold leading-snug">{t('home.heroTitle')}<br /><span className="text-wine-200">{t('home.heroSubtitle')}</span></h2>
      <p className="max-w-sm text-sm leading-7 text-white/85">{t('home.heroDescription')}</p>
      <p className="border-t border-white/20 pt-5 text-2xs uppercase tracking-[.22em] text-white/70">Vinnot · Digital Sommelier</p>
    </div>
  </aside>
}
